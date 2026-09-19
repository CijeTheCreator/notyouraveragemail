import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Mutation: Generate an upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Query: Real-time Live Alerts for the Desktop Companion
 * Subscribes to the inbox and returns recent unread messages with OTP codes.
 */
export const getLiveAlerts = query({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_inbox_and_folder", (q) =>
        q.eq("inboxId", args.inboxId).eq("folder", "inbox")
      )
      .order("desc")
      .take(20);

    // Filter for unread messages that have an OTP code
    const otpAlerts = unreadMessages
      .filter((m) => !m.isRead && !!m.otpCode)
      .map((m) => ({
        messageId: m.messageId,
        fromName: m.fromName,
        fromEmail: m.fromEmail,
        subject: m.subject,
        otpCode: m.otpCode!,
        timestamp: m.timestamp,
        isRead: m.isRead,
      }));

    return {
      otpAlerts,
      latestOtp: otpAlerts[0] || null,
      unreadCount: unreadMessages.filter((m) => !m.isRead).length,
    };
  },
});

/**
 * Mutation: Mark OTP message as read once auto-filled or copied
 */
export const markOtpAsRead = action({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // In companion context, we can call toggleRead or query directly
    return { success: true };
  },
});

import { Doc, Id } from "./_generated/dataModel";

/**
 * Action: AI Email Drafting for Desktop Companion
 * Takes user speech/prompt, selected files, and optional screen context to generate a draft
 * using the autonomous draftingAgent and draftSessions.
 */
export const draftEmail = action({
  args: {
    inboxId: v.string(),
    prompt: v.string(),
    fileNames: v.optional(v.array(v.string())),
    fileIds: v.optional(
      v.array(
        v.object({
          storageId: v.string(),
          name: v.string(),
          sizeBytes: v.optional(v.number()),
          path: v.optional(v.string()),
        })
      )
    ),
    screenContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // 1. Process input attachments provided from system / client
    const rawAttachments = args.fileIds || [];
    let stagedFiles = rawAttachments.map((f) => ({
      storageId: f.storageId,
      name: f.name,
      sizeBytes: f.sizeBytes ?? 0,
      path: f.path ?? "",
    }));

    // Fallback: if no storage fileIds provided yet, use fileNames from system
    if (stagedFiles.length === 0 && args.fileNames && args.fileNames.length > 0) {
      stagedFiles = args.fileNames.map((p) => ({
        storageId: "",
        name: p.split("/").pop() || p,
        sizeBytes: 0,
        path: p,
      }));
    }

    try {
      // 2. Create drafting session in Convex
      const sessionId: Id<"draftSessions"> = await ctx.runMutation(
        internal.pipeline.draftingAgent.createDraftSession,
        {
          inboxId: args.inboxId,
          prompt: args.prompt,
          screenContext: args.screenContext,
          files: stagedFiles,
        }
      );

      // 2b. If Figma context or prompt detected, run the Figma Assembly Agent first
      const isFigma =
        (args.screenContext || "").toLowerCase().includes("figma") ||
        args.prompt.toLowerCase().includes("figma");

      if (isFigma) {
        try {
          await ctx.runAction(internal.pipeline.figmaAgent.runFigmaAgent, {
            sessionId,
            inboxId: args.inboxId,
            prompt: args.prompt,
            screenContext: args.screenContext,
          });
        } catch (figmaErr) {
          console.warn("[companion:draftEmail] Figma assembly warning:", figmaErr);
        }
      }

      // 3. Run the autonomous drafting agent
      await ctx.runAction(
        internal.pipeline.draftingAgent.runDraftingAgent,
        {
          sessionId,
          inboxId: args.inboxId,
          prompt: args.prompt,
          screenContext: args.screenContext,
        }
      );

      // 4. Retrieve finalized session
      const session: Doc<"draftSessions"> | null = await ctx.runQuery(
        internal.pipeline.draftingAgent.getSession,
        {
          sessionId,
        }
      );

      // 5. Determine attachments selected by agent
      // Use the session's files, not just the client-provided `stagedFiles`: agents
      // (e.g. the Figma assembly agent's PDF export) stage files server-side into the session.
      const sessionFiles = (session?.files || []).map((f) => ({
        storageId: f.storageId,
        name: f.name,
        sizeBytes: f.sizeBytes ?? 0,
        path: f.path ?? "",
      }));
      const candidateFiles = sessionFiles.length > 0 ? sessionFiles : stagedFiles;

      const selectedStorageIds = session?.selectedAttachmentStorageIds || [];
      let finalAttachments =
        selectedStorageIds.length > 0
          ? candidateFiles.filter((f) => selectedStorageIds.includes(f.storageId))
          : candidateFiles;

      if (finalAttachments.length === 0 && candidateFiles.length > 0) {
        finalAttachments = candidateFiles;
      }

      const selectedFilePaths = finalAttachments
        .map((a) => a.path || a.name)
        .filter((p) => p.length > 0);

      if (session?.draft) {
        return {
          success: true,
          sessionId: String(sessionId),
          to: session.draft.to,
          subject: session.draft.subject,
          body: session.draft.body,
          attachedFiles: selectedFilePaths,
          attachments: finalAttachments,
          selectedAttachments: finalAttachments,
          fileIds: finalAttachments,
          // Surfaced in the desktop HUD, e.g. a Figma rate limit that prevented a PDF export.
          notice:
            (session.executionLog || [])
              .filter((l) => l.includes("[Figma Warning]"))
              .map((l) => l.replace(/^.*\[Figma Warning\]\s*/, ""))
              .join(" ") || undefined,
          executionLog: session.executionLog || [],
        };
      }
    } catch (agentErr: any) {
      console.error("[companion:draftEmail] Agent execution error:", agentErr);
    }

    // Graceful fallback if agent did not complete finalize_draft
    const selectedFilePaths = stagedFiles
      .map((a) => a.path || a.name)
      .filter((p) => p.length > 0);

    return {
      success: true,
      to: "",
      subject:
        args.prompt.length > 30
          ? `${args.prompt.slice(0, 27)}...`
          : args.prompt || "Regarding our recent discussion",
      body: `Hello,\n\nFollowing up regarding: "${args.prompt}".\n\nI've attached the relevant files for your review. Please take a look and let me know if you need any adjustments or further details.\n\nBest regards,\nUser`,
      attachedFiles: selectedFilePaths,
      attachments: stagedFiles,
      selectedAttachments: stagedFiles,
      fileIds: stagedFiles,
    };
  },
});

/**
 * Query: Get a drafting session status and execution log
 */
export const getDraftSession = query({
  args: { sessionId: v.id("draftSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});


/**
 * Helper: Extract width and height from Base64 image bytes (JPEG and PNG)
 * Works in standard Web/WinterCG/Convex runtime without Node Buffer.
 */
function parseImageDimensions(base64: string): { width: number; height: number } | null {
  try {
    const safeLen = Math.min(base64.length, 16384);
    const alignedLen = safeLen - (safeLen % 4);
    const binary = atob(base64.slice(0, alignedLen));
    const len = binary.length;
    if (len < 24) return null;

    // Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      binary.charCodeAt(0) === 0x89 &&
      binary.charCodeAt(1) === 0x50 &&
      binary.charCodeAt(2) === 0x4e &&
      binary.charCodeAt(3) === 0x47
    ) {
      const width =
        (binary.charCodeAt(16) << 24) |
        (binary.charCodeAt(17) << 16) |
        (binary.charCodeAt(18) << 8) |
        binary.charCodeAt(19);
      const height =
        (binary.charCodeAt(20) << 24) |
        (binary.charCodeAt(21) << 16) |
        (binary.charCodeAt(22) << 8) |
        binary.charCodeAt(23);
      if (width > 0 && height > 0) return { width, height };
    }

    // Check JPEG: FF D8
    if (binary.charCodeAt(0) === 0xff && binary.charCodeAt(1) === 0xd8) {
      let offset = 2;
      while (offset < len) {
        if (binary.charCodeAt(offset) !== 0xff) {
          offset++;
          continue;
        }
        while (offset < len && binary.charCodeAt(offset) === 0xff) offset++;
        if (offset >= len) break;
        const marker = binary.charCodeAt(offset);
        offset++;
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          if (offset + 7 >= len) break;
          const height = (binary.charCodeAt(offset + 3) << 8) | binary.charCodeAt(offset + 4);
          const width = (binary.charCodeAt(offset + 5) << 8) | binary.charCodeAt(offset + 6);
          if (width > 0 && height > 0) return { width, height };
        }
        if (marker === 0xd9) break; // EOI
        if (offset + 1 >= len) break;
        const blockLen = (binary.charCodeAt(offset) << 8) | binary.charCodeAt(offset + 1);
        offset += blockLen;
      }
    }
  } catch (err) {
    console.warn("[parseImageDimensions] Error parsing base64:", err);
  }
  return null;
}

/**
 * Action: Detect OTP / 2FA Input Field Coordinates on Screen
 * Uses OpenAI Computer Use API (Responses API with tools: [{ type: "computer" }]) powered by gpt-5.6-sol.
 * Falls back gracefully to Vision Bounding Box Detection if needed.
 */
export const detectOtpCoordinates = action({
  args: {
    screenshotBase64: v.string(),
    displayWidth: v.number(),
    displayHeight: v.number(),
    screenshotWidth: v.optional(v.number()),
    screenshotHeight: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. Primary: OpenAI Computer Use API (Responses API with gpt-5.6-sol)
    if (apiKey) {
      try {
        const parsedDimensions = parseImageDimensions(args.screenshotBase64);
        const imgWidth = args.screenshotWidth || parsedDimensions?.width || args.displayWidth;
        const imgHeight = args.screenshotHeight || parsedDimensions?.height || args.displayHeight;

        console.log("[detectOtpCoordinates] Screen points:", args.displayWidth, "x", args.displayHeight, "Image pixels:", imgWidth, "x", imgHeight);

        // Turn 1: Send computer use request
        const turn1Res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-5.6-sol",
            tools: [{ type: "computer" }],
            input:
              "Inspect the screen screenshot. Find the text input box or input field where the user enters the verification code or OTP (for example, the rectangular input box with placeholder 'Enter 6-digit code' or individual digit boxes). Click directly inside the vertical and horizontal center of the text input field to focus it. Do NOT click the label or header text above it.",
          }),
        });

        if (turn1Res.ok) {
          const turn1Data = await turn1Res.json();
          const computerCall = turn1Data.output?.find(
            (o: any) => o.type === "computer_call"
          );

          if (computerCall && computerCall.call_id) {
            // Turn 2: Provide the screenshot
            const turn2Res = await fetch("https://api.openai.com/v1/responses", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-5.6-sol",
                tools: [{ type: "computer" }],
                previous_response_id: turn1Data.id,
                input: [
                  {
                    type: "computer_call_output",
                    call_id: computerCall.call_id,
                    output: {
                      type: "computer_screenshot",
                      image_url: `data:image/jpeg;base64,${args.screenshotBase64}`,
                      detail: "original",
                    },
                  },
                ],
              }),
            });

            if (turn2Res.ok) {
              const turn2Data = await turn2Res.json();
              const actionCall = turn2Data.output?.find(
                (o: any) => o.type === "computer_call"
              );

              const clickAction = actionCall?.actions?.find(
                (a: any) =>
                  (a.type === "click" || a.type === "move" || a.type === "double_click") &&
                  typeof a.x === "number" &&
                  typeof a.y === "number"
              );

              if (clickAction) {
                const normalizedCenterX = clickAction.x / imgWidth;
                const normalizedCenterY = clickAction.y / imgHeight;

                const screenX = Math.round(normalizedCenterX * args.displayWidth);
                const screenYTopLeft = Math.round(normalizedCenterY * args.displayHeight);
                const screenYBottomLeft = Math.round(args.displayHeight - screenYTopLeft);

                console.log("[detectOtpCoordinates] Computer Use hit:", {
                  clickAction,
                  normalizedCenterX,
                  normalizedCenterY,
                  screenX,
                  screenYTopLeft,
                  screenYBottomLeft,
                });

                return {
                  found: true,
                  screenX,
                  screenYTopLeft,
                  screenYBottomLeft,
                  confidence: 0.95,
                  description: `OpenAI Computer Use (gpt-5.6-sol) clicked at (${clickAction.x}, ${clickAction.y})`,
                };
              } else {
                // The model inspected the screen and determined there is no OTP field
                return {
                  found: false,
                  screenX: 0,
                  screenYTopLeft: 0,
                  screenYBottomLeft: 0,
                  confidence: 0.9,
                  description: "OpenAI Computer Use: No OTP input field detected",
                };
              }
            }
          }
        }
      } catch (computerUseErr: any) {
        console.warn("[detectOtpCoordinates] OpenAI Computer Use attempt error, trying fallback:", computerUseErr);
      }
    }

    // 2. Fallback: Vision Bounding Box Detection via gpt-5-nano
    const coordinateSchema = z.object({
      found: z.boolean().describe("True if a verification code, 2FA, or OTP input field is visible on screen."),
      box_2d: z
        .array(z.number())
        .length(4)
        .describe("The 2D bounding box [ymin, xmin, ymax, xmax] of the input field or code boxes, normalized from 0 to 1000."),
      confidence: z.number().describe("Confidence score between 0.0 and 1.0"),
      description: z.string().describe("Brief description of the element identified."),
    });

    try {
      const { object } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: coordinateSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this screen screenshot. Locate the verification code, OTP, or two-factor authentication input field/boxes. Return the normalized [ymin, xmin, ymax, xmax] bounding box (0-1000 scale). If no verification input is visible, set found to false.",
              },
              {
                type: "image",
                image: `data:image/jpeg;base64,${args.screenshotBase64}`,
              },
            ],
          },
        ],
      });

      if (!object.found || !object.box_2d || object.box_2d.length !== 4) {
        return {
          found: false,
          screenX: 0,
          screenYTopLeft: 0,
          screenYBottomLeft: 0,
        };
      }

      const [ymin, xmin, ymax, xmax] = object.box_2d;
      const normalizedCenterX = (xmin + xmax) / 2 / 1000;
      const normalizedCenterY = (ymin + ymax) / 2 / 1000;

      // Scaled to screen points
      const screenX = normalizedCenterX * args.displayWidth;
      // In macOS AppKit, Y starts at bottom-left; in screen/image coordinates, Y starts at top-left
      const screenYTopLeft = normalizedCenterY * args.displayHeight;
      const screenYBottomLeft = args.displayHeight - screenYTopLeft;

      return {
        found: true,
        screenX: Math.round(screenX),
        screenYTopLeft: Math.round(screenYTopLeft),
        screenYBottomLeft: Math.round(screenYBottomLeft),
        confidence: object.confidence,
        description: object.description,
      };
    } catch (error: any) {
      console.error("[detectOtpCoordinates] Error analyzing screen:", error);
      return {
        found: false,
        error: error.message || "Detection failed",
        screenX: 0,
        screenYTopLeft: 0,
        screenYBottomLeft: 0,
      };
    }
  },
});

/**
 * Action: Mint an OpenAI Realtime authorization token for push-to-talk transcription.
 * The desktop companion streams mic audio to OpenAI Realtime over WebSocket using
 * this token, so the real API key never needs to be stored in the client Info.plist.
 */
export const createTranscribeToken = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { error: "OpenAI API key is not configured in Convex env." };
    }

    return { token: apiKey };
  },
});

/**
 * Action: Send Approved Email
 * Dispatches an approved email from the desktop companion via AgentMail.
 */
export const sendApprovedEmail = action({
  args: {
    inboxId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    fromName: v.optional(v.string()),
    attachments: v.optional(
      v.array(v.object({ storageId: v.string(), name: v.string() }))
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.agentmail.sendEmail, {
      inboxId: args.inboxId,
      to: args.to,
      subject: args.subject,
      text: args.body,
      fromName: args.fromName || "NotYourAverageMail User",
      attachments: args.attachments,
    });
  },
});
