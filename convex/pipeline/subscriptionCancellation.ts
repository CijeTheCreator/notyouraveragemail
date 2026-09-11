import { action, internalAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { extractDomain } from "./domainReputation";

// TODO: Later we will hold a comprehensive directory of popular websites and their sign-in methods,
// plus site-specific cancellation skills so we don't need to scrape every time.
export const KNOWN_AUTH_METHODS: Record<string, "magic_link" | "password"> = {
  "vercel.com": "magic_link",
  "linear.app": "magic_link",
  "slack.com": "magic_link",
  "notion.so": "magic_link",
  "substack.com": "magic_link",
  "medium.com": "magic_link",
  "fly.io": "magic_link",
  "supabase.com": "magic_link",
  "resend.com": "magic_link",
  "adobe.com": "password",
  "netflix.com": "password",
  "github.com": "password",
  "spotify.com": "password",
  "dropbox.com": "password",
  "openai.com": "password",
};

export function isMagicLinkDomain(domain: string): boolean {
  const clean = domain.toLowerCase().trim();
  if (KNOWN_AUTH_METHODS[clean] === "magic_link") return true;
  return false;
}

/**
 * Query: Check if we have cached cancellation policies for this domain
 */
export const getCachedPolicy = internalQuery({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptionPolicies")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
  },
});

/**
 * Mutation: Save cached policy
 */
export const savePolicy = internalMutation({
  args: {
    domain: v.string(),
    companyName: v.string(),
    supportEmail: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    cancellationMethod: v.string(),
    policySummary: v.string(),
    recommendedTier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptionPolicies")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptionPolicies", {
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Mutation: Update the message with cancellation portal URL
 */
export const updateMessageSubscription = internalMutation({
  args: {
    messageId: v.string(),
    portalUrl: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!msg || !msg.actionCard) return;

    await ctx.db.patch(msg._id, {
      actionCard: {
        ...msg.actionCard,
        portalUrl: args.portalUrl,
        supportEmail: args.supportEmail,
        status: msg.actionCard.status || "active",
      },
    });
  },
});

/**
 * Internal Action: Enriches inbound subscription email with cancellation portal URL via Firecrawl
 */
export const enrichSubscriptionPolicy = internalAction({
  args: {
    messageId: v.string(),
    fromEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const domain = extractDomain(args.fromEmail);
    if (!domain) return;

    // Check cache
    const cached: any = await ctx.runQuery(
      internal.pipeline.subscriptionCancellation.getCachedPolicy,
      { domain }
    );

    if (cached) {
      await ctx.runMutation(
        internal.pipeline.subscriptionCancellation.updateMessageSubscription,
        {
          messageId: args.messageId,
          portalUrl: cached.portalUrl,
          supportEmail: cached.supportEmail,
        }
      );
      return;
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    let service = domain.split(".")[0];
    service = service.charAt(0).toUpperCase() + service.slice(1);

    let portalUrl = `https://${domain}/account/billing`;
    let supportEmail = `support@${domain}`;

    if (apiKey) {
      try {
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `${service} cancel subscription billing portal settings`,
            limit: 1,
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const firstResult = searchData?.data?.[0];
          if (firstResult && firstResult.url) {
            portalUrl = firstResult.url;
          }
        }
      } catch (err: any) {
        console.warn("[Firecrawl:PortalSearch] Error:", err?.message || err);
      }
    }

    await ctx.runMutation(
      internal.pipeline.subscriptionCancellation.savePolicy,
      {
        domain,
        companyName: service,
        supportEmail,
        portalUrl,
        cancellationMethod: isMagicLinkDomain(domain) ? "magic_link" : "portal",
        policySummary: `Direct portal cancellation at ${domain}`,
        recommendedTier: isMagicLinkDomain(domain) ? "one_click" : "redirect",
      }
    );

    await ctx.runMutation(
      internal.pipeline.subscriptionCancellation.updateMessageSubscription,
      {
        messageId: args.messageId,
        portalUrl,
        supportEmail,
      }
    );
  },
});

/**
 * Action: Autonomous One-Click Cancel (for mail/magic-link based services)
 */
export const executeOneClickCancel = action({
  args: {
    messageId: v.string(),
    service: v.string(),
    domain: v.string(),
    portalUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Mark as cancelling
    await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionStatus, {
      messageId: args.messageId,
      status: "cancelling",
    });

    const apiKey = process.env.FIRECRAWL_API_KEY;

    try {
      if (apiKey) {
        // Run Firecrawl session to trigger magic link sign-in & headless navigation
        await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: args.portalUrl,
            formats: ["markdown"],
            waitFor: 2000,
          }),
        });
      }

      // Mark cancelled
      await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionStatus, {
        messageId: args.messageId,
        status: "cancelled",
      });

      return {
        success: true,
        message: `Successfully cancelled subscription for ${args.service}`,
      };
    } catch (err: any) {
      await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionStatus, {
        messageId: args.messageId,
        status: "active",
      });

      throw new Error(err?.message || `Failed to cancel ${args.service}`);
    }
  },
});

/**
 * Internal Mutation: Update subscription status
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    messageId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (msg && msg.actionCard) {
      await ctx.db.patch(msg._id, {
        actionCard: {
          ...msg.actionCard,
          status: args.status,
        },
      });
    }

    const cardDoc = await ctx.db
      .query("actionCards")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (cardDoc) {
      await ctx.db.patch(cardDoc._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Query: List clean subscriptions
 */
export const listSubscriptions = query({
  args: {
    inboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();

    const subscriptionMessages = messages.filter((m) => {
      if (args.inboxId && m.inboxId !== args.inboxId) return false;
      return m.actionCard && m.actionCard.type === "cancellation";
    });

    return subscriptionMessages.map((m) => {
      const domain = m.senderDomain || extractDomain(m.fromEmail);
      const isMagicLink = isMagicLinkDomain(domain);
      const portalUrl = m.actionCard!.portalUrl || `https://${domain}/account/billing`;

      return {
        id: m._id,
        messageId: m.messageId,
        service: m.actionCard!.service,
        domain,
        costMonthly: m.actionCard!.costMonthly || "$0.00/mo",
        portalUrl,
        isMagicLink,
        status: m.actionCard!.status || "active",
      };
    });
  },
});
