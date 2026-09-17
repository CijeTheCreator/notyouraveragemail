import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { Agent, createTool } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * In-memory map of active Firecrawl discovery scrape sessions per message
 */
const activeDiscoverySessions = new Map<string, string>();

/**
 * Helper: Extract all URLs from email text and HTML
 */
function extractUrlsFromEmail(text?: string, html?: string): string[] {
  const urls = new Set<string>();
  const urlRegex = /https?:\/\/[^\s"'<>)]+/gi;
  if (text) {
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      urls.add(match[0]);
    }
  }
  if (html) {
    const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      urls.add(match[1]);
    }
  }
  return Array.from(urls);
}

/**
 * Tool: Start interactive browser session on Firecrawl
 */
const startBrowserSessionTool = createTool({
  description:
    "Starts a new interactive browser session on the target URL (e.g. the service homepage, a link from the email, or candidate login page). Returns the page title, URL, and visible content.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription being investigated"),
    url: z.string().describe("The URL to load in the browser"),
  }),
  execute: async (ctx, args): Promise<{ scrapeId: string; currentUrl: string; title: string; markdown: string }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not configured.");
    }

    // Clean up any pre-existing discovery session for this message
    const prevScrapeId = activeDiscoverySessions.get(args.messageId);
    if (prevScrapeId) {
      try {
        await fetch(`https://api.firecrawl.dev/v2/scrape/${prevScrapeId}/interact`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (_) {}
      activeDiscoverySessions.delete(args.messageId);
    }

    await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
      messageId: args.messageId,
      logLine: `[Auth Discovery] Starting browser session on: ${args.url}`,
    });

    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: args.url,
        formats: ["markdown"],
        waitFor: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Firecrawl scrape failed with status ${res.status}`);
    }

    const data = await res.json();
    const scrapeId = data.data?.metadata?.scrapeId || data.id || data.data?.id;
    if (!scrapeId) {
      throw new Error("Firecrawl did not return an interactive session ID.");
    }

    activeDiscoverySessions.set(args.messageId, scrapeId);

    const title = data.data?.metadata?.title || "Web Page";
    const currentUrl = data.data?.metadata?.sourceURL || args.url;
    const markdown = (data.data?.markdown || "").slice(0, 4000);

    await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
      messageId: args.messageId,
      logLine: `[Auth Discovery] Loaded: "${title}" (${currentUrl})`,
    });

    return { scrapeId, currentUrl, title, markdown };
  },
});

/**
 * Tool: Interact with the page (click links, enter email, navigate)
 */
const interactWithPageTool = createTool({
  description:
    "Executes an action on the currently loaded page (e.g. clicking 'Sign In', 'Log In', 'Account', or entering text into an input).",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription being investigated"),
    action: z
      .string()
      .describe(
        "Clear instruction for the browser action, e.g. 'Click the Sign In link in the navigation header' or 'Enter test@example.com into email input and click Continue'"
      ),
  }),
  execute: async (ctx, args): Promise<{ success: boolean; result: string; currentUrl?: string }> => {
    const scrapeId = activeDiscoverySessions.get(args.messageId);
    if (!scrapeId) {
      throw new Error("No active browser session found. Call start_browser_session first.");
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is missing.");
    }

    await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
      messageId: args.messageId,
      logLine: `[Auth Discovery Action] ${args.action}`,
    });

    const response = await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: args.action }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Interact request failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = data.data?.response || data.response || "Action executed";

    return {
      success: true,
      result,
      currentUrl: data.data?.metadata?.sourceURL,
    };
  },
});

/**
 * Tool: Get current page state
 */
const getCurrentPageStateTool = createTool({
  description:
    "Inspects the current page state, returning the current URL, page headings, visible buttons, and authentication form fields (e.g. email, password, SSO buttons, magic link text).",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription being investigated"),
  }),
  execute: async (ctx, args): Promise<{ currentUrl?: string; description: string }> => {
    const scrapeId = activeDiscoverySessions.get(args.messageId);
    if (!scrapeId) {
      throw new Error("No active browser session found. Call start_browser_session first.");
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    const response = await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "Describe the current page: What is the current URL? What form fields are present (email input, password input)? Are there buttons for 'Sign in with email link', 'Send OTP code', Apple, Microsoft, or third-party SSO?",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to inspect current page state.");
    }

    const data = await response.json();
    const description = data.data?.response || data.response || "No description available.";

    return {
      currentUrl: data.data?.metadata?.sourceURL,
      description,
    };
  },
});

/**
 * Tool: Web search for discovering login or account portals
 */
const searchWebTool = createTool({
  description:
    "Searches the web using Firecrawl search to discover official login pages, billing URLs, or sign-in portals for a service.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'NotReallyAdobe sign in login portal'"),
    limit: z.optional(z.number()).describe("Number of results to return (default 3)"),
  }),
  execute: async (_ctx, args): Promise<{ query: string; results: Array<{ title: string; url: string; description?: string }> }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is missing.");
    }

    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: args.query,
        limit: args.limit || 3,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Firecrawl search failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data.data?.web || data.data || [];
    const results = Array.isArray(rawItems)
      ? rawItems.slice(0, args.limit || 3).map((item: any) => ({
          title: item.title || "",
          url: item.url || "",
          description: item.description || item.snippet || "",
        }))
      : [];

    return { query: args.query, results };
  },
});

/**
 * Tool: Conclude authentication discovery assessment
 */
const concludeAuthDiscoveryTool = createTool({
  description:
    "Finalizes the investigation. Submits whether the service supports passwordless sign-in (magic link or email OTP) and updates the subscription record so NotYourAverageMail knows if 'One-Click Cancel' can be used.",
  inputSchema: z.object({
    messageId: z.string().describe("The message ID of the subscription"),
    service: z.string().describe("The name of the service"),
    domain: z.string().describe("The domain of the service"),
    supportsPasswordless: z
      .boolean()
      .describe(
        "True if the service supports passwordless authentication (email magic link or email one-time passcode/OTP), false if it strictly requires a password, OAuth, or phone call"
      ),
    authMethod: z
      .enum(["magic_link", "password", "oauth", "unknown"])
      .describe("The primary authentication mechanism identified"),
    loginUrl: z.optional(z.string()).describe("The login/sign-in URL discovered"),
    portalUrl: z.optional(z.string()).describe("The billing, plans, or account management portal URL if found"),
    reasoning: z
      .string()
      .describe("Brief 1-2 sentence evidence explaining the conclusion based on the live page inspection"),
  }),
  execute: async (ctx, args): Promise<{ finished: boolean; cancellationMethod: string; reasoning: string }> => {
    // 1. Clean up active browser session
    const scrapeId = activeDiscoverySessions.get(args.messageId);
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (scrapeId && apiKey) {
      try {
        await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (_) {}
      activeDiscoverySessions.delete(args.messageId);
    }

    const cancellationMethod = args.supportsPasswordless ? "magic_link" : "portal";
    const recommendedTier = args.supportsPasswordless ? "one_click" : "redirect";

    // 2. Update subscriptions record
    await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionAuthPolicy, {
      messageId: args.messageId,
      cancellationMethod,
      portalUrl: args.portalUrl || args.loginUrl,
      details: args.reasoning,
    });

    // 3. Cache the policy in subscriptionPolicies table
    await ctx.runMutation(internal.pipeline.subscriptionCancellation.savePolicy, {
      domain: args.domain,
      companyName: args.service,
      portalUrl: args.portalUrl || args.loginUrl,
      cancellationMethod,
      policySummary: args.reasoning,
      recommendedTier,
    });

    // 4. Log completion to subscriptionLogs
    await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
      messageId: args.messageId,
      logLine: `[Auth Discovery Complete] Method: ${args.authMethod.toUpperCase()} | One-Click Feasible: ${args.supportsPasswordless} - ${args.reasoning}`,
    });

    return {
      finished: true,
      cancellationMethod,
      reasoning: args.reasoning,
    };
  },
});

/**
 * Autonomous Auth Discovery Agent
 */
export const authDiscoveryAgent = new Agent(components.agent, {
  name: "AuthDiscoveryAgent",
  languageModel: openai("gpt-5-nano"),
  maxSteps: 10,
  instructions: `You are an autonomous authentication discovery agent operating on behalf of NotYourAverageMail.
Your mission is to investigate a subscription service's website to determine whether it supports passwordless authentication (an email magic link or an email one-time passcode/OTP), or if it strictly requires a password, third-party OAuth, or phone call.

Why this matters:
If a service supports passwordless sign-in (email magic link or email OTP), NotYourAverageMail's autonomous cancellation agent can log in and cancel the user's subscription via "One-Click Cancel" using the user's inbox.
If a service strictly requires a secret password or external OAuth provider, the user must cancel manually.

Your investigation workflow:
1. Examine the Starting Information:
   - You are provided with the Service Name, Domain, and any raw links parsed from the inbound receipt email.
   - Do NOT assume you know the exact login page URL.
   - If candidate links from the email point to an account, plans, or management page, start there with \`start_browser_session(url)\`.
   - Otherwise, start at the base domain (e.g. \`https://\${domain}\`) or use \`search_web\` to discover candidate URLs.

2. Navigate to the Sign-In / Account Page:
   - Once the page loads, look for navigation links like "Sign In", "Log In", "Account", or "Manage Plan".
   - Use \`interact_with_page\` to click through to the authentication screen.
   - Use \`get_current_page_state\` to inspect the controls on the screen.

3. Inspect the Authentication Controls:
   - Examine the form fields and buttons:
     * Does the page offer "Send a magic link", "Sign in with email", "Email me a code", or "Continue without password"? -> Passwordless (supportsPasswordless: true).
     * Does the page ask for Email first with a "Continue" button?
       If so, use \`interact_with_page\` to enter a sample email (e.g. 'user@\${domain}') and click Continue to reveal whether it prompts for a password or sends an OTP/magic link.
     * Does the form require both Email AND Password together with no magic link/code option? -> Password (supportsPasswordless: false).
     * Does it strictly require third-party OAuth (Apple, Microsoft) or SAML? -> OAuth (supportsPasswordless: false).

4. Conclude Discovery:
   - Once you have verified the authentication method, call \`conclude_auth_discovery\` with:
     * supportsPasswordless: true if magic link or email OTP is supported, false otherwise.
     * authMethod: 'magic_link', 'password', or 'oauth'.
     * loginUrl: The URL of the login screen you reached.
     * portalUrl: Any billing or account portal URL discovered.
     * reasoning: A concise 1-2 sentence explanation of your findings based on the live page inspection.

Be methodical, efficient, and never conclude without inspecting the live page controls.`,
  tools: {
    start_browser_session: startBrowserSessionTool,
    interact_with_page: interactWithPageTool,
    get_current_page_state: getCurrentPageStateTool,
    search_web: searchWebTool,
    conclude_auth_discovery: concludeAuthDiscoveryTool,
  },
});

/**
 * Internal Action: Orchestrates the Auth Discovery Agent
 */
export const runAuthDiscoveryAgent = internalAction({
  args: {
    messageId: v.string(),
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch subscription details
    const sub = await ctx.runQuery(internal.pipeline.authDiscoveryAgent.getSubscriptionForDiscovery, {
      messageId: args.messageId,
    });

    if (!sub) {
      console.warn(`[AuthDiscovery] Subscription not found for message ${args.messageId}`);
      return;
    }

    // 2. Check if we already have a cached policy for this domain
    const cached: any = await ctx.runQuery(
      internal.pipeline.subscriptionCancellation.getCachedPolicy,
      { domain: sub.domain }
    );

    if (cached && cached.cancellationMethod) {
      await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
        messageId: args.messageId,
        logLine: `[Auth Discovery Cache] Reusing verified auth policy for ${sub.domain}: ${cached.cancellationMethod.toUpperCase()} (${cached.recommendedTier})`,
      });

      await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionAuthPolicy, {
        messageId: args.messageId,
        cancellationMethod: cached.cancellationMethod,
        portalUrl: cached.portalUrl || sub.portalUrl,
        details: cached.policySummary,
      });
      return;
    }

    // 3. Extract any candidate links from the email
    const msg: any = await ctx.runQuery(
      internal.pipeline.orchestrator.getMessageByMessageId,
      { messageId: args.messageId }
    );

    const emailLinks = msg ? extractUrlsFromEmail(msg.body, msg.htmlBody) : [];

    await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
      messageId: args.messageId,
      logLine: `[Auth Discovery Started] Investigating authentication mechanism for ${sub.service} (${sub.domain})`,
    });

    try {
      const { threadId } = await authDiscoveryAgent.createThread(ctx, {
        title: `Auth Discovery for ${sub.service} (${sub.domain})`,
      });

      const prompt = `Investigate the authentication mechanism for ${sub.service}.
Details:
- Service: ${sub.service}
- Domain: ${sub.domain}
- Message ID: ${args.messageId}
- Candidate links found in receipt email:
${emailLinks.length > 0 ? emailLinks.map((l) => `  * ${l}`).join("\n") : "  * None"}

Goal:
Find the official sign-in flow for ${sub.service}. Determine whether it supports passwordless authentication (email magic link or email one-time passcode/OTP) or strictly requires a password/OAuth. Conclude your assessment using \`conclude_auth_discovery\`.`;

      await authDiscoveryAgent.generateText(
        ctx,
        { threadId },
        { prompt }
      );
    } catch (err: any) {
      console.error(`[AuthDiscoveryAgent] Error investigating ${sub.service}:`, err);

      // Clean up Firecrawl session on error
      const apiKey = process.env.FIRECRAWL_API_KEY;
      const scrapeId = activeDiscoverySessions.get(args.messageId);
      if (scrapeId && apiKey) {
        try {
          await fetch(`https://api.firecrawl.dev/v2/scrape/${scrapeId}/interact`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          });
        } catch (_) {}
        activeDiscoverySessions.delete(args.messageId);
      }

      await ctx.runMutation(internal.pipeline.cancellationAgent.appendExecutionLog, {
        messageId: args.messageId,
        logLine: `[Auth Discovery Error] ${err?.message || "Investigation failed"}`,
      });
    }
  },
});

/**
 * Internal Query: Fetch subscription for discovery
 */
export const getSubscriptionForDiscovery = internalQuery({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});
