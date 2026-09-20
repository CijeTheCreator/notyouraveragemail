import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import { Agent, createTool } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { Doc, Id } from "../_generated/dataModel";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type StagedFile = {
  storageId: string;
  name: string;
  sizeBytes?: number;
  path?: string;
  mimeType?: string;
};

export type RecipientContact = {
  email: string;
  name: string;
  lastTimestamp: string;
  count: number;
};

export type RecipientHistoryItem = {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  timestamp: string;
  folder: string;
};

export type WebSearchResult = {
  url: string;
  title: string;
  description?: string;
};

// ============================================================================
// Internal Mutations & Queries for Session & Contact Management
// ============================================================================

/**
 * Mutation: Create a new drafting session
 */
export const createDraftSession = internalMutation({
  args: {
    inboxId: v.string(),
    prompt: v.string(),
    screenContext: v.optional(v.string()),
    files: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        sizeBytes: v.optional(v.number()),
        path: v.optional(v.string()),
        mimeType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<Id<"draftSessions">> => {
    const initialLog = `[Session Started] Initialized drafting session for inbox "${args.inboxId}" with ${args.files.length} staged file(s).`;
    const sessionId = await ctx.db.insert("draftSessions", {
      inboxId: args.inboxId,
      prompt: args.prompt,
      screenContext: args.screenContext,
      files: args.files,
      selectedAttachmentStorageIds: [],
      status: "in_progress",
      executionLog: [initialLog],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return sessionId;
  },
});

/**
 * Mutation: Append a step to the session execution log
 */
export const appendSessionLog = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    logLine: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    const log = session.executionLog || [];
    log.push(args.logLine);
    await ctx.db.patch(args.sessionId, {
      executionLog: log,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Query: Get a drafting session by ID
 */
export const getSession = internalQuery({
  args: {
    sessionId: v.id("draftSessions"),
  },
  handler: async (ctx, args): Promise<Doc<"draftSessions"> | null> => {
    return await ctx.db.get(args.sessionId);
  },
});

/**
 * Mutation: Add an attachment storageId to the session
 */
export const addAttachmentToSession = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    storageId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; fileName?: string; totalAttachments?: number; error?: string }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { success: false, error: "Session not found" };

    const selected = session.selectedAttachmentStorageIds || [];
    if (!selected.includes(args.storageId)) {
      selected.push(args.storageId);
      await ctx.db.patch(args.sessionId, {
        selectedAttachmentStorageIds: selected,
        updatedAt: Date.now(),
      });
    }

    const matchedFile = session.files.find((f) => f.storageId === args.storageId);
    return {
      success: true,
      fileName: matchedFile?.name || args.storageId,
      totalAttachments: selected.length,
    };
  },
});

/**
 * Mutation: Finalize draft content in the session
 */
export const saveFinalDraft = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    selectedAttachmentStorageIds: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; error?: string }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { success: false, error: "Session not found" };

    const finalAttachments =
      args.selectedAttachmentStorageIds ??
      session.selectedAttachmentStorageIds ??
      [];

    await ctx.db.patch(args.sessionId, {
      draft: {
        to: args.to,
        subject: args.subject,
        body: args.body,
        attachedFiles: session.files
          .filter((f) => finalAttachments.includes(f.storageId))
          .map((f) => f.path || f.name),
      },
      selectedAttachmentStorageIds: finalAttachments,
      status: "drafted",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Query: Aggregate unique contacts from the user's messages
 */
export const getUniqueRecipients = internalQuery({
  args: {
    inboxId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RecipientContact[]> => {
    const maxLimit = args.limit || 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .order("desc")
      .take(200);

    const contactMap = new Map<string, RecipientContact>();

    for (const msg of messages) {
      if (
        msg.fromEmail &&
        msg.fromEmail.includes("@") &&
        msg.fromEmail.toLowerCase() !== args.inboxId.toLowerCase()
      ) {
        const email = msg.fromEmail.toLowerCase().trim();
        const existing = contactMap.get(email);
        if (!existing) {
          contactMap.set(email, {
            email,
            name: msg.fromName || "",
            lastTimestamp: msg.timestamp || "",
            count: 1,
          });
        } else {
          existing.count += 1;
          if (!existing.name && msg.fromName) {
            existing.name = msg.fromName;
          }
        }
      }

      if (
        msg.toEmail &&
        msg.toEmail.includes("@") &&
        msg.toEmail.toLowerCase() !== args.inboxId.toLowerCase()
      ) {
        const email = msg.toEmail.toLowerCase().trim();
        const existing = contactMap.get(email);
        if (!existing) {
          contactMap.set(email, {
            email,
            name: msg.toName || "",
            lastTimestamp: msg.timestamp || "",
            count: 1,
          });
        } else {
          existing.count += 1;
          if (!existing.name && msg.toName) {
            existing.name = msg.toName;
          }
        }
      }
    }

    const contacts = Array.from(contactMap.values());
    contacts.sort((a, b) => {
      const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return timeB - timeA;
    });

    return contacts.slice(0, maxLimit);
  },
});

/**
 * Query: Retrieve past email thread exchanges with a specific recipient
 */
export const getRecipientHistory = internalQuery({
  args: {
    inboxId: v.string(),
    recipientEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RecipientHistoryItem[]> => {
    const maxLimit = args.limit || 5;
    const target = args.recipientEmail.toLowerCase().trim();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .order("desc")
      .take(150);

    const history: RecipientHistoryItem[] = messages
      .filter(
        (m) =>
          m.fromEmail?.toLowerCase().trim() === target ||
          m.toEmail?.toLowerCase().trim() === target
      )
      .slice(0, maxLimit)
      .map((m) => ({
        messageId: m.messageId,
        from: `${m.fromName} <${m.fromEmail}>`,
        to: `${m.toName} <${m.toEmail}>`,
        subject: m.subject,
        preview: m.preview || (m.body ? m.body.slice(0, 200) : ""),
        timestamp: m.timestamp,
        folder: m.folder,
      }));

    return history;
  },
});

// ============================================================================
// Agent Tools
// ============================================================================

/**
 * Tool 1: List files in the drafting session
 */
const listFilesInSessionTool = createTool({
  description:
    "Lists all files that were staged or uploaded to the current drafting session. Returns each file's filename, storageId, size, and path.",
  inputSchema: z.object({
    sessionId: z.string().describe("The ID of the drafting session"),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    files?: StagedFile[];
    currentlyAttachedStorageIds?: string[];
    error?: string;
  }> => {
    try {
      const session: Doc<"draftSessions"> | null = await ctx.runQuery(
        internal.pipeline.draftingAgent.getSession,
        {
          sessionId: args.sessionId as Id<"draftSessions">,
        }
      );

      if (!session) {
        return { success: false, error: "Session not found." };
      }

      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Drafter Tool] Inspected session files: ${session.files.length} file(s) available.`,
      });

      return {
        success: true,
        files: session.files.map((f) => ({
          storageId: f.storageId,
          name: f.name,
          sizeBytes: f.sizeBytes ?? 0,
          path: f.path ?? "",
          mimeType: f.mimeType ?? "application/octet-stream",
        })),
        currentlyAttachedStorageIds: session.selectedAttachmentStorageIds,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to list files" };
    }
  },
});

/**
 * Tool 2: Read file content from session (Multimodal: Text + OpenAI Vision/PDF)
 */
const readFileFromSessionTool = createTool({
  description:
    "Reads and inspects the contents of a file staged in the session using its storageId or filename. Plain text, markdown, and code are returned directly; images and PDFs are inspected multimodally to extract text and details.",
  inputSchema: z.object({
    sessionId: z.string().describe("The drafting session ID"),
    storageId: z
      .optional(z.string())
      .describe("The Convex storageId of the file to inspect"),
    fileName: z
      .optional(z.string())
      .describe("The filename of the file to inspect (if storageId is not known)"),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    fileName?: string;
    storageId?: string;
    fileType?: string;
    content?: string;
    extractedSummary?: string;
    error?: string;
  }> => {
    try {
      const session: Doc<"draftSessions"> | null = await ctx.runQuery(
        internal.pipeline.draftingAgent.getSession,
        {
          sessionId: args.sessionId as Id<"draftSessions">,
        }
      );

      if (!session) {
        return { success: false, error: "Session not found." };
      }

      const targetFile = session.files.find(
        (f) =>
          (args.storageId && f.storageId === args.storageId) ||
          (args.fileName && f.name.toLowerCase() === args.fileName.toLowerCase())
      );

      if (!targetFile) {
        return {
          success: false,
          error: `File not found in session matching storageId="${args.storageId}" or fileName="${args.fileName}". Available files: ${session.files.map((f) => f.name).join(", ")}`,
        };
      }

      if (!targetFile.storageId) {
        return {
          success: true,
          fileName: targetFile.name,
          content: `[File metadata only: path="${targetFile.path}", size=${targetFile.sizeBytes} bytes. No storageId available.]`,
        };
      }

      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Drafter Tool] Reading file "${targetFile.name}" from Convex storage...`,
      });

      const blob = await ctx.storage.get(targetFile.storageId);
      if (!blob) {
        return {
          success: false,
          error: `Could not retrieve file content from storage for ${targetFile.name}`,
        };
      }

      const lowerName = targetFile.name.toLowerCase();
      const isTextFile =
        lowerName.endsWith(".txt") ||
        lowerName.endsWith(".md") ||
        lowerName.endsWith(".csv") ||
        lowerName.endsWith(".json") ||
        lowerName.endsWith(".ts") ||
        lowerName.endsWith(".js") ||
        lowerName.endsWith(".py") ||
        lowerName.endsWith(".html") ||
        lowerName.endsWith(".css") ||
        lowerName.endsWith(".xml") ||
        lowerName.endsWith(".log") ||
        lowerName.endsWith(".rtf") ||
        blob.type.startsWith("text/");

      if (isTextFile) {
        const text = await blob.text();
        const truncated =
          text.length > 20000
            ? text.slice(0, 20000) + "\n...[truncated remainder of file]"
            : text;

        await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
          sessionId: args.sessionId as Id<"draftSessions">,
          logLine: `[Drafter Tool] Successfully read text file "${targetFile.name}" (${text.length} chars).`,
        });

        return {
          success: true,
          fileName: targetFile.name,
          storageId: targetFile.storageId,
          fileType: "text",
          content: truncated,
        };
      }

      // For images and PDFs: Multimodal inspection via OpenAI
      const isImage =
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".webp") ||
        blob.type.startsWith("image/");

      const isPdf = lowerName.endsWith(".pdf") || blob.type === "application/pdf";

      if (isImage || isPdf) {
        try {
          const arrayBuf = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const mime = isPdf ? "application/pdf" : blob.type || "image/jpeg";
          const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

          const { text } = await generateText({
            model: openai("gpt-5-nano"),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this attached document/image ("${targetFile.name}"). Provide a comprehensive summary and extract any key figures, text, headings, recipient names, dates, or specifications that would be relevant for drafting an email.`,
                  },
                  {
                    type: "image",
                    image: dataUrl,
                  },
                ],
              },
            ],
          });

          await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
            sessionId: args.sessionId as Id<"draftSessions">,
            logLine: `[Drafter Tool] Multimodal inspection completed for "${targetFile.name}". Extracted summary.`,
          });

          return {
            success: true,
            fileName: targetFile.name,
            storageId: targetFile.storageId,
            fileType: isPdf ? "pdf" : "image",
            extractedSummary: text,
          };
        } catch (visionErr: any) {
          console.warn("[readFileFromSessionTool] Multimodal inspection fallback:", visionErr);
          return {
            success: true,
            fileName: targetFile.name,
            storageId: targetFile.storageId,
            fileType: isPdf ? "pdf" : "image",
            content: `[Binary document "${targetFile.name}" of size ${targetFile.sizeBytes} bytes. Multimodal analysis was unavailable.]`,
          };
        }
      }

      // Default binary fallback
      return {
        success: true,
        fileName: targetFile.name,
        storageId: targetFile.storageId,
        fileType: "binary",
        content: `[Binary file: "${targetFile.name}", size: ${targetFile.sizeBytes || blob.size} bytes]`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to read file" };
    }
  },
});

/**
 * Tool 3: Add file from session as an attachment for the final email draft
 */
const addAttachmentToDraftTool = createTool({
  description:
    "Marks a staged file in the session to be attached to the final outgoing email draft. Call this for each file that should accompany the draft.",
  inputSchema: z.object({
    sessionId: z.string().describe("The drafting session ID"),
    storageId: z
      .string()
      .describe("The Convex storageId of the file to attach"),
    reason: z
      .optional(z.string())
      .describe("Brief reason why this file is relevant to attach"),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    fileName?: string;
    totalAttachmentsStaged?: number;
    error?: string;
  }> => {
    try {
      const result = await ctx.runMutation(
        internal.pipeline.draftingAgent.addAttachmentToSession,
        {
          sessionId: args.sessionId as Id<"draftSessions">,
          storageId: args.storageId,
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Drafter Tool] Staged attachment "${result.fileName}" for outgoing draft${args.reason ? ` (${args.reason})` : ""}.`,
      });

      return {
        success: true,
        fileName: result.fileName,
        totalAttachmentsStaged: result.totalAttachments,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to attach file" };
    }
  },
});

/**
 * Tool 4: List past recipients / contacts from the user's messages
 */
const listRecipientsTool = createTool({
  description:
    "Aggregates all unique contacts from the user's past inbox and sent messages, sorted by recency. Use this to identify or match the correct recipient email address when the prompt mentions a person's name.",
  inputSchema: z.object({
    inboxId: z.string().describe("The user's active inbox ID"),
    limit: z
      .optional(z.number())
      .describe("Maximum number of contacts to return (default 50)"),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    count?: number;
    recipients?: RecipientContact[];
    error?: string;
  }> => {
    try {
      const recipients: RecipientContact[] = await ctx.runQuery(
        internal.pipeline.draftingAgent.getUniqueRecipients,
        {
          inboxId: args.inboxId,
          limit: args.limit || 50,
        }
      );

      return {
        success: true,
        count: recipients.length,
        recipients,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to list recipients",
      };
    }
  },
});

/**
 * Tool 5: Get past email history with a specific recipient
 */
const getRecipientHistoryTool = createTool({
  description:
    "Retrieves recent emails exchanged with a specific recipient. Use this to adopt the right tone, understand previous conversations, or maintain subject line continuity (e.g. Re: ...).",
  inputSchema: z.object({
    inboxId: z.string().describe("The user's active inbox ID"),
    recipientEmail: z
      .string()
      .describe("The recipient email address to look up history for"),
    limit: z
      .optional(z.number())
      .describe("Max messages to return (default 5)"),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    recipientEmail?: string;
    count?: number;
    history?: RecipientHistoryItem[];
    error?: string;
  }> => {
    try {
      const history: RecipientHistoryItem[] = await ctx.runQuery(
        internal.pipeline.draftingAgent.getRecipientHistory,
        {
          inboxId: args.inboxId,
          recipientEmail: args.recipientEmail,
          limit: args.limit || 5,
        }
      );

      return {
        success: true,
        recipientEmail: args.recipientEmail,
        count: history.length,
        history,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to retrieve history",
      };
    }
  },
});

/**
 * Tool 6: Web search via Firecrawl
 */
const searchWebTool = createTool({
  description:
    "Searches the web via Firecrawl Search (/v2/search) to discover contact emails, support addresses, or company details needed for the draft.",
  inputSchema: z.object({
    sessionId: z.string().describe("The drafting session ID"),
    query: z
      .string()
      .describe(
        "Search query, e.g. 'Stripe customer support email contact' or 'Acme Corp investor relations address'"
      ),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    results?: WebSearchResult[];
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "FIRECRAWL_API_KEY is not configured in Convex environment.",
      };
    }

    await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
      sessionId: args.sessionId as Id<"draftSessions">,
      logLine: `[Drafter Web Search] Searching: "${args.query}"`,
    });

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          limit: 3,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Firecrawl search failed with status ${res.status}`,
        };
      }

      const data = await res.json();
      const rawResults = data?.data?.web || data?.web || [];
      const results: WebSearchResult[] = rawResults.map((item: any) => ({
        url: item.url,
        title: item.title,
        description: item.description?.slice(0, 300),
      }));

      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Drafter Web Search] Found ${results.length} result(s). Top: ${results[0]?.title || "none"}`,
      });

      return {
        success: true,
        results,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Search request failed",
      };
    }
  },
});

/**
 * Tool 7: Finalize Draft
 */
const finalizeDraftTool = createTool({
  description:
    "Commits the final email draft (recipient, subject, email body) and selected attachments. ALWAYS call this tool as your final step once the draft is composed.",
  inputSchema: z.object({
    sessionId: z.string().describe("The drafting session ID"),
    to: z
      .string()
      .describe(
        "Recipient email address (e.g. 'alex@example.com'), or empty string '' if recipient is not specified, ambiguous, or not found"
      ),
    subject: z.string().describe("Compelling and contextual subject line"),
    body: z
      .string()
      .describe(
        "Complete formatted body of the email (clean text with proper greetings and sign-off)"
      ),
    attachedStorageIds: z
      .optional(z.array(z.string()))
      .describe(
        "Optional explicit list of storageIds to attach. If omitted, uses all files added via add_attachment_to_draft."
      ),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      const result = await ctx.runMutation(
        internal.pipeline.draftingAgent.saveFinalDraft,
        {
          sessionId: args.sessionId as Id<"draftSessions">,
          to: args.to,
          subject: args.subject,
          body: args.body,
          selectedAttachmentStorageIds: args.attachedStorageIds,
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId as Id<"draftSessions">,
        logLine: `[Drafter] Finalized email draft to <${args.to || "Unspecified"}> with subject: "${args.subject}". Ready for review.`,
      });

      return {
        success: true,
        message:
          "Draft successfully committed to session and ready for user review in the Desktop HUD.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to finalize draft",
      };
    }
  },
});

// ============================================================================
// Drafting Agent Definition
// ============================================================================

export const draftingAgent = new Agent(components.agent, {
  name: "EmailDraftingAgent",
  languageModel: openai("gpt-5-nano"),
  maxSteps: 15,
  instructions: `You are NotYourAverageMail's autonomous email drafting agent for the macOS desktop companion.

Your goal is to inspect the user's prompt, understand their intent, discover or match the intended recipient, review any staged files or documents, select the right attachments, and produce a polished, context-aware email draft.

Guidelines:
1. **Recipient Discovery**:
   - If the prompt specifies an exact email address (e.g., "alex@example.com"), use it directly.
   - If the prompt specifies a person's name or company (e.g., "Email Sarah", "Draft a note to Michael at Acme"), call \`list_recipients\` to match them against the user's past correspondents.
   - If looking for a support email or external organization's contact address (e.g. "Draft an email to Stripe support"), call \`search_web\` to find the official address.
   - If you match a past correspondent, call \`get_recipient_history\` with their email to inspect previous thread history, allowing you to match tone, reference prior conversations, or use a "Re: ..." subject.
   - **EMPTY / UNSPECIFIED RECIPIENT RULE**: If the user did NOT specify a recipient in their prompt (e.g. "Draft a polite follow up", "Draft an announcement about our new feature"), or if the recipient name cannot be found in \`list_recipients\` or \`search_web\`, DO NOT invent or hallucinate a dummy email (like "alex@example.com" or "user@example.com"). Instead, set \`to: ""\` (empty string) so the desktop user is prompted to supply the recipient email in the review HUD.

2. **File & Attachment Review**:
   - If files are available in the session, call \`list_files_in_session\` to see what the user uploaded or selected in Finder.
   - Call \`read_file_from_session\` to inspect relevant files (e.g., read a PDF pitch deck, invoice, or screenshot) to incorporate specific details, numbers, or summaries into the body of the email.
   - For every file that belongs with the email, call \`add_attachment_to_draft\` with its storageId. Be selective: only attach files requested or relevant to the prompt.
    - **DOCUMENT FORMAT RULE (e.g. Pages vs PDF, Keynote vs PDF)**: When multiple formats of the same document or presentation exist in the session (such as both a ".pages" and ".pdf" file, or both a ".key" and ".pdf" file):
      - If the user explicitly asks for "pdf" or "as a PDF" in their prompt, attach ONLY the ".pdf" version.
      - If the user explicitly asks for "pages", or if the document is from Pages and the user does not specify a format, attach ONLY the ".pages" version.
      - If the user asks for "keynote", "key", or mentions "deck", "slides", "presentation", or if the document is from Keynote and the user does not specify a format, attach ONLY the ".key" version.
      - Do not attach duplicate copies in multiple formats unless explicitly requested.
    - **BROWSER / WEBPAGE CONTEXT RULE**: When the active screen context contains a "Page URL:", "Selected Quote:", or "Content Preview:" from a browser (Safari, Chrome, Arc, Brave, Edge):
      - If the user's prompt involves sharing, reviewing, or emailing the webpage, naturally embed the verified URL into the email (e.g. as a clean markdown link [Page Title](URL) or conversational link reference).
      - If a "Selected Quote:" is present in the context and the prompt refers to it (or asks to share the highlighted/selected excerpt), format the quote cleanly using markdown blockquote syntax (> "...") and cite the source page.
      - If the user asks to summarize the page or tell the recipient about it, synthesize key takeaways from the "Content Preview" and page title.
      - Do NOT hallucinate dummy URLs or links; strictly use the exact URL provided in the Page URL context.
    - **FIGMA CONTEXT RULE**: When the active context contains Figma information ("Figma URL:", "Document:", "Figma Design Context", or Figma PDF attachments):
      - Format the live Figma design link cleanly using markdown: [Design Title](Figma URL).
      - If a vector PDF was staged in the session files by the Figma Assembly Agent, attach it using \`add_attachment_to_draft\`.
      - Summarize the design's purpose, key screens/frames, and text layers as provided in the Figma Design Context.
      - Do NOT hallucinate dummy links; strictly use the verified Figma URL from context.
      - If the context contains "[Figma Notice]" (e.g. a rate limit), the PDF could NOT be exported: never write that a file is attached, and never call add_attachment_to_draft for Figma. Draft the email without claiming an attachment.

3. **Email Composition**:
   - Write natural, professional, and well-structured email bodies. Include a proper greeting, clear paragraphs, and sign-off.
   - If \`to\` is empty because no recipient is known, write a neutral greeting like "Hello," or "Hi there," instead of addressing a fake name.
   - Choose a concise, informative subject line that accurately reflects the email topic.
   - Never leave placeholders like "[Your Name]" or "[Insert Date]"; write complete, immediately sendable copy.

4. **Final Step**:
   - Once the recipient is resolved (or left empty as \`""\` if unspecified), the body is written, and attachments are staged, call \`finalize_draft\` with sessionId, to, subject, and body.
   - ALWAYS finish by calling \`finalize_draft\`. Do not conclude your turn without calling \`finalize_draft\`.`,
  tools: {
    list_files_in_session: listFilesInSessionTool,
    read_file_from_session: readFileFromSessionTool,
    add_attachment_to_draft: addAttachmentToDraftTool,
    list_recipients: listRecipientsTool,
    get_recipient_history: getRecipientHistoryTool,
    search_web: searchWebTool,
    finalize_draft: finalizeDraftTool,
  },
});

// ============================================================================
// Action: Run Autonomous Drafting Workflow
// ============================================================================

export const runDraftingAgent = internalAction({
  args: {
    sessionId: v.id("draftSessions"),
    inboxId: v.string(),
    prompt: v.string(),
    screenContext: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; session?: Doc<"draftSessions"> | null; error?: string }> => {
    await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
      sessionId: args.sessionId,
      logLine: `[Agent Started] Initializing autonomous drafter for prompt: "${args.prompt.slice(0, 100)}"`,
    });

    try {
      const { threadId } = await draftingAgent.createThread(ctx, {
        title: `Draft for ${args.inboxId}: ${args.prompt.slice(0, 40)}`,
      });

      const session: Doc<"draftSessions"> | null = await ctx.runQuery(
        internal.pipeline.draftingAgent.getSession,
        {
          sessionId: args.sessionId,
        }
      );

      const fileSummary = (session?.files || [])
        .map(
          (f: StagedFile, i: number) =>
            `${i + 1}. "${f.name}" (storageId: ${f.storageId || "none"}, size: ${f.sizeBytes ?? 0} bytes)`
        )
        .join("\n");

      const promptToSend = `Please draft an email based on the following request.

User Request: "${args.prompt}"
User Inbox Address: ${args.inboxId}
Session ID: ${args.sessionId}
${args.screenContext ? `Active Screen/Application Context: ${args.screenContext}\n` : ""}
Staged Files in Session (${session?.files?.length ?? 0}):
${fileSummary || "None"}

Instructions:
1. Identify the intended recipient (use list_recipients or search_web if needed).
2. If files were provided, inspect them using read_file_from_session and call add_attachment_to_draft for any files that should be attached (respecting the DOCUMENT FORMAT RULE: if both .pages/.key and .pdf exist for the same document, attach .pdf if requested, otherwise default to native .pages/.key). If browser context (Page URL, Selected Quote, Page Excerpt) is present, integrate the link and quote into the drafted email as requested.
3. Write the email and call finalize_draft with to, subject, body, and sessionId.`;

      // Run agent with retry on rate limits
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await draftingAgent.generateText(
            ctx,
            { threadId },
            { prompt: promptToSend }
          );
          break;
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isRateLimit =
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("429") ||
            errMsg.includes("Quota exceeded");

          if (isRateLimit && attempt < maxRetries) {
            await ctx.runMutation(
              internal.pipeline.draftingAgent.appendSessionLog,
              {
                sessionId: args.sessionId,
                logLine: `[Rate Limit] OpenAI rate limit encountered. Waiting 10s before retry (Attempt ${attempt + 1}/${maxRetries})...`,
              }
            );
            await new Promise((resolve) => setTimeout(resolve, 10000));
            continue;
          }
          throw err;
        }
      }

      // Check if session was drafted
      const finalized: Doc<"draftSessions"> | null = await ctx.runQuery(
        internal.pipeline.draftingAgent.getSession,
        {
          sessionId: args.sessionId,
        }
      );

      return {
        success: finalized?.status === "drafted",
        session: finalized,
      };
    } catch (err: any) {
      console.error("[runDraftingAgent] Error running agent:", err);
      await ctx.runMutation(internal.pipeline.draftingAgent.appendSessionLog, {
        sessionId: args.sessionId,
        logLine: `[Agent Error] ${err?.message || "Execution failed"}`,
      });

      return {
        success: false,
        error: err?.message || "Drafting agent encountered an error",
      };
    }
  },
});
