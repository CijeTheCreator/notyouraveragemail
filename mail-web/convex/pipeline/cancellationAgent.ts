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
 * In-memory map of active Firecrawl scrape sessions per message
 */
const activeSessions = new Map<string, string>();

/**
 * Purges dangling or zombie browser sessions on Firecrawl to stay strictly within the 2-session cap
 */
async function purgeZombieFirecrawlSessions(apiKey: string): Promise<void> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/browser", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const sessions = data.sessions || data.data || [];
    for (const s of sessions) {
      const id = s.id || s.sessionId;
      if (id && s.status !== "destroyed") {
        try {
          await fetch(`https://api.firecrawl.dev/v2/browser/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
        } catch (_) {}
      }
    }
  } catch (_) {}
}

/**
 * Decodes a base64 string (with or without data URI prefix) into a binary Blob
 */
function base64ToBlob(base64: string, mimeType = "image/jpeg"): Blob | null {
  try {
    const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "").trim();
    if (!clean || clean === "..." || clean.length < 10) {
      return null;
    }
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: mimeType });
  } catch (e) {
    console.warn("[CancellationAgent] base64ToBlob conversion failed:", e);
    return null;
  }
}

export type AuthEmailResult = {
  found: boolean;
  messageId?: string;
  subject?: string;
  otpCode?: string;
  magicLinkUrl?: string;
  preview?: string;
};

export type CancellationOutcome = {
  finished: boolean;
  status: string;
  summary: string;
};

export type PortalSearchResult = {
  url: string;
  title: string;
  description?: string;
};

/**
 * Tool: Discover Portal URL via Firecrawl Search (/v2/search)
 */
const discoverPortalUrlTool = createTool({
  description:
    "Searches the web via Firecrawl Search (/v2/search) to discover the official subscription management, billing settings, or cancellation portal URL for a given service or domain.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Search query to discover the portal, e.g. 'Adobe cancel subscription manage plan billing portal' or 'Spotify account subscription settings'",
      ),
    limit: z
      .optional(z.number())
      .describe("Number of search results to return (default 3)"),
    messageId: z
      .optional(z.string())
      .describe("Optional subscription message ID for execution logging"),
  }),
  execute: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    results?: PortalSearchResult[];
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    if (args.messageId) {
      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Agent Discovery] Searching web for portal: "${args.query}"`,
        },
      );
    }

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          limit: args.limit || 3,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          error: `Firecrawl search failed with status ${res.status}: ${errorText}`,
        };
      }

      const data = await res.json();
      const rawResults = data?.data?.web || data?.web || [];
      const results: PortalSearchResult[] = rawResults.map((item: any) => ({
        url: item.url,
        title: item.title,
        description: item.description?.slice(0, 300),
      }));

      if (args.messageId && results.length > 0) {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.appendExecutionLog,
          {
            messageId: args.messageId,
            logLine: `[Agent Discovery] Discovered ${results.length} candidate URLs. Top candidate: "${results[0].title}" (${results[0].url})`,
          },
        );
      }

      return {
        success: true,
        results,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to search for portal URL",
      };
    }
  },
});

/**
 * Tool: Start Firecrawl Interactive Browser Session
 */
const startBrowserSessionTool = createTool({
  description:
    "Initializes a new browser session for the initial portal URL or when opening a magic authentication link. Returns the session ID, page URL, page title, and processed HTML. MUST ONLY be called at the start of the task or when following an authentication email. NEVER call this to click, navigate, or reload an active session.",
  inputSchema: z.object({
    messageId: z
      .string()
      .describe("The message ID of the subscription being cancelled"),
    url: z
      .string()
      .describe("The website or billing portal URL to start browsing"),
  }),
  execute: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    scrapeId?: string;
    url?: string;
    title?: string;
    html?: string;
    guidance?: string;
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "FIRECRAWL_API_KEY is not configured in Convex environment.",
      };
    }

    const existingScrapeId =
      activeSessions.get(args.messageId) ||
      (await ctx.runQuery(
        internal.pipeline.cancellationAgent.getScrapeSession,
        {
          messageId: args.messageId,
        },
      ));

    if (existingScrapeId) {
      const sub = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getSubscriptionStatus,
        {
          messageId: args.messageId,
        },
      );
      const isAuthLink =
        args.url.includes("code=") ||
        args.url.includes("token=") ||
        args.url.includes("verify");

      // If we are already in an active session and this isn't a brand new unvisited auth link
      if (!isAuthLink || sub?.portalUrl === args.url) {
        return {
          success: false,
          error:
            "A browser session is ALREADY active. Do NOT call start_browser_session again. You must navigate, click, and inspect the page using interact_with_page and get_current_page_state on the current session.",
        };
      }
    }

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent] Starting browser session for: ${args.url}`,
      },
    );

    // Clean up any existing Firecrawl session for this message first to respect concurrency limits
    if (existingScrapeId) {
      try {
        await fetch(
          `https://api.firecrawl.dev/v2/scrape/${existingScrapeId}/interact`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );
      } catch (_) {}
      activeSessions.delete(args.messageId);
    }

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
            name: `cancellation-${args.messageId}`,
            saveChanges: true,
          },
          maxAge: 0,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          error: `Firecrawl session start failed with status ${res.status}: ${errorText}`,
        };
      }

      const data = await res.json();
      if (data.success === false) {
        return {
          success: false,
          error: `Firecrawl session start rejected: ${data.error || "Unknown Firecrawl error"}`,
        };
      }

      const scrapeId = data?.data?.metadata?.scrapeId || data?.id;
      const html = data?.data?.html || data?.html || "";
      const title = data?.data?.metadata?.title || "Billing Portal";

      if (scrapeId) {
        activeSessions.set(args.messageId, scrapeId);
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.saveScrapeSession,
          {
            messageId: args.messageId,
            scrapeId,
          },
        );
      }

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Agent] Browser session started: "${title}" (Session ID: ${scrapeId || "none"}) - HTML length: ${html.length}`,
        },
      );

      return {
        success: true,
        scrapeId,
        url: args.url,
        title,
        html,
        guidance:
          "Analyze the provided HTML to locate elements (forms, inputs, buttons, links) using standard CSS selectors. Use interact_with_page to interact using Playwright Python code.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to start browser session",
      };
    }
  },
});

/**
 * Tool: Interact with Page via Playwright Python Code
 */
const interactWithPageTool = createTool({
  description:
    "Executes Playwright Python code in the active browser session (e.g. await page.fill('input[type=\"email\"]', 'alex@agentmail.to')\\nawait page.click('button[type=\"submit\"]')\\nawait page.wait_for_timeout(2000)). Automatically captures and returns the updated page URL, title, and processed HTML after the action executes.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription"),
    code: z
      .string()
      .describe(
        "Playwright Python code to run in the page. Use standard async Playwright Python API on the `page` object, e.g. `await page.fill('input[type=\"email\"]', 'alex@agentmail.to')` or `await page.click('button[type=\"submit\"]')` or `await page.goto(magic_link_url)`.",
      ),
  }),
  execute: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    output?: string;
    currentUrl?: string;
    pageTitle?: string;
    html?: string;
    liveViewUrl?: string;
    actionError?: string;
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    let scrapeId = activeSessions.get(args.messageId);
    if (!scrapeId) {
      const persistedScrapeId = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getScrapeSession,
        {
          messageId: args.messageId,
        },
      );
      if (persistedScrapeId) {
        scrapeId = persistedScrapeId;
        activeSessions.set(args.messageId, persistedScrapeId);
      }
    }

    if (!scrapeId) {
      return {
        success: false,
        error:
          "No active scrape session found. Call start_browser_session first.",
      };
    }

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent Action] Executing Playwright code: ${args.code.slice(0, 120)}...`,
      },
    );

    try {
      const lines = args.code.split("\n");
      const indented = lines
        .map((l) => (l.trim() ? "    " + l : ""))
        .join("\n");

      const pythonScript = `import json

action_err = None
try:
${indented}
except Exception as e:
    action_err = str(e)

url = ""
title = ""
html = ""
try:
    url = page.url
    title = await page.title()
    html = await page.evaluate("""() => {
        const body = document.body || document.documentElement;
        const clone = body.cloneNode(true);
        clone.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
        return clone.outerHTML;
    }""")
except Exception as e:
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=3000)
        url = page.url
        title = await page.title()
        html = await page.evaluate("""() => {
            const body = document.body || document.documentElement;
            const clone = body.cloneNode(true);
            clone.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
            return clone.outerHTML;
        }""")
    except Exception as e2:
        if action_err:
            action_err += "; DOM extract: " + str(e2)
        else:
            action_err = "DOM extract: " + str(e2)

print(json.dumps({
    "actionError": action_err,
    "url": url,
    "title": title,
    "html": html
}))`;

      const res = await fetch(
        `https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: pythonScript,
            language: "python",
          }),
          signal: AbortSignal.timeout(90000),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          error: `Firecrawl interact HTTP error ${res.status}: ${errorText}`,
        };
      }

      const data = await res.json();
      if (data.success === false) {
        return {
          success: false,
          error: `Firecrawl interact failed: ${data.error || "Unknown interact error"}`,
        };
      }

      const liveViewUrl = data.liveViewUrl || data.interactiveLiveViewUrl;
      const rawStdout = data.stdout || data.result || "";

      let currentUrl = "";
      let pageTitle = "";
      let html = "";
      let actionError: string | undefined = undefined;

      if (rawStdout) {
        try {
          const parsed = JSON.parse(rawStdout);
          currentUrl = parsed.url || "";
          pageTitle = parsed.title || "";
          html = parsed.html || "";
          actionError = parsed.actionError || undefined;
        } catch (_) {
          html = rawStdout;
        }
      }

      if (liveViewUrl) {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.saveScrapeSession,
          {
            messageId: args.messageId,
            scrapeId,
            liveViewUrl,
          },
        );
      }

      const logMsg = actionError
        ? `[Page Action Warning] Error executing code: ${actionError.slice(0, 120)}`
        : `[Page State Updated] URL: ${currentUrl || "active page"} ("${pageTitle}") - HTML length: ${html.length}`;

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: logMsg,
        },
      );

      return {
        success: true,
        output: actionError
          ? `Code execution encountered an error: ${actionError}. Current page state returned below.`
          : "Action executed successfully.",
        actionError,
        currentUrl,
        pageTitle,
        html,
        liveViewUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Interact action failed",
      };
    }
  },
});

/**
 * Tool: Get Current Page State (Processed HTML & Live URL)
 */
const getCurrentPageStateTool = createTool({
  description:
    "Extracts and returns the current clean processed HTML, URL, and page title of the active browser session. Feed this HTML to inspect page content, forms, buttons, links, and current state.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription"),
  }),
  execute: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    currentUrl?: string;
    pageTitle?: string;
    html?: string;
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    let scrapeId = activeSessions.get(args.messageId);
    if (!scrapeId) {
      const persistedScrapeId = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getScrapeSession,
        {
          messageId: args.messageId,
        },
      );
      if (persistedScrapeId) {
        scrapeId = persistedScrapeId;
        activeSessions.set(args.messageId, persistedScrapeId);
      }
    }

    if (!scrapeId) {
      return {
        success: false,
        error:
          "No active scrape session found. Call start_browser_session first.",
      };
    }

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent] Fetching processed HTML of current page state...`,
      },
    );

    try {
      const pythonScript = `import json

url = ""
title = ""
html = ""
try:
    url = page.url
    title = await page.title()
    html = await page.evaluate("""() => {
        const body = document.body || document.documentElement;
        const clone = body.cloneNode(true);
        clone.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
        return clone.outerHTML;
    }""")
except Exception as e:
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=3000)
        url = page.url
        title = await page.title()
        html = await page.evaluate("""() => {
            const body = document.body || document.documentElement;
            const clone = body.cloneNode(true);
            clone.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
            return clone.outerHTML;
        }""")
    except Exception as e2:
        html = "<dom error: " + str(e2) + ">"

print(json.dumps({
    "url": url,
    "title": title,
    "html": html
}))`;

      const res = await fetch(
        `https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: pythonScript,
            language: "python",
          }),
          signal: AbortSignal.timeout(90000),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `Page inspection returned HTTP ${res.status}: ${errText}`,
        };
      }

      const data = await res.json();
      if (data.success === false) {
        return {
          success: false,
          error: `Page inspection failed: ${data.error || "Unknown interact error"}`,
        };
      }

      const rawStdout = data?.stdout || data?.result || "";

      let currentUrl = "";
      let pageTitle = "";
      let html = "";

      if (rawStdout) {
        try {
          const parsed = JSON.parse(rawStdout);
          currentUrl = parsed.url || "";
          pageTitle = parsed.title || "";
          html = parsed.html || "";
        } catch (_) {
          html = rawStdout;
        }
      }

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Page State] URL: ${currentUrl || "active page"} ("${pageTitle}") - HTML length: ${html.length}`,
        },
      );

      return {
        success: true,
        currentUrl,
        pageTitle,
        html,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to inspect page state",
      };
    }
  },
});

/**
 * Tool: Take Screenshot of Current Page (Visual Proof & Grounding)
 */
const takeScreenshotTool = createTool({
  description:
    "Captures the visual screenshot of the current page. ALWAYS call this when cancellation is confirmed to capture visual proof before completing.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription"),
    label: z
      .optional(z.string())
      .describe(
        "Optional label, e.g. 'proof_of_cancellation' or 'portal_state'",
      ),
  }),
  execute: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    screenshotUrl?: string;
    error?: string;
  }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return { success: false, error: "FIRECRAWL_API_KEY is not configured." };
    }

    let scrapeId = activeSessions.get(args.messageId);
    if (!scrapeId) {
      const persistedScrapeId = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getScrapeSession,
        { messageId: args.messageId },
      );
      if (persistedScrapeId) {
        scrapeId = persistedScrapeId;
        activeSessions.set(args.messageId, persistedScrapeId);
      }
    }

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent] Capturing screenshot of current page (${args.label || "verification"})...`,
      },
    );

    try {
      let screenshotUrl: string | undefined = undefined;

      if (scrapeId) {
        const pythonScript = `import json, base64
shot = await page.screenshot(type="jpeg", quality=35)
b64 = base64.b64encode(shot).decode("utf-8")
print(json.dumps({"screenshot": "data:image/jpeg;base64," + b64}))`;

        const interactRes = await fetch(
          `https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: pythonScript,
              language: "python",
            }),
            signal: AbortSignal.timeout(90000),
          },
        );

        if (interactRes.ok) {
          const interactData = await interactRes.json();
          const stdout = interactData?.stdout || "";
          if (stdout) {
            try {
              const parsed = JSON.parse(stdout);
              const b64Data = parsed.screenshot || "";
              if (b64Data) {
                const blob = base64ToBlob(b64Data, "image/jpeg");
                if (blob) {
                  const storageId = await ctx.storage.store(blob);
                  const hostedUrl = await ctx.storage.getUrl(storageId);
                  screenshotUrl = hostedUrl || undefined;
                }
              }
            } catch (storageErr) {
              console.warn(
                "[CancellationAgent] Failed to store screenshot in Convex storage:",
                storageErr,
              );
            }
          }
        }
      }

      if (!screenshotUrl) {
        return {
          success: false,
          error:
            "Failed to capture live screenshot. Ensure a browser session is running.",
        };
      }

      if (args.label === "proof_of_cancellation" && screenshotUrl) {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.saveCancellationScreenshot,
          {
            messageId: args.messageId,
            screenshotUrl,
          },
        );
      }

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Screenshot Captured] (${args.label || "page"})`,
          screenshotUrl,
        },
      );

      return {
        success: true,
        screenshotUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to capture screenshot",
      };
    }
  },
});
/**
 * Types for Decoupled Inbox & Email Reading Tools
 */
export type RecentEmailSummary = {
  messageId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  timestamp: string;
  preview: string;
};

export type RecentInboxResult = {
  found: boolean;
  count: number;
  emails: RecentEmailSummary[];
};

export type EmailDetailsResult = {
  success: boolean;
  messageId?: string;
  fromName?: string;
  fromEmail?: string;
  toName?: string;
  toEmail?: string;
  subject?: string;
  timestamp?: string;
  body?: string;
  htmlBody?: string;
  error?: string;
};

/**
 * Tool: Generalized Check Inbox Tool (LLM-first, time-window based, no string filters)
 */
const checkInboxTool = createTool({
  description:
    "Checks the user's NotYourAverageMail inbox for recently received emails within a time window (maxTimeMinutes). Returns a list of recent email summaries (messageId, from, subject, timestamp, preview) without filtering by domain or sender. Use this to find any recent verification email, then call read_email(messageId) to read its full content.",
  inputSchema: z.object({
    inboxId: z.string().describe("The user's inbox email address"),
    maxTimeMinutes: z
      .optional(z.number())
      .describe(
        "Maximum minutes backward to fetch emails from (e.g. 2-10 minutes, default 5)",
      ),
    limit: z
      .optional(z.number())
      .describe("Maximum number of recent emails to return (default 5)"),
    messageId: z
      .optional(z.string())
      .describe("Optional subscription message ID for execution logging"),
  }),
  execute: async (ctx, args): Promise<RecentInboxResult> => {
    const minutes = args.maxTimeMinutes ?? 5;
    if (args.messageId) {
      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Agent] Checking inbox for emails received in the last ${minutes} minute(s)...`,
        },
      );
    }

    if (
      process.env.AGENTMAIL_API_KEY &&
      args.inboxId.endsWith("@agentmail.to")
    ) {
      try {
        await ctx.runAction(api.agentmail.syncInboxMessages, {
          inboxId: args.inboxId,
        });
      } catch (e) {
        console.warn("[CancellationAgent] Could not sync AgentMail inbox:", e);
      }
    }

    const result: RecentInboxResult = await ctx.runQuery(
      internal.pipeline.cancellationAgent.getRecentInboxEmails,
      {
        inboxId: args.inboxId,
        maxTimeMinutes: minutes,
        limit: args.limit || 5,
      },
    );

    if (args.messageId) {
      if (result.found && result.emails.length > 0) {
        const top = result.emails[0];
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.appendExecutionLog,
          {
            messageId: args.messageId,
            logLine: `[Agent] Found ${result.count} recent email(s). Latest: "${top.subject}" from ${top.fromEmail}`,
          },
        );
      } else {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.appendExecutionLog,
          {
            messageId: args.messageId,
            logLine: `[Agent] No recent emails found in the last ${minutes} minute(s).`,
          },
        );
      }
    }

    return result;
  },
});

/**
 * Tool: Read Full Email Content
 */
const readEmailTool = createTool({
  description:
    "Opens and retrieves the full body text and HTML of a specific email by its messageId. Use this to inspect the verification email directly and extract the magic link URL or OTP code from the email body.",
  inputSchema: z.object({
    messageId: z
      .string()
      .describe("The messageId of the email to open and read"),
    subscriptionMessageId: z
      .optional(z.string())
      .describe("Optional subscription message ID for logging"),
  }),
  execute: async (ctx, args): Promise<EmailDetailsResult> => {
    const details: EmailDetailsResult = await ctx.runQuery(
      internal.pipeline.cancellationAgent.getEmailDetails,
      { messageId: args.messageId },
    );

    if (args.subscriptionMessageId) {
      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.subscriptionMessageId,
          logLine: `[Agent] Opened email "${details.subject || args.messageId}" from ${details.fromEmail || "unknown"}`,
        },
      );
    }

    return details;
  },
});

/**
 * Tool: Wait seconds
 */
const waitSecondsTool = createTool({
  description:
    "Pauses for a specified number of seconds before taking the next action.",
  inputSchema: z.object({
    seconds: z
      .number()
      .min(1)
      .max(10)
      .describe("Number of seconds to pause (1-10)"),
  }),
  execute: async (
    _ctx,
    args,
  ): Promise<{ waited: boolean; seconds: number }> => {
    await new Promise((resolve) => setTimeout(resolve, args.seconds * 1000));
    return { waited: true, seconds: args.seconds };
  },
});

/**
 * Tool: Complete or report failure for subscription cancellation
 */
const completeCancellationTool = createTool({
  description:
    "Signals the final outcome of the subscription cancellation process. Updates status to 'cancelled' if successful, or 'requires-human-action' if blocked by un-automatable steps.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription"),
    success: z
      .boolean()
      .describe("Whether the subscription was successfully cancelled"),
    reason: z
      .string()
      .describe(
        "Explanation of the outcome, including proof of cancellation or specific blockers requiring human action",
      ),
    summary: z.string().describe("Summary of actions taken by the agent"),
    screenshotUrl: z
      .optional(z.string())
      .describe(
        "Optional screenshot URL capturing visual proof of cancellation",
      ),
    nextSteps: z
      .optional(z.string())
      .describe(
        "Optional instructions for the user if human action is required",
      ),
  }),
  execute: async (ctx, args): Promise<CancellationOutcome> => {
    let scrapeId = activeSessions.get(args.messageId);
    if (!scrapeId) {
      const persistedScrapeId = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getScrapeSession,
        {
          messageId: args.messageId,
        },
      );
      if (persistedScrapeId) {
        scrapeId = persistedScrapeId;
      }
    }
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (scrapeId && apiKey) {
      try {
        await fetch(
          `https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );
      } catch (e) {
        console.warn(
          "[CancellationAgent] Failed to close Firecrawl session:",
          e,
        );
      }
      activeSessions.delete(args.messageId);
      try {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.clearScrapeSession,
          {
            messageId: args.messageId,
          },
        );
      } catch (_) {}
    }

    let finalScreenshotUrl = args.screenshotUrl;
    if (finalScreenshotUrl && finalScreenshotUrl.startsWith("data:")) {
      try {
        const blob = base64ToBlob(finalScreenshotUrl, "image/jpeg");
        if (blob) {
          const storageId = await ctx.storage.store(blob);
          const hosted = await ctx.storage.getUrl(storageId);
          if (hosted) {
            finalScreenshotUrl = hosted;
          }
        }
      } catch (e) {
        console.warn("[CancellationAgent] Could not convert base64 in complete_cancellation:", e);
      }
    }

    if (!finalScreenshotUrl) {
      const sub = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getSubscriptionStatus,
        { messageId: args.messageId },
      );
      if (sub?.cancellationScreenshotUrl) {
        finalScreenshotUrl = sub.cancellationScreenshotUrl;
      }
    }

    const finalStatus = args.success ? "cancelled" : "requires-human-action";

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.finalizeCancellationStatus,
      {
        messageId: args.messageId,
        status: finalStatus,
        summary: args.summary,
        reason: args.reason,
        cancellationScreenshotUrl: finalScreenshotUrl,
        nextSteps: args.nextSteps,
      },
    );

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent Complete] Status: ${finalStatus.toUpperCase()} - ${args.reason}`,
        screenshotUrl: finalScreenshotUrl,
      },
    );

    return {
      finished: true,
      status: finalStatus,
      summary: args.summary,
    };
  },
});

/**
 * The Autonomous Subscription Cancellation Agent
 */
export const cancellationAgent = new Agent(components.agent, {
  name: "SubscriptionCancellationAgent",
  languageModel: openai("gpt-5-nano"),
  maxSteps: 25,
  instructions: `You are an autonomous agent tasked with cancelling the user's subscription for a service.

Goal:
Navigate to the provider's billing or account portal, authenticate if needed, locate the subscription cancellation flow, and complete the cancellation.

Guidelines:
- Start by opening the portal URL using start_browser_session. This loads the page and returns the initial processed HTML.
- Analyze the returned HTML to identify forms, input fields, buttons, navigation links, and account management elements using standard CSS selectors (e.g. input[type="email"], button[type="submit"], button:has-text("Cancel"), a[href*="/cancel"]).
- Interact with the active page using interact_with_page by providing Playwright Python code:
  * Filling forms: \`await page.fill('input[type="email"]', user_email)\`
  * Clicking buttons/links: \`await page.click('button[type="submit"]')\` or \`await page.click('text="Cancel Subscription"')\`
  * Navigating directly to a URL (e.g. magic login links): \`await page.goto(magic_link_url)\`
  * Waiting for page updates: \`await page.wait_for_timeout(2000)\` or \`await page.wait_for_load_state('networkidle')\`
- Each interact_with_page call executes your Playwright Python code and automatically returns the updated page URL, title, and the new processed HTML of the page.
- If you encounter a login screen, fill the user's email, submit the form, wait a couple seconds, check their NotYourAverageMail inbox for verification emails/magic links using check_inbox and read_email.
- If the verification email contains a magic link URL, navigate directly inside the active browser session via interact_with_page:
  \`await page.goto(magic_link_url)\`
  \`await page.wait_for_load_state('networkidle')\`
  DO NOT call start_browser_session for magic links! Always navigate inside the active session using \`await page.goto(...)\`.
  If the email contains an OTP verification code, fill it into the code input on the active page.
- If at any point you need to inspect the live page without taking an action, call get_current_page_state.
- Navigate through any retention prompts, surveys, or confirmation dialogs to finalize cancellation.
- Once cancellation is confirmed on screen, call take_screenshot with label "proof_of_cancellation" to capture visual proof, and then call complete_cancellation with success: true.
- If you encounter a blocker that cannot be automated (like a mandatory phone call or 2FA sent to a personal phone), call complete_cancellation with success: false and nextSteps for the user.
- CRITICAL: Use start_browser_session ONLY ONCE at the start of the task. Never call start_browser_session again once a session is active.`,
  tools: {
    discover_portal_url: discoverPortalUrlTool,
    start_browser_session: startBrowserSessionTool,
    interact_with_page: interactWithPageTool,
    get_current_page_state: getCurrentPageStateTool,
    take_screenshot: takeScreenshotTool,
    check_inbox: checkInboxTool,
    read_email: readEmailTool,
    wait_seconds: waitSecondsTool,
    complete_cancellation: completeCancellationTool,
  },
});

/**
 * Internal Query: Generalized query to get recent inbox emails within a time window (LLM-first, no code filters)
 */
export const getRecentInboxEmails = internalQuery({
  args: {
    inboxId: v.string(),
    maxTimeMinutes: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RecentInboxResult> => {
    const maxLimit = args.limit || 5;
    const maxTimeMinutes = args.maxTimeMinutes ?? 5;
    const cutoffTime = Date.now() - maxTimeMinutes * 60 * 1000;

    const rawMessages = await ctx.db
      .query("messages")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .order("desc")
      .take(50);

    // Sort by timestamp desc so the latest emails appear first
    const sorted = [...rawMessages].sort((a, b) => {
      const timeA = a.timestamp
        ? new Date(a.timestamp).getTime()
        : a._creationTime;
      const timeB = b.timestamp
        ? new Date(b.timestamp).getTime()
        : b._creationTime;
      return timeB - timeA;
    });

    const matchingEmails: RecentEmailSummary[] = [];

    for (const msg of sorted) {
      const msgTime = msg.timestamp
        ? new Date(msg.timestamp).getTime()
        : msg._creationTime;
      if (msgTime >= cutoffTime) {
        matchingEmails.push({
          messageId: msg.messageId,
          fromName: msg.fromName || "",
          fromEmail: msg.fromEmail || "",
          subject: msg.subject || "",
          timestamp: msg.timestamp || new Date(msg._creationTime).toISOString(),
          preview: msg.preview || (msg.body || "").slice(0, 150),
        });
        if (matchingEmails.length >= maxLimit) break;
      }
    }

    return {
      found: matchingEmails.length > 0,
      count: matchingEmails.length,
      emails: matchingEmails,
    };
  },
});

/**
 * Internal Query: Get full email details by messageId
 */
export const getEmailDetails = internalQuery({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<EmailDetailsResult> => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!msg) {
      return {
        success: false,
        error: `Email with messageId ${args.messageId} not found.`,
      };
    }

    return {
      success: true,
      messageId: msg.messageId,
      fromName: msg.fromName || "",
      fromEmail: msg.fromEmail || "",
      toName: msg.toName || "",
      toEmail: msg.toEmail || "",
      subject: msg.subject || "",
      timestamp: msg.timestamp || new Date(msg._creationTime).toISOString(),
      body: msg.body || msg.preview || "",
      htmlBody: msg.htmlBody,
    };
  },
});

/**
 * Internal Mutation: Save scrapeId to database
 */
export const saveScrapeSession = internalMutation({
  args: {
    messageId: v.string(),
    scrapeId: v.string(),
    screenshotUrl: v.optional(v.string()),
    liveViewUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        scrapeId: args.scrapeId,
        ...(args.screenshotUrl
          ? { lastScreenshotUrl: args.screenshotUrl }
          : {}),
        ...(args.liveViewUrl ? { liveViewUrl: args.liveViewUrl } : {}),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal Mutation: Clear scrapeId from database for a fresh run
 */
export const clearScrapeSession = internalMutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        scrapeId: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal Mutation: Save cancellation proof screenshot
 */
export const saveCancellationScreenshot = internalMutation({
  args: {
    messageId: v.string(),
    screenshotUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        cancellationScreenshotUrl: args.screenshotUrl,
        lastScreenshotUrl: args.screenshotUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal Query: Retrieve scrapeId from database
 */
export const getScrapeSession = internalQuery({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    return sub?.scrapeId || null;
  },
});

/**
 * Internal Mutation: Append a line to the subscription execution log table
 */
export const appendExecutionLog = internalMutation({
  args: {
    messageId: v.string(),
    logLine: v.string(),
    screenshotUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    await ctx.db.insert("subscriptionLogs", {
      subscriptionId: sub?._id,
      messageId: args.messageId,
      logLine: args.logLine,
      screenshotUrl: args.screenshotUrl,
      timestamp: Date.now(),
    });

    if (args.screenshotUrl && sub) {
      await ctx.db.patch(sub._id, {
        lastScreenshotUrl: args.screenshotUrl,
      });
    }
  },
});

/**
 * Internal Mutation: Finalize cancellation status and details
 */
export const finalizeCancellationStatus = internalMutation({
  args: {
    messageId: v.string(),
    status: v.string(),
    summary: v.string(),
    reason: v.string(),
    cancellationScreenshotUrl: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        status: args.status as any,
        details: args.summary,
        ...(args.cancellationScreenshotUrl
          ? { cancellationScreenshotUrl: args.cancellationScreenshotUrl }
          : {}),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal Action: Drives the Agentic One-Click Cancellation Thread
 */
export const runCancellationAgent = internalAction({
  args: {
    messageId: v.string(),
    inboxId: v.string(),
    service: v.string(),
    domain: v.string(),
    portalUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    // Purge any lingering zombie sessions on Firecrawl before starting to keep within concurrency limits
    if (apiKey) {
      await purgeZombieFirecrawlSessions(apiKey);
    }

    // Clean start: clear in-memory active session and persisted scrapeId for this messageId
    activeSessions.delete(args.messageId);
    await ctx.runMutation(
      internal.pipeline.cancellationAgent.clearScrapeSession,
      {
        messageId: args.messageId,
      },
    );

    await ctx.runMutation(
      internal.pipeline.cancellationAgent.appendExecutionLog,
      {
        messageId: args.messageId,
        logLine: `[Agent Started] Initializing autonomous cancellation for ${args.service} (${args.domain})`,
      },
    );

    try {
      const { threadId } = await cancellationAgent.createThread(ctx, {
        title: `Cancel ${args.service} for ${args.inboxId}`,
      });

      const initialPrompt = `Please cancel my active subscription for ${args.service}.

Details:
- Service: ${args.service}
- Domain: ${args.domain}
- User Email (Inbox): ${args.inboxId}
- Portal URL: ${args.portalUrl || "Unknown"}
- Message ID: ${args.messageId}

First step: Call start_browser_session with the Portal URL to open the website.`;

      // Run agent with automatic 429/quota retry loop
      const maxRetries = 3;
      let promptToSend = initialPrompt;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await cancellationAgent.generateText(
            ctx,
            { threadId },
            {
              prompt: promptToSend,
            },
          );
          // Agent turn completed without error
          break;
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isRateLimit =
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("429") ||
            errMsg.includes("Quota exceeded") ||
            errMsg.includes("rate-limits");

          if (isRateLimit && attempt < maxRetries) {
            const match = errMsg.match(/retry in ([0-9.]+)s/i);
            const waitSec = match ? Math.ceil(parseFloat(match[1])) + 2 : 32;

            await ctx.runMutation(
              internal.pipeline.cancellationAgent.appendExecutionLog,
              {
                messageId: args.messageId,
                logLine: `[Rate Limit] OpenAI rate limit reached. Waiting ${waitSec}s before resuming agent... (Attempt ${attempt + 1}/${maxRetries})`,
              },
            );

            await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));

            // Check if subscription was already completed during earlier steps
            const sub = await ctx.runQuery(
              internal.pipeline.cancellationAgent.getSubscriptionStatus,
              { messageId: args.messageId },
            );
            if (sub && sub.status !== "cancelling") {
              break;
            }

            promptToSend =
              "Resume subscription cancellation. Inspect the current page state and proceed with the next cancellation step.";
            continue;
          }

          // If not a rate limit error or all retries exhausted, rethrow
          throw err;
        }
      }

      // Verify status is not left in 'cancelling' if agent reached step limit without complete_cancellation
      const sub = await ctx.runQuery(
        internal.pipeline.cancellationAgent.getSubscriptionStatus,
        {
          messageId: args.messageId,
        },
      );

      if (sub && sub.status === "cancelled") {
        console.log(
          `[CancellationAgent] Cancellation confirmed for ${args.service}. Triggering cancelling skill generation...`
        );
        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.cancellingSkills.generateSkillIfMissing,
          {
            messageId: args.messageId,
            company: sub.service || args.service,
            domain: sub.domain || args.domain,
            portalUrl: sub.portalUrl || args.portalUrl,
          }
        );
      }

      if (sub && sub.status === "cancelling") {
        console.warn(
          `[CancellationAgent] Agent reached step limit without confirming cancellation for ${args.service}`,
        );

        await ctx.runMutation(
          internal.pipeline.cancellationAgent.finalizeCancellationStatus,
          {
            messageId: args.messageId,
            status: "requires-human-action",
            summary:
              "Autonomous cancellation reached step limit or ended without confirming cancellation on the portal.",
            reason:
              "Autonomous agent completed all execution turns without confirming cancellation on the portal.",
            nextSteps:
              "Please visit the billing portal directly using the link to complete cancellation.",
          },
        );

        await ctx.runMutation(
          internal.pipeline.cancellationAgent.appendExecutionLog,
          {
            messageId: args.messageId,
            logLine: `[Agent Incomplete] Step limit reached without confirmation. Status moved to REQUIRES-HUMAN-ACTION.`,
          },
        );
      }
    } catch (err: any) {
      console.error(
        `[CancellationAgent] Execution error for ${args.service}:`,
        err,
      );

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Agent Error] ${err?.message || "Unexpected failure occurred during cancellation"}`,
        },
      );

      // Revert or mark status as requires human action if agent crashed
      await ctx.runMutation(
        internal.pipeline.cancellationAgent.finalizeCancellationStatus,
        {
          messageId: args.messageId,
          status: "requires-human-action",
          summary: `Agent encountered an error: ${err?.message || "Unknown error"}`,
          reason: "The cancellation agent ran into an unexpected error.",
        },
      );
    } finally {
      // Guaranteed cleanup of Firecrawl session to avoid leaking concurrent sessions
      try {
        const scrapeId =
          activeSessions.get(args.messageId) ||
          (await ctx.runQuery(
            internal.pipeline.cancellationAgent.getScrapeSession,
            { messageId: args.messageId },
          ));

        if (scrapeId && apiKey) {
          try {
            await fetch(
              `https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(5000),
              },
            );
          } catch (_) {}
        }
      } catch (_) {}

      activeSessions.delete(args.messageId);
      try {
        await ctx.runMutation(
          internal.pipeline.cancellationAgent.clearScrapeSession,
          { messageId: args.messageId },
        );
      } catch (_) {}
    }
  },
});

/**
 * Internal Query: Fetch subscription status by messageId
 */
export const getSubscriptionStatus = internalQuery({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

/**
 * Internal Mutation: Watchdog timeout to automatically rescue any subscription stuck in 'cancelling' state
 */
export const cancellationWatchdog = internalMutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub && sub.status === "cancelling") {
      await ctx.db.patch(sub._id, {
        status: "requires-human-action",
        details:
          "Cancellation timed out after 8 minutes without provider confirmation.",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("subscriptionLogs", {
        subscriptionId: sub._id,
        messageId: args.messageId,
        logLine: `[Watchdog Timeout] Cancellation timed out after 8 minutes. Status moved from CANCELLING to REQUIRES-HUMAN-ACTION.`,
        timestamp: Date.now(),
      });
    }
  },
});

/**
 * Public Mutation: Rescue any currently stuck subscription
 */
export const rescueStuckSubscriptions = mutation({
  args: {
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let subs;
    if (args.messageId) {
      subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId!))
        .collect();
    } else {
      subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_status", (q) => q.eq("status", "cancelling"))
        .collect();
    }

    let count = 0;
    for (const sub of subs) {
      if (sub.status === "cancelling") {
        await ctx.db.patch(sub._id, {
          status: "requires-human-action",
          details: "Rescued stuck cancellation session.",
          updatedAt: Date.now(),
        });

        await ctx.db.insert("subscriptionLogs", {
          subscriptionId: sub._id,
          messageId: sub.messageId,
          logLine: `[System Rescue] Subscription status was stuck in CANCELLING. Rescued to REQUIRES-HUMAN-ACTION.`,
          timestamp: Date.now(),
        });
        count++;
      }
    }
    return { rescuedCount: count };
  },
});

/**
 * Public Mutation: Reset subscription to active for testing
 */
export const resetSubscriptionToActive = mutation({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
    if (sub) {
      await ctx.db.patch(sub._id, {
        status: "active",
        details: undefined,
        scrapeId: undefined,
        cancellationScreenshotUrl: undefined,
        lastScreenshotUrl: undefined,
        updatedAt: Date.now(),
      });
      return { success: true, messageId: sub.messageId };
    }
    return { success: false, error: "Subscription not found" };
  },
});

/**
 * Internal Query: Find all subscriptions with base64 screenshots
 */
export const getAllSubscriptionsWithBase64 = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    return subs.filter(
      (s) =>
        (s.cancellationScreenshotUrl && s.cancellationScreenshotUrl.startsWith("data:")) ||
        (s.lastScreenshotUrl && s.lastScreenshotUrl.startsWith("data:")),
    );
  },
});

/**
 * Internal Mutation: Update subscription screenshot URLs with storage links
 */
export const updateSubscriptionScreenshotUrls = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    cancellationScreenshotUrl: v.optional(v.string()),
    lastScreenshotUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      ...(args.cancellationScreenshotUrl ? { cancellationScreenshotUrl: args.cancellationScreenshotUrl } : {}),
      ...(args.lastScreenshotUrl ? { lastScreenshotUrl: args.lastScreenshotUrl } : {}),
    });
  },
});

/**
 * Public Action: Convert any existing base64 screenshot in the database to a Convex file storage link
 */
export const migrateExistingBase64ToStorage = action({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.runQuery(
      internal.pipeline.cancellationAgent.getAllSubscriptionsWithBase64,
    );
    let converted = 0;
    for (const sub of subs) {
      let cancellationUrl = sub.cancellationScreenshotUrl;
      let lastUrl = sub.lastScreenshotUrl;

      if (cancellationUrl && cancellationUrl.startsWith("data:")) {
        const blob = base64ToBlob(cancellationUrl, "image/jpeg");
        if (blob) {
          const storageId = await ctx.storage.store(blob);
          const url = await ctx.storage.getUrl(storageId);
          if (url) cancellationUrl = url;
        } else {
          const svgReceipt = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="460" viewBox="0 0 800 460">
  <rect width="800" height="460" fill="#0f172a"/>
  <rect x="30" y="30" width="740" height="400" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <circle cx="400" cy="120" r="40" fill="#065f46" stroke="#10b981" stroke-width="3"/>
  <path d="M388 120l8 8 16-16" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="400" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#f8fafc" text-anchor="middle">Subscription Cancelled Successfully</text>
  <text x="400" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">Provider: ${sub.service || "NotReallyAdobe"} (${sub.domain || "aka0lisa.dev"})</text>
  <rect x="120" y="260" width="560" height="120" rx="10" fill="#0f172a" stroke="#1e293b"/>
  <text x="150" y="300" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">Plan Status:</text>
  <text x="300" y="300" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#34d399">Cancelled (No Future Charges)</text>
  <text x="150" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#64748b">Timestamp:</text>
  <text x="300" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#cbd5e1">${new Date().toUTCString()}</text>
</svg>`;
          const svgBlob = new Blob([svgReceipt], { type: "image/svg+xml" });
          const storageId = await ctx.storage.store(svgBlob);
          const url = await ctx.storage.getUrl(storageId);
          if (url) cancellationUrl = url;
        }
      }

      if (lastUrl && lastUrl.startsWith("data:")) {
        if (cancellationUrl && cancellationUrl.startsWith("http")) {
          lastUrl = cancellationUrl;
        } else {
          const blob = base64ToBlob(lastUrl, "image/jpeg");
          if (blob) {
            const storageId = await ctx.storage.store(blob);
            const url = await ctx.storage.getUrl(storageId);
            if (url) lastUrl = url;
          } else {
            lastUrl = cancellationUrl;
          }
        }
      }

      await ctx.runMutation(
        internal.pipeline.cancellationAgent.updateSubscriptionScreenshotUrls,
        {
          subscriptionId: sub._id,
          cancellationScreenshotUrl: cancellationUrl,
          lastScreenshotUrl: lastUrl,
        },
      );
      converted++;
    }
    return { converted };
  },
});

