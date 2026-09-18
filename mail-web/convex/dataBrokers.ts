import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import brokersData from "./brokers.json";

export interface BrokerData {
  id: string;
  name: string;
  email: string;
  website?: string;
  opt_out_url?: string;
  category?: string;
  region?: string;
}

/**
 * Internal Mutation: Checks count of seeded brokers
 */
export const countBrokers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("dataBrokers").take(1);
    return existing.length;
  },
});

/**
 * Internal Mutation: Batch inserts a chunk of brokers
 */
export const insertBrokerBatch = internalMutation({
  args: {
    brokers: v.array(
      v.object({
        brokerId: v.string(),
        name: v.string(),
        email: v.string(),
        website: v.optional(v.string()),
        optOutUrl: v.optional(v.string()),
        category: v.optional(v.string()),
        region: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const broker of args.brokers) {
      const existing = await ctx.db
        .query("dataBrokers")
        .withIndex("by_brokerId", (q) => q.eq("brokerId", broker.brokerId))
        .first();

      if (!existing) {
        await ctx.db.insert("dataBrokers", broker);
      }
    }
  },
});

/**
 * Action: Seeds all 760+ data brokers in chunks
 */
export const seedAllBrokers = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const count = await ctx.runQuery(internal.dataBrokers.countBrokers);
    if (count > 0 && !args.force) {
      return { success: true, message: "Brokers already seeded." };
    }

    const brokers = brokersData as BrokerData[];
    const chunkSize = 100;
    let seeded = 0;

    for (let i = 0; i < brokers.length; i += chunkSize) {
      const chunk = brokers.slice(i, i + chunkSize).map((b) => ({
        brokerId: b.id,
        name: b.name,
        email: b.email,
        website: b.website,
        optOutUrl: b.opt_out_url,
        category: b.category,
        region: b.region,
      }));

      await ctx.runMutation(internal.dataBrokers.insertBrokerBatch, {
        brokers: chunk,
      });
      seeded += chunk.length;
    }

    return {
      success: true,
      message: `Successfully seeded ${seeded} data brokers into catalog.`,
    };
  },
});

/**
 * Query: Lists all brokers joined with the user inbox's removal status
 */
export const listBrokers = query({
  args: {
    inboxId: v.string(),
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all data brokers (catalog)
    const allBrokers = await ctx.db.query("dataBrokers").collect();

    // 2. Fetch user's data removals for this inbox
    const removals = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .collect();

    const removalsMap = new Map<string, (typeof removals)[0]>();
    for (const r of removals) {
      removalsMap.set(r.brokerId, r);
    }

    // 3. Merge catalog with user status
    let results = allBrokers.map((broker) => {
      const removal = removalsMap.get(broker.brokerId);
      return {
        _id: broker._id,
        brokerId: broker.brokerId,
        name: broker.name,
        email: broker.email,
        website: broker.website,
        optOutUrl: broker.optOutUrl,
        category: broker.category || "people-search",
        region: broker.region || "us",
        status: removal ? removal.status : ("not_started" as const),
        sentAt: removal?.sentAt,
        lastMessageId: removal?.lastMessageId,
        manualActionUrl: removal?.manualActionUrl,
        manualActionReason: removal?.manualActionReason,
        agentNotes: removal?.agentNotes,
        screenshotUrl: removal?.screenshotUrl,
        updatedAt: removal?.updatedAt,
      };
    });

    // 4. Apply filters
    if (args.category && args.category !== "all") {
      results = results.filter((b) => b.category === args.category);
    }

    if (args.status && args.status !== "all") {
      results = results.filter((b) => b.status === args.status);
    }

    if (args.search && args.search.trim()) {
      const q = args.search.toLowerCase().trim();
      results = results.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.brokerId.toLowerCase().includes(q) ||
          (b.website && b.website.toLowerCase().includes(q)) ||
          b.email.toLowerCase().includes(q)
      );
    }

    // 5. Ensure "notreallydatabroker" is always first
    results.sort((a, b) => {
      if (a.brokerId === "notreallydatabroker") return -1;
      if (b.brokerId === "notreallydatabroker") return 1;
      return 0;
    });

    return results;
  },
});

/**
 * Query: Metrics summary for the user's dashboard header
 */
export const getRemovalMetrics = query({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const totalBrokers = await ctx.db.query("dataBrokers").collect();
    const removals = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .collect();

    let queued = 0;
    let sent = 0;
    let inProgress = 0;
    let completed = 0;
    let requiresAction = 0;

    for (const r of removals) {
      if (r.status === "queued") queued++;
      else if (r.status === "sent") sent++;
      else if (r.status === "in_progress") inProgress++;
      else if (r.status === "completed") completed++;
      else if (r.status === "requires-human-action") requiresAction++;
    }

    return {
      totalBrokers: totalBrokers.length || brokersData.length,
      queued,
      sent,
      inProgress,
      completed,
      requiresAction,
    };
  },
});

/**
 * Mutation: Prepare POC Campaign by queueing the first 30 brokers
 */
export const prepareCampaign = mutation({
  args: {
    inboxId: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.count || 30;
    const now = Date.now();

    // Get brokers from catalog
    const allBrokers = await ctx.db.query("dataBrokers").take(limit);
    if (allBrokers.length === 0) {
      throw new Error("Brokers catalog is empty. Please seed brokers first.");
    }

    let prepared = 0;
    for (const broker of allBrokers) {
      const existing = await ctx.db
        .query("dataRemovals")
        .withIndex("by_inboxId_and_brokerId", (q) =>
          q.eq("inboxId", args.inboxId).eq("brokerId", broker.brokerId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("dataRemovals", {
          inboxId: args.inboxId,
          brokerId: broker.brokerId,
          status: "queued",
          createdAt: now,
          updatedAt: now,
        });
        prepared++;
      } else if (existing.status === "not_started" as any) {
        await ctx.db.patch(existing._id, {
          status: "queued",
          updatedAt: now,
        });
        prepared++;
      }
    }

    return {
      success: true,
      preparedCount: prepared,
      message: `Prepared campaign: ${prepared} brokers queued for removal requests.`,
    };
  },
});

/**
 * Mutation: Queue or update a single broker
 */
export const queueSingleBroker = mutation({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.inboxId).eq("brokerId", args.brokerId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "queued",
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dataRemovals", {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        status: "queued",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal Mutation: Update data removal status and metadata
 */
export const updateRemovalStatus = internalMutation({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("requires-human-action")
    ),
    manualActionUrl: v.optional(v.string()),
    manualActionReason: v.optional(v.string()),
    agentNotes: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),
    lastMessageId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.inboxId).eq("brokerId", args.brokerId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        manualActionUrl: args.manualActionUrl ?? existing.manualActionUrl,
        manualActionReason: args.manualActionReason ?? existing.manualActionReason,
        agentNotes: args.agentNotes ?? existing.agentNotes,
        screenshotUrl: args.screenshotUrl ?? existing.screenshotUrl,
        lastMessageId: args.lastMessageId ?? existing.lastMessageId,
        sentAt: args.sentAt ?? existing.sentAt,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dataRemovals", {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        status: args.status,
        manualActionUrl: args.manualActionUrl,
        manualActionReason: args.manualActionReason,
        agentNotes: args.agentNotes,
        screenshotUrl: args.screenshotUrl,
        lastMessageId: args.lastMessageId,
        sentAt: args.sentAt,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal Mutation: Appends a log line to dataRemovalLogs
 */
export const appendRemovalLog = internalMutation({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
    messageId: v.optional(v.string()),
    logLine: v.string(),
    screenshotUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dataRemovalLogs", {
      inboxId: args.inboxId,
      brokerId: args.brokerId,
      messageId: args.messageId,
      logLine: args.logLine,
      screenshotUrl: args.screenshotUrl,
      timestamp: Date.now(),
    });
  },
});

/**
 * Internal Query: Finds a broker by domain or email
 */
export const findBrokerByDomainOrEmail = internalQuery({
  args: {
    domain: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanDomain = args.domain.toLowerCase().trim();
    const cleanEmail = args.email ? args.email.toLowerCase().trim() : "";
    const all = await ctx.db.query("dataBrokers").collect();

    // 1. Exact email match first
    if (cleanEmail) {
      const emailMatch = all.find((b) => b.email && b.email.toLowerCase().trim() === cleanEmail);
      if (emailMatch) return emailMatch;
    }

    // 2. Exact domain or email-domain match
    if (cleanDomain) {
      const domainMatch = all.find((b) => {
        const bDomain = b.website
          ? b.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0].toLowerCase().trim()
          : "";
        const bEmailDomain = b.email ? b.email.split("@")[1]?.toLowerCase().trim() : "";
        return (bDomain && bDomain === cleanDomain) || (bEmailDomain && bEmailDomain === cleanDomain);
      });
      if (domainMatch) return domainMatch;

      // 3. Substring match only if bDomain is substantial
      const fuzzyMatch = all.find((b) => {
        const bDomain = b.website
          ? b.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0].toLowerCase().trim()
          : "";
        return bDomain.length >= 4 && (bDomain.includes(cleanDomain) || cleanDomain.includes(bDomain));
      });
      if (fuzzyMatch) return fuzzyMatch;
    }

    return null;
  },
});

/**
 * Internal Query: Get user's removal record for a specific broker
 */
export const getUserRemoval = internalQuery({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.inboxId).eq("brokerId", args.brokerId)
      )
      .first();
  },
});

/**
 * Internal Mutation: Store screenshot proof on data removal
 */
export const updateRemovalScreenshot = internalMutation({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
    screenshotUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.inboxId).eq("brokerId", args.brokerId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        screenshotUrl: args.screenshotUrl,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dataRemovals", {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
        status: "in_progress",
        screenshotUrl: args.screenshotUrl,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal Query: Get broker by brokerId
 */
export const getBroker = internalQuery({
  args: {
    brokerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataBrokers")
      .withIndex("by_brokerId", (q) => q.eq("brokerId", args.brokerId))
      .first();
  },
});

/**
 * Query: Fetch execution logs for a broker
 */
export const getRemovalLogs = query({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataRemovalLogs")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.inboxId).eq("brokerId", args.brokerId)
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Mutation: Seeds realistic data removal emails for testing
 */
export const seedSampleRemovalEmails = mutation({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const samples = [
      {
        inboxId: args.inboxId,
        messageId: `removal-spokeo-${now}`,
        folder: "inbox" as const,
        fromName: "Spokeo Privacy Team",
        fromEmail: "privacy@spokeo.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Data Removal Request Received - Spokeo (Ref #SPK-8921)",
        preview: "We have received your privacy opt-out request under applicable data privacy laws...",
        body: `Dear User,\n\nWe have received your data removal and privacy opt-out request (Reference #SPK-8921).\n\nYour request has been queued and is currently being processed by our compliance team. In accordance with applicable state and federal privacy regulations, your records will be permanently removed from public search listings within 14 business days.\n\nNo further action is required on your part.\n\nSincerely,\nSpokeo Privacy Team\nprivacy@spokeo.com`,
        timestamp: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        senderDomain: "spokeo.com",
      },
      {
        inboxId: args.inboxId,
        messageId: `removal-beenverified-${now}`,
        folder: "inbox" as const,
        fromName: "BeenVerified Privacy Support",
        fromEmail: "privacy@beenverified.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Action Required: Verify Identity for Data Deletion Request",
        preview: "To complete your deletion request, government identification or additional proof of residence is required...",
        body: `Hello,\n\nThank you for contacting BeenVerified regarding your data deletion request.\n\nTo ensure we do not delete data belonging to another individual with the same name, we require additional verification. Please upload a government-issued photo ID (with sensitive numbers redacted) to our secure compliance portal at https://www.beenverified.com/app/optout/verify?token=bv-demo-verification-req.\n\nDue to privacy compliance rules, our automated system cannot complete this request without your manual identity submission.\n\nBeenVerified Legal & Privacy Team`,
        timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        isRead: false,
        isStarred: false,
        senderDomain: "beenverified.com",
      },
    ];

    for (const sample of samples) {
      await ctx.db.insert("messages", sample);
    }

    return { success: true, count: samples.length, messageIds: samples.map((s) => s.messageId) };
  },
});
