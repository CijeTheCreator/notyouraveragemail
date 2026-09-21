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

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * In-memory map of active Firecrawl scrape sessions per broker key (inboxId:brokerId)
 */
const activeRemovalSessions = new Map<string, string>();

/**
 * Converts a base64 data string to a Blob
 */
function base64ToBlob(base64: string, mimeType = "image/jpeg"): Blob | null {
  try {
    const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "").trim();
    if (!clean || clean === "..." || clean.length < 10) return null;
    if (typeof Buffer !== "undefined") {
      const buf = Buffer.from(clean, "base64");
      return new Blob([buf], { type: mimeType });
    }
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: mimeType });
  } catch (e) {
    console.warn("[DataRemovalAgent] base64ToBlob failed:", e);
    return null;
  }
}

/**
 * Tool: Discover Opt-Out or Suppression URL via Firecrawl Search
 */
const discoverOptOutPortalTool = createTool({
  description:
    "Searches the web via Firecrawl Search to discover the official data removal, opt-out, or privacy suppression page for a data broker or company.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'Spokeo opt out removal suppression page'"),
    inboxId: z.string().describe("The user's inbox ID"),
    brokerId: z.string().describe("The broker ID"),
    messageId: z.optional(z.string()).describe("Optional message ID"),
  }),
  execute: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Search] Searching web: "${args.query}"`,
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
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        return { success: false, error: `Firecrawl search failed: HTTP ${res.status}` };
      }

      const data = await res.json();
      const results = (data?.data?.web || data?.web || []).map((item: any) => ({
        url: item.url,
        title: item.title,
        description: item.description,
      }));

      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Search] Found ${results.length} results (Top: ${results[0]?.url || "none"})`,
      });

      return { success: true, results };
    } catch (err: any) {
      return { success: false, error: err?.message || "Search failed" };
    }
  },
});

/**
 * Tool: Start Browser Session via Firecrawl
 */
const startBrowserSessionTool = createTool({
  description:
    "Initializes a new browser session to inspect or click a broker's confirmation link or opt-out page. Returns the page title, URL, and processed HTML.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Data broker ID"),
    url: z.string().describe("URL to navigate to (e.g. confirmation link or opt-out portal)"),
    messageId: z.optional(z.string()).describe("Optional message ID"),
  }),
  execute: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    const sessionKey = `${args.inboxId}:${args.brokerId}`;
    const existingScrapeId = activeRemovalSessions.get(sessionKey);
    if (existingScrapeId) {
      try {
        await fetch(`https://api.firecrawl.dev/v2/scrape/${existingScrapeId}/interact`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (_) {}
      activeRemovalSessions.delete(sessionKey);
    }

    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Browser] Opening browser for URL: ${args.url}`,
    });

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: args.url,
          formats: ["html"],
          onlyMainContent: false,
          profile: {
            name: `removal-${args.brokerId}`,
            saveChanges: true,
          },
          maxAge: 0,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Firecrawl failed (HTTP ${res.status}): ${errorText}` };
      }

      const data = await res.json();
      const scrapeId = data?.data?.metadata?.scrapeId || data?.id;
      const html = data?.data?.html || data?.html || "";
      const title = data?.data?.metadata?.title || "Data Removal Portal";

      if (scrapeId) {
        activeRemovalSessions.set(sessionKey, scrapeId);
      }

      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Browser] Loaded page: "${title}" (Scrape ID: ${scrapeId || "none"})`,
      });

      return {
        success: true,
        scrapeId,
        url: args.url,
        title,
        html: html.slice(0, 10000),
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to start browser session" };
    }
  },
});

/**
 * Tool: Interact with Page via Playwright code
 */
const interactWithPageTool = createTool({
  description:
    "Executes Playwright Python interactions (click, fill, goto, wait) in the active browser session. Returns updated page HTML and title.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    code: z.string().describe("Playwright Python interaction code, e.g. await page.click('button:has-text(\"Confirm\")')"),
    messageId: z.optional(z.string()).describe("Optional message ID"),
  }),
  execute: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const sessionKey = `${args.inboxId}:${args.brokerId}`;
    const scrapeId = activeRemovalSessions.get(sessionKey);

    if (!apiKey || !scrapeId) {
      return { success: false, error: "No active browser session found to interact with." };
    }

    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Browser] Executing interaction: ${args.code.slice(0, 80)}`,
    });

    try {
      const res = await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: args.code }),
        signal: AbortSignal.timeout(45000),
      });

      if (!res.ok) {
        return { success: false, error: `Interaction failed: HTTP ${res.status}` };
      }

      const data = await res.json();
      const html = data?.data?.html || data?.html || "";
      const title = data?.data?.metadata?.title || "Page Updated";

      return {
        success: true,
        title,
        html: html.slice(0, 10000),
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Interaction failed" };
    }
  },
});

/**
 * Tool: Get Current Page State
 */
const getCurrentPageStateTool = createTool({
  description: "Fetches current page HTML, title, and URL without taking any click or typing action.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    messageId: z.optional(z.string()).describe("Optional message ID"),
  }),
  execute: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const sessionKey = `${args.inboxId}:${args.brokerId}`;
    const scrapeId = activeRemovalSessions.get(sessionKey);

    if (!apiKey || !scrapeId) {
      return { success: false, error: "No active browser session." };
    }

    try {
      const res = await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "url = page.url\ntitle = await page.title()\ncontent = await page.content()",
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) return { success: false, error: `Failed: HTTP ${res.status}` };
      const data = await res.json();
      return {
        success: true,
        html: (data?.data?.html || data?.html || "").slice(0, 10000),
      };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },
});

/**
 * Tool: Take Screenshot and save proof to storage
 */
const takeScreenshotTool = createTool({
  description: "Captures a screenshot of the active browser session and saves it as proof of data deletion or opt-out.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    label: z.string().describe("Label for screenshot, e.g. 'opt_out_confirmed'"),
    messageId: z.optional(z.string()).describe("Optional message ID"),
  }),
  execute: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const sessionKey = `${args.inboxId}:${args.brokerId}`;
    let scrapeId = activeRemovalSessions.get(sessionKey);

    if (!scrapeId) {
      for (const [k, v] of activeRemovalSessions.entries()) {
        if (k.includes(args.brokerId)) {
          scrapeId = v;
          break;
        }
      }
    }

    if (!apiKey || !scrapeId) {
      console.warn(`[takeScreenshotTool] No active session found. sessionKey=${sessionKey}, mapKeys=${Array.from(activeRemovalSessions.keys()).join(",")}`);
      return { success: false, error: "No active browser session for screenshot." };
    }

    try {
      let hostedUrl: string | null = null;
      const pythonScript = `import json, base64
shot = await page.screenshot(type="jpeg", quality=40)
b64 = base64.b64encode(shot).decode("utf-8")
print(json.dumps({"screenshot": "data:image/jpeg;base64," + b64}))`;

      const res = await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: pythonScript,
          language: "python",
        }),
        signal: AbortSignal.timeout(60000),
      });

      console.log(`[takeScreenshotTool] Firecrawl response status: ${res.status}`);

      if (res.ok) {
        const interactData = await res.json();
        const stdout = interactData?.stdout || "";
        console.log(`[takeScreenshotTool] stdout length: ${stdout.length}`);
        if (stdout) {
          try {
            const parsed = JSON.parse(stdout);
            const b64Data = parsed.screenshot || "";
            if (b64Data) {
              const blob = base64ToBlob(b64Data, "image/jpeg");
              if (blob) {
                const storageId = await ctx.storage.store(blob);
                hostedUrl = await ctx.storage.getUrl(storageId);
                console.log(`[takeScreenshotTool] Successfully stored screenshot: ${hostedUrl}`);
              }
            }
          } catch (storageErr) {
            console.warn("[DataRemovalAgent] Failed to parse/store screenshot:", storageErr);
          }
        }
      } else {
        const errText = await res.text();
        console.warn(`[takeScreenshotTool] Firecrawl interact failed (${res.status}):`, errText);
      }

      if (hostedUrl) {
        await ctx.runMutation(internal.dataBrokers.updateRemovalScreenshot, {
          inboxId: args.inboxId,
          brokerId: args.brokerId,
          screenshotUrl: hostedUrl,
        });
      }

      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Screenshot] Captured ${args.label} proof`,
        screenshotUrl: hostedUrl || undefined,
      });

      return { success: true, screenshotUrl: hostedUrl || undefined };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },
});

/**
 * Tool: Check Inbox for secondary verification emails
 */
const checkInboxTool = createTool({
  description: "Checks user's NotYourAverageMail inbox for verification emails, confirmation links, or security codes sent by the broker.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    maxTimeMinutes: z.optional(z.number()).describe("Lookback window in minutes (default 10)"),
  }),
  execute: async (ctx, args) => {
    const result: any = await ctx.runQuery(
      internal.pipeline.cancellationAgent.getRecentInboxEmails,
      {
        inboxId: args.inboxId,
        maxTimeMinutes: args.maxTimeMinutes || 10,
        limit: 5,
      }
    );

    return result;
  },
});

/**
 * Tool: Read full email
 */
const readEmailTool = createTool({
  description: "Reads the full body and details of an email in the inbox.",
  inputSchema: z.object({
    messageId: z.string().describe("The messageId to read"),
  }),
  execute: async (ctx, args) => {
    const details: any = await ctx.runQuery(
      internal.pipeline.cancellationAgent.getEmailDetails,
      { messageId: args.messageId }
    );

    return details;
  },
});

/**
 * Tool: Send follow-up reply email via AgentMail API
 */
const sendReplyEmailTool = createTool({
  description:
    "Sends an outbound email reply via the user's AgentMail inbox. Use this if the broker requires an email reply confirming your deletion request.",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    toEmail: z.string().describe("Recipient broker email address"),
    subject: z.string().describe("Email subject"),
    textBody: z.string().describe("Email message body"),
    fromName: z.string().describe("Sender's full name"),
    messageId: z.optional(z.string()).describe("Optional message ID being replied to"),
  }),
  execute: async (ctx, args) => {
    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Email] Sending reply to ${args.toEmail}: "${args.subject}"`,
    });

    try {
      const res: any = await ctx.runAction(api.agentmail.sendEmail, {
        inboxId: args.inboxId,
        to: args.toEmail,
        subject: args.subject,
        text: args.textBody,
        fromName: args.fromName,
      });

      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Email] Reply sent successfully (Message ID: ${res?.messageId || "sent"})`,
      });

      return { success: true, messageId: res?.messageId };
    } catch (err: any) {
      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Email] Failed to send reply: ${err?.message}`,
      });
      return { success: false, error: err?.message };
    }
  },
});

/**
 * Tool: Complete Removal
 */
const completeRemovalTool = createTool({
  description:
    "Finalizes the removal processing for this broker. Call this when the request is confirmed deleted (completed), when it is in progress with an acknowledgment (in_progress), or when it requires human intervention like ID upload or phone verification (requires-human-action).",
  inputSchema: z.object({
    inboxId: z.string().describe("User's inbox ID"),
    brokerId: z.string().describe("Broker ID"),
    status: z
      .enum(["completed", "in_progress", "requires-human-action"])
      .describe("Final status"),
    reason: z.string().describe("Reason for this status"),
    manualActionUrl: z
      .optional(z.string())
      .describe("If requires-human-action, the direct link where the user must upload ID or complete the form"),
    manualActionReason: z
      .optional(z.string())
      .describe("If requires-human-action, the specific requirement (e.g. 'Photo ID upload required')"),
    screenshotUrl: z.optional(z.string()).describe("Proof screenshot URL if taken"),
    messageId: z.optional(z.string()).describe("Message ID"),
  }),
  execute: async (ctx, args) => {
    // Close any active Firecrawl session
    const sessionKey = `${args.inboxId}:${args.brokerId}`;
    const scrapeId = activeRemovalSessions.get(sessionKey);
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (scrapeId && apiKey) {
      try {
        await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (_) {}
      activeRemovalSessions.delete(sessionKey);
    }

    // Resolve screenshot URL: check if valid http URL or fallback to existing record in dataRemovals
    let finalScreenshotUrl =
      args.screenshotUrl && args.screenshotUrl.startsWith("http")
        ? args.screenshotUrl
        : undefined;

    if (!finalScreenshotUrl) {
      const existingRecord = await ctx.runQuery(internal.dataBrokers.getUserRemoval, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
      });
      if (existingRecord?.screenshotUrl && existingRecord.screenshotUrl.startsWith("http")) {
        finalScreenshotUrl = existingRecord.screenshotUrl;
      }
    }

    await ctx.runMutation(internal.dataBrokers.updateRemovalStatus, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      status: args.status,
      manualActionUrl: args.manualActionUrl,
      manualActionReason: args.manualActionReason,
      agentNotes: args.reason,
      screenshotUrl: finalScreenshotUrl,
      lastMessageId: args.messageId,
    });

    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Complete] Status set to: ${args.status.toUpperCase()} - ${args.reason}`,
      screenshotUrl: finalScreenshotUrl,
    });

    if (args.status === "completed") {
      try {
        const broker = await ctx.runQuery(internal.dataBrokers.getBroker, {
          brokerId: args.brokerId,
        });
        const brokerName = broker?.name || args.brokerId;
        const cleanDomain = broker?.website
          ? broker.website.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]
          : `${args.brokerId}.com`;
        const optOutUrl = broker?.optOutUrl || undefined;

        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.optOutSkills.generateSkillIfMissing,
          {
            inboxId: args.inboxId,
            brokerId: args.brokerId,
            name: brokerName,
            domain: cleanDomain,
            optOutUrl,
            messageId: args.messageId,
          }
        );
      } catch (triggerErr) {
        console.warn("[DataRemovalAgent] Could not trigger skill generation:", triggerErr);
      }
    }

    return {
      finished: true,
      status: args.status,
      reason: args.reason,
    };
  },
});

/**
 * The Convex Data Removal Agent
 */
export const dataRemovalAgent = new Agent(components.agent, {
  name: "DataRemovalAgent",
  languageModel: openai("gpt-5-nano"),
  maxSteps: 20,
  instructions: `You are an autonomous privacy agent processing a data deletion request for a data broker on behalf of the user.

Your Goal:
Resolve inbound communications from data brokers regarding deletion requests, following up automatically whenever possible and escalating to the user ONLY when strictly necessary.

Protocol:
1. Analyze the broker's message:
   - If the broker has already completed the removal / erasure ("Your data has been removed", "Opt-out confirmed"):
     Call complete_removal with status: 'completed' and a clear summary.
   - If the broker confirms receipt and states it will be processed in X days:
     Call complete_removal with status: 'in_progress' and note the processing window.
   - If the email contains a confirmation link or verification button:
     a. Use start_browser_session to open the link or confirmation portal.
     b. Inspect the HTML. If there is a "Confirm", "Verify", or "Opt-Out" button or link, interact with it using interact_with_page.
     c. Call take_screenshot with label: 'proof_of_erasure' to capture visual proof.
     d. Once confirmed, call complete_removal with status: 'completed' (or 'in_progress') and pass the screenshotUrl returned by take_screenshot.
   - If the broker asks for a simple email reply confirming the request:
     Use send_reply_email to send a polite confirmation referencing the user's name and request.
     Call complete_removal with status: 'in_progress'.
   - If the broker demands mandatory government photo ID upload, credit card verification, a phone call, or a manual CAPTCHA that cannot be automated:
     Call complete_removal with status: 'requires-human-action', specify the exact manualActionReason (e.g. "Government ID upload required"), and provide the manualActionUrl.

Always log your actions clearly and complete the task decisively.`,
  tools: {
    discover_opt_out_portal: discoverOptOutPortalTool,
    start_browser_session: startBrowserSessionTool,
    interact_with_page: interactWithPageTool,
    get_current_page_state: getCurrentPageStateTool,
    take_screenshot: takeScreenshotTool,
    check_inbox: checkInboxTool,
    read_email: readEmailTool,
    send_reply_email: sendReplyEmailTool,
    complete_removal: completeRemovalTool,
  },
});

/**
 * Internal Action: Runs the Data Removal Agent on an inbound broker email
 */
export const runRemovalAgent = internalAction({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
    messageId: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),
    subject: v.string(),
    body: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const broker = await ctx.runQuery(internal.dataBrokers.getBroker, {
      brokerId: args.brokerId,
    });

    const brokerName = broker?.name || args.brokerId;

    await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: `[Agent Triggered] Received message from "${args.fromName}" <${args.fromEmail}>: "${args.subject}"`,
    });

    const prompt = `Process this inbound email regarding a data deletion request for data broker: ${brokerName} (brokerId: "${args.brokerId}").

User Information:
- Full Name: ${args.userName}
- Inbox / Email: ${args.inboxId}

Inbound Email:
- Message ID: ${args.messageId}
- From: ${args.fromName} <${args.fromEmail}>
- Subject: ${args.subject}
- Body:
${args.body.slice(0, 4000)}

Please analyze this response and take all necessary agent actions to complete the removal or follow up. If an action is required, use your tools (start browser session, interact with page, reply, or mark requires-human-action).`;

    try {
      const { threadId } = await dataRemovalAgent.createThread(ctx);
      await dataRemovalAgent.generateText(
        ctx,
        { threadId },
        {
          prompt,
        }
      );
    } catch (err: any) {
      console.error(`[DataRemovalAgent] Error running agent for broker ${args.brokerId}:`, err);
      await ctx.runMutation(internal.dataBrokers.appendRemovalLog, {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        messageId: args.messageId,
        logLine: `[Agent Error] ${err?.message || "Unknown agent failure"}`,
      });
    }
  },
});
