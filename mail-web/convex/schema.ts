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

  // NotYourAverageMail Subscriptions: first-class detected subscription entities
  subscriptions: defineTable({
    inboxId: v.string(),
    messageId: v.string(),
    service: v.string(),
    domain: v.string(),
    planName: v.string(),
    costMonthly: v.string(),
    renewalDate: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("cancelling"),
      v.literal("cancelled"),
      v.literal("requires-human-action")
    ),
    cancellationMethod: v.optional(v.string()),
    details: v.optional(v.string()),
    scrapeId: v.optional(v.string()),
    cancellationScreenshotUrl: v.optional(v.string()),
    lastScreenshotUrl: v.optional(v.string()),
    liveViewUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_messageId", ["messageId"])
    .index("by_status", ["status"]),

  // Standalone Subscription Execution Logs: individual log rows
  subscriptionLogs: defineTable({
    subscriptionId: v.optional(v.id("subscriptions")),
    messageId: v.string(),
    logLine: v.string(),
    screenshotUrl: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_messageId", ["messageId"]),

  // Global Data Brokers catalog (750+ brokers from Privacy Rights Clearinghouse)
  dataBrokers: defineTable({
    brokerId: v.string(),
    name: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    optOutUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    region: v.optional(v.string()),
  })
    .index("by_brokerId", ["brokerId"])
    .index("by_category", ["category"])
    .index("by_region", ["region"]),

  // NotYourAverageMail Data Removals: user-specific broker opt-out status
  dataRemovals: defineTable({
    inboxId: v.string(),
    brokerId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("requires-human-action")
    ),
    sentAt: v.optional(v.number()),
    lastMessageId: v.optional(v.string()),
    manualActionUrl: v.optional(v.string()),
    manualActionReason: v.optional(v.string()),
    agentNotes: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_inboxId_and_status", ["inboxId", "status"])
    .index("by_inboxId_and_brokerId", ["inboxId", "brokerId"]),

  // Standalone Data Removal Execution Logs
  dataRemovalLogs: defineTable({
    inboxId: v.string(),
    brokerId: v.string(),
    messageId: v.optional(v.string()),
    logLine: v.string(),
    screenshotUrl: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_inboxId_and_brokerId", ["inboxId", "brokerId"]),

  // Test OTP codes for Companion OTP verification testing
  testOtps: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  }).index("by_email", ["email"]),

  // Drafting Sessions for Desktop Companion and autonomous email drafting
  draftSessions: defineTable({
    inboxId: v.string(),
    prompt: v.string(),
    screenContext: v.optional(v.string()),
    threadId: v.optional(v.string()),
    files: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        sizeBytes: v.optional(v.number()),
        path: v.optional(v.string()),
        mimeType: v.optional(v.string()),
      })
    ),
    selectedAttachmentStorageIds: v.array(v.string()),
    draft: v.optional(
      v.object({
        to: v.string(),
        subject: v.string(),
        body: v.string(),
        attachedFiles: v.optional(v.array(v.string())),
      })
    ),
    status: v.union(
      v.literal("in_progress"),
      v.literal("drafted"),
      v.literal("failed")
    ),
    executionLog: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_status", ["status"]),

  // Figma OAuth connections associated with inboxes
  figmaConnections: defineTable({
    inboxId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    figmaUserId: v.optional(v.string()),
    figmaEmail: v.optional(v.string()),
    figmaHandle: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_inboxId", ["inboxId"]),
});

