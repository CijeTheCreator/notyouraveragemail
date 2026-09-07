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
        status: v.optional(v.string()),
      })
    ),
  })
    .index("by_inboxId", ["inboxId"])
    .index("by_inbox_and_folder", ["inboxId", "folder"])
    .index("by_messageId", ["messageId"]),

  // Action Cards (AI Agent Triage queue)
  actionCards: defineTable({
    userId: v.optional(v.id("users")),
    messageId: v.optional(v.string()),
    service: v.string(),
    type: v.string(), // "cancellation" | "data-removal" | "spam-takedown"
    status: v.string(), // "pending" | "approved" | "executed" | "dismissed"
    costMonthly: v.optional(v.string()),
    details: v.string(),
    autoTriggerAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
});
