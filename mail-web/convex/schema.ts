import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Extend or define users profile
  users: defineTable({
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    inboxId: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("by_username", ["username"])
    .index("by_inboxId", ["inboxId"]),

  // Inboxes associated with users
  inboxes: defineTable({
    userId: v.id("users"),
    inboxId: v.string(), // e.g. "alex@agentmail.to"
    username: v.string(),
    displayName: v.string(),
    createdAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_inboxId", ["inboxId"]),

  // Threads grouping messages
  threads: defineTable({
    inboxId: v.string(),
    threadId: v.string(),
    subject: v.string(),
    lastMessageTimestamp: v.string(),
    labels: v.array(v.string()),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_threadId", ["threadId"]),

  // Messages table
  messages: defineTable({
    inboxId: v.string(),
    threadId: v.optional(v.string()),
    messageId: v.string(),
    folder: v.union(
      v.literal("inbox"),
      v.literal("sent"),
      v.literal("drafts"),
      v.literal("trash")
    ),
    fromName: v.string(),
    fromEmail: v.string(),
    toName: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    htmlBody: v.optional(v.string()),
    timestamp: v.string(),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    labels: v.optional(v.array(v.string())),
    otpCode: v.optional(v.string()),
    actionCard: v.optional(
      v.object({
        type: v.string(),
        service: v.string(),
        costMonthly: v.optional(v.string()),
        recommendedAction: v.string(),
        autoTriggerDays: v.optional(v.number()),
        autoTriggerAt: v.optional(v.number()),
        status: v.optional(v.string()),
        supportEmail: v.optional(v.string()),
        portalUrl: v.optional(v.string()),
        cancellationMethod: v.optional(v.string()),
        policySummary: v.optional(v.string()),
        recommendedTier: v.optional(v.string()),
        scrapeId: v.optional(v.string()),
        executionStatus: v.optional(v.string()),
        executionLog: v.optional(v.array(v.string())),
      })
    ),
    senderDomain: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    ratingCategory: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("high"), v.literal("normal"), v.literal("low"))
    ),
    isSuspicious: v.optional(v.boolean()),
    pipelineStatus: v.optional(v.string()),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_inbox_and_folder", ["inboxId", "folder"])
    .index("by_messageId", ["messageId"]),

  // Domain Intelligence cache for Trustpilot reputation & phishing defense
  domainIntelligence: defineTable({
    domain: v.string(),
    companyName: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    stars: v.optional(v.number()),
    ratingCategory: v.optional(v.string()),
    reviewCount: v.optional(v.number()),
    complaintKeywords: v.optional(v.array(v.string())),
    summary: v.optional(v.string()),
    trustpilotUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("unrated"),
      v.literal("failed")
    ),
    isSuspicious: v.optional(v.boolean()),
    updatedAt: v.number(),
  }).index("by_domain", ["domain"]),

  // Subscription Policies cache scraped via Firecrawl
  subscriptionPolicies: defineTable({
    domain: v.string(),
    companyName: v.string(),
    supportEmail: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    cancellationMethod: v.string(), // "email" | "portal" | "form" | "phone"
    policySummary: v.string(),
    termsSummary: v.optional(v.string()),
    recommendedTier: v.string(), // "tier1_agentmail" | "tier2_web_agent"
    updatedAt: v.number(),
  }).index("by_domain", ["domain"]),

  // Action Cards (AI Agent Triage queue)
  actionCards: defineTable({
    userId: v.optional(v.id("users")),
    inboxId: v.optional(v.string()),
    messageId: v.optional(v.string()),
    service: v.string(),
    type: v.string(), // "cancellation" | "data-removal" | "spam-takedown"
    status: v.string(), // "pending" | "in-progress" | "completed" | "dismissed" | "requires-human-action"
    costMonthly: v.optional(v.string()),
    details: v.string(),
    supportEmail: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    cancellationMethod: v.optional(v.string()),
    policySummary: v.optional(v.string()),
    recommendedTier: v.optional(v.string()),
    scrapeId: v.optional(v.string()),
    autoTriggerAt: v.optional(v.number()),
    executionLog: v.optional(v.array(v.string())),
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_inboxId", ["inboxId"])
    .index("by_status", ["status"])
    .index("by_messageId", ["messageId"]),

  // User Subscriptions for test-subscription portal
  userSubscriptions: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    planName: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    costMonthly: v.string(),
    renewalDate: v.string(),
    subscribedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"]),
});
