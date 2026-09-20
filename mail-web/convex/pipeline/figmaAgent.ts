import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import { Agent, createTool } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { Doc, Id } from "../_generated/dataModel";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Helper: Resolve active Figma access token for a given inboxId or from global environment
 */
async function resolveFigmaToken(
  ctx: any,
  inboxId: string
): Promise<string | null> {
  // 1. Check user connection in database
  const connection = await ctx.runQuery(internal.figma.getFigmaAccessToken, {
    inboxId,
  });
  if (connection?.accessToken) {
    return connection.accessToken;
  }

  // 2. Check global fallback env var
  if (process.env.FIGMA_ACCESS_TOKEN) {
    return process.env.FIGMA_ACCESS_TOKEN;
  }

  return null;
}

/**
 * Helper: Turn a failed Figma API response into a tool result. On a 429 the failure is
 * recorded in the draft session (log + context notice) so the user is told and the
 * drafter never claims a PDF is attached, and the agent is told to stop calling Figma.
 */
async function figmaApiFailure(
  ctx: any,
  sessionId: string | undefined,
  res: Response,
  action: string
): Promise<{ success: false; error: string; rateLimited?: boolean; retryAfterSeconds?: number }> {
  if (res.status === 429) {
    const retryAfterSeconds = Number(res.headers.get("retry-after")) || undefined;
    const plan = res.headers.get("x-figma-plan-tier");
    const wait = retryAfterSeconds
      ? retryAfterSeconds >= 86400
        ? `~${Math.ceil(retryAfterSeconds / 86400)} day(s)`
        : `~${Math.ceil(retryAfterSeconds / 60)} min`
      : "later";
    const message = `Figma API rate limit reached${plan ? ` (${plan} plan)` : ""} while trying to ${action}. Try again in ${wait}.`;
    if (sessionId) {
      await ctx.runMutation(internal.pipeline.figmaAgent.appendSessionLog, {
        sessionId: sessionId as Id<"draftSessions">,
        logLine: `[Figma Warning] ${message}`,
      });
      await ctx.runMutation(internal.pipeline.figmaAgent.addFilesToDraftSession, {
        sessionId: sessionId as Id<"draftSessions">,
        newFiles: [],
        additionalScreenContext: `[Figma Notice] ${message} No PDF could be exported, so nothing from Figma is attached.`,
      });
    }
    return {
      success: false,
      rateLimited: true,
      retryAfterSeconds,
      error: `${message} STOP: do not call any other Figma API tool; go straight to stage_figma_assets_for_draft with isPdfAttached=false.`,
    };
  }
  const errText = await res.text();
  return { success: false, error: `Figma API error (${res.status}) while trying to ${action}: ${errText}` };
}

/** Figma URLs write node ids as "12-34"; the REST API expects "12:34". */
function normalizeNodeId(id: string): string {
  return /^\d+-\d+$/.test(id) ? id.replace("-", ":") : id;
}

/**
 * Mutation: Append log to draftSession
 */
export const appendSessionLog = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    logLine: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    const logs = session.executionLog || [];
    logs.push(`[${new Date().toISOString()}] ${args.logLine}`);
    await ctx.db.patch(args.sessionId, {
      executionLog: logs,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mutation: Add staged files and enrich screen context in draftSession
 */
export const addFilesToDraftSession = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    newFiles: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        sizeBytes: v.optional(v.number()),
        mimeType: v.optional(v.string()),
        path: v.optional(v.string()),
      })
    ),
    selectForAttachment: v.optional(v.boolean()),
    additionalScreenContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    const existingFiles = session.files || [];
    const updatedFiles = [...existingFiles];
    const selectedStorageIds = [...(session.selectedAttachmentStorageIds || [])];

    for (const nf of args.newFiles) {
      if (!updatedFiles.some((f) => f.storageId === nf.storageId)) {
        updatedFiles.push(nf);
      }
      if (args.selectForAttachment && !selectedStorageIds.includes(nf.storageId)) {
        selectedStorageIds.push(nf.storageId);
      }
    }

    let updatedContext = session.screenContext || "";
    if (args.additionalScreenContext) {
      updatedContext = updatedContext
        ? `${updatedContext}\n\n${args.additionalScreenContext}`
        : args.additionalScreenContext;
    }

    await ctx.db.patch(args.sessionId, {
      files: updatedFiles,
      selectedAttachmentStorageIds: selectedStorageIds,
      screenContext: updatedContext,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Tool 1: Get Figma File Metadata & Frame Tree
// ============================================================================
const getFigmaFileMetadataTool = createTool({
  description:
    "Queries the Figma REST API (GET /v1/files/:file_key) to retrieve the document title, canvas pages, and top-level frame/artboard names and IDs.",
  inputSchema: z.object({
    inboxId: z.string().describe("The user inbox ID to authenticate with"),
    sessionId: z.string().describe("The active draftSession ID"),
    fileKey: z.string().describe("The alphanumeric Figma file key extracted from the URL"),
  }),
  execute: async (ctx, args) => {
    const token = await resolveFigmaToken(ctx, args.inboxId);
    if (!token) {
      return {
        success: false,
        error: "NO_FIGMA_TOKEN: User has not linked Figma OAuth account and no global FIGMA_ACCESS_TOKEN is set.",
      };
    }

    try {
      const res = await fetch(
        `https://api.figma.com/v1/files/${encodeURIComponent(args.fileKey)}?depth=2`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Figma-Token": token,
          },
        }
      );

      if (!res.ok) {
        return await figmaApiFailure(ctx, args.sessionId, res, "read file metadata");
      }

      const data = await res.json();
      const documentName = data.name || "Untitled Figma File";
      const pages = (data.document?.children || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        frames: (page.children || [])
          .filter((child: any) => child.type === "FRAME" || child.type === "COMPONENT" || child.type === "SECTION")
          .map((frame: any) => ({
            id: frame.id,
            name: frame.name,
            type: frame.type,
          })),
      }));

      return {
        success: true,
        name: documentName,
        lastModified: data.lastModified,
        thumbnailUrl: data.thumbnailUrl,
        pages,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Failed to fetch Figma file metadata",
      };
    }
  },
});

// ============================================================================
// Tool 2: Match Screen/Prompt to Frames (Multimodal Vision / Heuristic)
// ============================================================================
const matchScreenToFramesTool = createTool({
  description:
    "Analyzes the user's prompt and active screen context against candidate Figma frames to pinpoint the target frame ID(s).",
  inputSchema: z.object({
    prompt: z.string().describe("The user's prompt (e.g. 'Email the checkout screen as a PDF')"),
    candidateFrames: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      )
      .describe("List of candidate frames retrieved from metadata"),
    screenContext: z.optional(z.string()).describe("Active screen context or window title"),
  }),
  execute: async (ctx, args) => {
    if (args.candidateFrames.length === 0) {
      return {
        success: false,
        matchedFrameIds: [],
        reason: "No candidate frames available",
      };
    }

    const lowerPrompt = args.prompt.toLowerCase();
    const lowerContext = (args.screenContext || "").toLowerCase();

    // 1. Direct name match in prompt or context
    const directMatches = args.candidateFrames.filter((f) => {
      const fn = f.name.toLowerCase();
      return lowerPrompt.includes(fn) || lowerContext.includes(fn);
    });

    if (directMatches.length > 0) {
      return {
        success: true,
        matchedFrameIds: directMatches.map((f) => f.id),
        matchedFrames: directMatches,
        reason: `Matched frame name(s) directly from prompt/context: ${directMatches.map((f) => f.name).join(", ")}`,
      };
    }

    // 2. Fallback: select the first primary frame or up to 3 top-level frames
    const defaultFrames = args.candidateFrames.slice(0, 3);
    return {
      success: true,
      matchedFrameIds: defaultFrames.map((f) => f.id),
      matchedFrames: defaultFrames,
      reason: `Defaulted to primary canvas frame(s): ${defaultFrames.map((f) => f.name).join(", ")}`,
    };
  },
});

// ============================================================================
// Tool 3: Export Figma Nodes as PDF via REST API
// ============================================================================
const exportFigmaNodesAsPdfTool = createTool({
  description:
    "Exports specified Figma frames or nodes as a high-resolution vector PDF using GET /v1/images/:file_key?format=pdf, downloads the rendered PDF, and uploads it directly to Convex Storage.",
  inputSchema: z.object({
    sessionId: z.string().describe("The active draftSession ID"),
    inboxId: z.string().describe("The user inbox ID to authenticate with"),
    fileKey: z.string().describe("The Figma file key"),
    nodeIds: z.array(z.string()).describe("Array of node/frame IDs to render as PDF"),
    documentTitle: z.string().describe("Document title for naming the exported file"),
  }),
  execute: async (ctx, args) => {
    const token = await resolveFigmaToken(ctx, args.inboxId);
    if (!token) {
      return {
        success: false,
        error: "NO_FIGMA_TOKEN: User has not linked Figma OAuth account.",
      };
    }

    try {
      const idsParam = args.nodeIds.map(normalizeNodeId).join(",");
      const exportUrl = `https://api.figma.com/v1/images/${encodeURIComponent(
        args.fileKey
      )}?ids=${encodeURIComponent(idsParam)}&format=pdf`;

      const exportRes = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Figma-Token": token,
        },
      });

      if (!exportRes.ok) {
        return await figmaApiFailure(ctx, args.sessionId, exportRes, "export the PDF");
      }

      const exportData = await exportRes.json();
      const imagesMap = exportData.images || {};

      const renderedUrls = Object.values(imagesMap).filter((u): u is string => typeof u === "string" && !!u);
      if (renderedUrls.length === 0) {
        return {
          success: false,
          error: "Figma API returned no rendered PDF image URLs for the specified node IDs.",
        };
      }

      // Download the primary PDF from the temporary AWS URL
      const downloadUrl = renderedUrls[0];
      const pdfFetch = await fetch(downloadUrl);
      if (!pdfFetch.ok) {
        return {
          success: false,
          error: `Failed to download PDF from rendered URL (${pdfFetch.status})`,
        };
      }

      const pdfArrayBuffer = await pdfFetch.arrayBuffer();
      const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

      // Store in Convex Storage
      const storageId = await ctx.storage.store(pdfBlob);
      const safeTitle = args.documentTitle.replace(/[/\\?%*:|"<>]/g, "-").trim() || "Figma Design";
      const fileName = `${safeTitle}.pdf`;

      // Stage into draftSession and mark for attachment
      await ctx.runMutation(internal.pipeline.figmaAgent.addFilesToDraftSession, {
        sessionId: args.sessionId as Id<"draftSessions">,
        newFiles: [
          {
            storageId,
            name: fileName,
            sizeBytes: pdfArrayBuffer.byteLength,
            mimeType: "application/pdf",
          },
        ],
        selectForAttachment: true,
      });

      await ctx.runMutation(internal.pipeline.figmaAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Figma Export] Successfully exported and staged vector PDF: "${fileName}" (${Math.round(
          pdfArrayBuffer.byteLength / 1024
        )} KB)`,
      });

      return {
        success: true,
        storageId,
        fileName,
        sizeBytes: pdfArrayBuffer.byteLength,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Failed to export PDF from Figma",
      };
    }
  },
});

// ============================================================================
// Tool 4: Extract Node Text Content
// ============================================================================
const extractNodeTextContentTool = createTool({
  description:
    "Traverses the Figma node hierarchy to extract text layers, copy, headlines, and button labels for rich drafting context.",
  inputSchema: z.object({
    inboxId: z.string().describe("The user inbox ID to authenticate with"),
    fileKey: z.string().describe("The Figma file key"),
    nodeIds: z.array(z.string()).describe("Node IDs to extract text from"),
  }),
  execute: async (ctx, args) => {
    const token = await resolveFigmaToken(ctx, args.inboxId);
    if (!token) {
      return { success: false, error: "NO_FIGMA_TOKEN" };
    }

    try {
      const idsParam = args.nodeIds.map(normalizeNodeId).join(",");
      const res = await fetch(
        `https://api.figma.com/v1/files/${encodeURIComponent(
          args.fileKey
        )}/nodes?ids=${encodeURIComponent(idsParam)}&depth=3`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Figma-Token": token,
          },
        }
      );

      if (!res.ok) {
        return await figmaApiFailure(ctx, undefined, res, "read node text");
      }

      const data = await res.json();
      const nodesMap = data.nodes || {};

      const textSnippets: string[] = [];

      function collectText(node: any) {
        if (!node) return;
        if (node.type === "TEXT" && node.characters) {
          const clean = node.characters.trim();
          if (clean.length > 0 && !textSnippets.includes(clean)) {
            textSnippets.push(clean);
          }
        }
        if (Array.isArray(node.children)) {
          for (const c of node.children) {
            collectText(c);
          }
        }
      }

      for (const key of Object.keys(nodesMap)) {
        collectText(nodesMap[key]?.document);
      }

      const excerpt = textSnippets.slice(0, 15).join(" | ");

      return {
        success: true,
        textCount: textSnippets.length,
        textExcerpt: excerpt,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Failed to extract node text",
      };
    }
  },
});

// ============================================================================
// Tool 5: Stage Figma Assets & Context for Draft
// ============================================================================
const stageFigmaAssetsForDraftTool = createTool({
  description:
    "Stages the verified Figma markdown link, document title, extracted text, and PDF attachment metadata into the draftSession so draftingAgent can compose the email.",
  inputSchema: z.object({
    sessionId: z.string().describe("The draftSession ID"),
    designTitle: z.string().describe("The design document title"),
    figmaUrl: z.string().describe("The verified Figma URL"),
    summary: z.string().describe("Concise summary of what the design or frame represents"),
    isPdfAttached: z.boolean().describe("Whether a vector PDF was exported and attached"),
  }),
  execute: async (ctx, args) => {
    const additionalContext = `[Figma Design Context]
Document: ${args.designTitle}
Figma URL: ${args.figmaUrl}
Design Overview: ${args.summary}
PDF Attached: ${args.isPdfAttached ? "Yes (vector PDF staged in attachments)" : "No (sharing verified link only)"}`;

    await ctx.runMutation(internal.pipeline.figmaAgent.addFilesToDraftSession, {
      sessionId: args.sessionId as Id<"draftSessions">,
      newFiles: [],
      additionalScreenContext: additionalContext,
    });

    await ctx.runMutation(internal.pipeline.figmaAgent.appendSessionLog, {
      sessionId: args.sessionId as Id<"draftSessions">,
      logLine: `[Figma Assembly Finalized] Prepared context for "${args.designTitle}" (PDF Attached: ${args.isPdfAttached})`,
    });

    return {
      success: true,
      message: "Figma assets and context successfully staged for draftingAgent.",
    };
  },
});

// ============================================================================
// Autonomous Figma Assembly Agent
// ============================================================================
export const figmaAgent = new Agent(components.agent, {
  name: "FigmaAssemblyAgent",
  languageModel: openai("gpt-5-nano"),
  maxSteps: 15,
  instructions: `You are the autonomous Figma Assembly Agent for NotYourAverageMail.
Your goal is to inspect the user's prompt and active Figma context, resolve target design frames, optionally export high-resolution vector PDFs when requested, and stage rich context for the draftingAgent.

Rules & Workflow:
IMPORTANT: Figma's REST API has a tiny call quota on free plans. Every Figma API call counts, so make the FEWEST calls possible and never call a tool whose result you don't need.

1. Parse the Figma URL from the provided screenContext. Extract the fileKey (e.g. from https://www.figma.com/design/<fileKey>/... or https://www.figma.com/file/<fileKey>/...) and any node-id query parameter (e.g. node-id=922-1045).
2. Check the user prompt:
   - If the user explicitly asks for a PDF ("pdf", "as a pdf", "in pdf", "export to pdf", "send as pdf", "mail in pdf"):
     a. If the prompt refers to what is currently open ("this", "this screen/frame/design/page", or names nothing specific) AND the URL has a node-id: call export_figma_nodes_as_pdf DIRECTLY with that node-id. Do NOT call get_figma_file_metadata and do NOT call extract_node_text_content (the drafter reads the PDF itself).
     b. If the prompt names a specific frame/screen (e.g. "the Benson Tribute frame") or there is no node-id: call get_figma_file_metadata once, then match_screen_to_frames to pick the target frame ID(s), then export_figma_nodes_as_pdf. Do NOT call extract_node_text_content.
   - If the user prompt is general ("Email this design to Alex", "share this figma file with Sarah", etc.):
     a. Do NOT export PDFs and do NOT call any Figma API tool. Sharing the verified Figma link from screenContext needs no API call. Go to step 3.
3. Call stage_figma_assets_for_draft with the design title (from the "Document/Window" screenContext or the metadata), the clean Figma URL, a summary, and whether a PDF was attached.
4. If ANY Figma tool returns rateLimited: true, or an error containing NO_FIGMA_TOKEN, do not retry and do not call other Figma tools. Call stage_figma_assets_for_draft with isPdfAttached=false and a summary that says the export was unavailable. Never say a PDF was attached unless export_figma_nodes_as_pdf returned success: true.`,
  tools: {
    get_figma_file_metadata: getFigmaFileMetadataTool,
    match_screen_to_frames: matchScreenToFramesTool,
    export_figma_nodes_as_pdf: exportFigmaNodesAsPdfTool,
    extract_node_text_content: extractNodeTextContentTool,
    stage_figma_assets_for_draft: stageFigmaAssetsForDraftTool,
  },
});

// ============================================================================
// Internal Action: Run Figma Assembly Workflow
// ============================================================================
export const runFigmaAgent = internalAction({
  args: {
    sessionId: v.id("draftSessions"),
    inboxId: v.string(),
    prompt: v.string(),
    screenContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    await ctx.runMutation(internal.pipeline.figmaAgent.appendSessionLog, {
      sessionId: args.sessionId,
      logLine: `[Figma Agent] Starting Figma pre-draft assembly for prompt: "${args.prompt.slice(0, 80)}"`,
    });

    try {
      const { threadId } = await figmaAgent.createThread(ctx, {
        title: `Figma Assembly for ${args.inboxId}`,
      });

      const promptToSend = `Process the following Figma drafting request:
User Prompt: "${args.prompt}"
User Inbox ID: ${args.inboxId}
Session ID: ${args.sessionId}
Screen Context:
${args.screenContext || "No screen context provided"}

Determine if a PDF export is requested and use the fewest Figma API calls possible (see your rules), then stage the verified assets via stage_figma_assets_for_draft.`;

      await figmaAgent.generateText(
        ctx,
        { threadId },
        { prompt: promptToSend }
      );

      return { success: true };
    } catch (e: any) {
      console.error("[runFigmaAgent] Error during assembly:", e);
      await ctx.runMutation(internal.pipeline.figmaAgent.appendSessionLog, {
        sessionId: args.sessionId,
        logLine: `[Figma Agent Warning] Assembly error: ${e.message || e}`,
      });
      return { success: false, error: e.message };
    }
  },
});
