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
  "adobe.com": "magic_link",
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
    inboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let inboxId = args.inboxId;
    if (!inboxId) {
      const msg: any = await ctx.runQuery(
        internal.pipeline.orchestrator.getMessageByMessageId,
        { messageId: args.messageId }
      );
      inboxId = msg?.inboxId || "user@notyouraveragemail.to";
    }

    const resolvedInboxId: string = inboxId || "user@notyouraveragemail.to";

    // 1. Mark as cancelling
    await ctx.runMutation(internal.pipeline.subscriptionCancellation.updateSubscriptionStatus, {
      messageId: args.messageId,
      status: "cancelling",
    });

    // 2. Schedule autonomous cancellation agent
    await ctx.scheduler.runAfter(0, internal.pipeline.cancellationAgent.runCancellationAgent, {
      messageId: args.messageId,
      inboxId: resolvedInboxId,
      service: args.service,
      domain: args.domain,
      portalUrl: args.portalUrl,
    });

    // 3. Safety Watchdog: After 8 minutes (480,000ms), auto-rescue if still stuck in cancelling
    await ctx.scheduler.runAfter(
      480000,
      internal.pipeline.cancellationAgent.cancellationWatchdog,
      { messageId: args.messageId }
    );

    return {
      success: true,
      message: `Autonomous cancellation agent started for ${args.service}`,
    };
  },
});

/**
 * Internal Query: List all subscriptions for an inbox
 */
export const listSubscriptionsForInbox = internalQuery({
  args: { inboxId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .collect();
  },
});

/**
 * Internal Mutation: Save or upsert a detected subscription entity (with deduplication)
 */
export const saveSubscriptionEntity = internalMutation({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
    service: v.string(),
    domain: v.string(),
    planName: v.string(),
    costMonthly: v.string(),
    renewalDate: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    cancellationMethod: v.optional(v.string()),
    details: v.optional(v.string()),
    existingSubscriptionId: v.optional(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cancellationMethod =
      args.cancellationMethod ||
      (isMagicLinkDomain(args.domain) ? "magic_link" : "portal");

    // 1. If LLM matched an existing subscription ID, update that record
    if (args.existingSubscriptionId) {
      const existing = await ctx.db.get(args.existingSubscriptionId);
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "active",
          service: args.service,
          domain: args.domain,
          planName: args.planName,
          costMonthly: args.costMonthly,
          renewalDate: args.renewalDate || existing.renewalDate,
          portalUrl: args.portalUrl || existing.portalUrl,
          cancellationMethod: cancellationMethod || existing.cancellationMethod,
          messageId: args.messageId, // update latest receipt reference
          details: args.details || existing.details,
          updatedAt: now,
        });

        await ctx.db.insert("subscriptionLogs", {
          subscriptionId: existing._id,
          messageId: args.messageId,
          logLine: `[Subscription Active/Reactivated] Received subscription confirmation email. Status set to ACTIVE.`,
          timestamp: now,
        });

        return existing._id;
      }
    }

    // 2. Fallback check: find existing subscription for this inbox by domain or service
    const existingByDomain = await ctx.db
      .query("subscriptions")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .filter((q) =>
        q.or(
          q.eq(q.field("domain"), args.domain),
          q.eq(q.field("service"), args.service)
        )
      )
      .first();

    if (existingByDomain) {
      await ctx.db.patch(existingByDomain._id, {
        status: "active",
        service: args.service,
        domain: args.domain,
        planName: args.planName,
        costMonthly: args.costMonthly,
        renewalDate: args.renewalDate || existingByDomain.renewalDate,
        portalUrl: args.portalUrl || existingByDomain.portalUrl,
        cancellationMethod: cancellationMethod || existingByDomain.cancellationMethod,
        messageId: args.messageId,
        details: args.details || existingByDomain.details,
        updatedAt: now,
      });

      await ctx.db.insert("subscriptionLogs", {
        subscriptionId: existingByDomain._id,
        messageId: args.messageId,
        logLine: `[Subscription Active/Reactivated] Received subscription confirmation email. Status set to ACTIVE.`,
        timestamp: now,
      });

      return existingByDomain._id;
    }

    // 3. Fallback check: find by messageId
    const byMsg = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (byMsg) {
      await ctx.db.patch(byMsg._id, {
        status: "active",
        service: args.service,
        domain: args.domain,
        planName: args.planName,
        costMonthly: args.costMonthly,
        renewalDate: args.renewalDate,
        portalUrl: args.portalUrl || byMsg.portalUrl,
        cancellationMethod,
        details: args.details || byMsg.details,
        updatedAt: now,
      });
      return byMsg._id;
    }

    // 4. Insert new subscription
    return await ctx.db.insert("subscriptions", {
      inboxId: args.inboxId,
      messageId: args.messageId,
      service: args.service,
      domain: args.domain,
      planName: args.planName,
      costMonthly: args.costMonthly,
      renewalDate: args.renewalDate,
      portalUrl: args.portalUrl,
      status: "active",
      cancellationMethod,
      details: args.details,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal Mutation: Mark subscription as cancelled from provider confirmation email (LLM matched)
 */
export const markSubscriptionCancelledByMatch = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    messageId: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (sub) {
      await ctx.db.patch(sub._id, {
        status: "cancelled",
        details: args.details,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("subscriptionLogs", {
        subscriptionId: sub._id,
        messageId: args.messageId,
        logLine: `[Cancellation Confirmation] Received provider cancellation email. Status updated to CANCELLED. ${args.details}`,
        timestamp: Date.now(),
      });
    }
  },
});

/**
 * Internal Mutation: Create an untracked subscription in CANCELLED state
 */
export const createUntrackedCancelledSubscription = internalMutation({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
    service: v.string(),
    domain: v.string(),
    planName: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const subId = await ctx.db.insert("subscriptions", {
      inboxId: args.inboxId,
      messageId: args.messageId,
      service: args.service,
      domain: args.domain,
      planName: args.planName,
      costMonthly: "$0.00/mo",
      status: "cancelled",
      details: args.details,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("subscriptionLogs", {
      subscriptionId: subId,
      messageId: args.messageId,
      logLine: `[Cancellation Confirmation] Received cancellation confirmation for previously untracked service ${args.service} (${args.domain}). Created record in CANCELLED state.`,
      timestamp: now,
    });

    return subId;
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
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        status: args.status as any,
        updatedAt: Date.now(),
      });
    }

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
  },
});

/**
 * Internal Mutation: Update subscription auth policy and portal URL
 */
export const updateSubscriptionAuthPolicy = internalMutation({
  args: {
    messageId: v.string(),
    cancellationMethod: v.string(),
    portalUrl: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        cancellationMethod: args.cancellationMethod,
        portalUrl: args.portalUrl || sub.portalUrl,
        details: args.details || sub.details,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Query: List clean subscriptions directly from subscriptions table
 */
export const listSubscriptions = query({
  args: {
    inboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items;
    if (args.inboxId) {
      items = await ctx.db
        .query("subscriptions")
        .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId!))
        .collect();
    } else {
      items = await ctx.db.query("subscriptions").collect();
    }

    return items.map((sub) => {
      const domain = sub.domain || extractDomain(sub.inboxId);
      const isMagicLink =
        sub.cancellationMethod === "magic_link" ||
        isMagicLinkDomain(domain);
      const portalUrl = sub.portalUrl || `https://${domain}/account/billing`;

      return {
        id: sub._id,
        messageId: sub.messageId,
        service: sub.service,
        domain: sub.domain,
        costMonthly: sub.costMonthly || "$0.00/mo",
        portalUrl,
        isMagicLink,
        status: sub.status,
        cancellationScreenshotUrl: sub.cancellationScreenshotUrl,
      };
    });
  },
});

/**
 * Query: Get execution logs for a subscription from subscriptionLogs table
 */
export const getSubscriptionLogs = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptionLogs")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();
  },
});

/**
 * Mutation: Purge all legacy subscriptions, action cards, and reset for clean manual testing
 */
export const purgeAllSubscriptionData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Delete all userSubscriptions
    const userSubs = await ctx.db.query("userSubscriptions").collect();
    for (const s of userSubs) {
      await ctx.db.delete(s._id);
    }

    // 2. Delete all actionCards
    const actionCards = await ctx.db.query("actionCards").collect();
    for (const c of actionCards) {
      await ctx.db.delete(c._id);
    }

    // 3. Clear actionCard property on all messages
    const messages = await ctx.db.query("messages").collect();
    let clearedMessagesCount = 0;
    for (const m of messages) {
      if (m.actionCard) {
        await ctx.db.patch(m._id, { actionCard: undefined });
        clearedMessagesCount++;
      }
    }

    // 4. Clear all NotYourAverageMail subscriptions and logs
    const subs = await ctx.db.query("subscriptions").collect();
    for (const s of subs) {
      await ctx.db.delete(s._id);
    }

    const logs = await ctx.db.query("subscriptionLogs").collect();
    for (const l of logs) {
      await ctx.db.delete(l._id);
    }

    // 5. Clear cached subscription policies
    const policies = await ctx.db.query("subscriptionPolicies").collect();
    for (const p of policies) {
      await ctx.db.delete(p._id);
    }

    return {
      deletedUserSubscriptions: userSubs.length,
      deletedActionCards: actionCards.length,
      clearedMessages: clearedMessagesCount,
      deletedSubscriptions: subs.length,
      deletedSubscriptionLogs: logs.length,
      deletedPolicies: policies.length,
    };
  },
});
