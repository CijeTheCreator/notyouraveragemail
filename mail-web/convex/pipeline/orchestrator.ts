import { internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Internal Query: Fetch a message by messageId
 */
export const getMessageByMessageId = internalQuery({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

/**
 * Inbound Pipeline Orchestrator:
 * Executes asynchronous enrichment stages when a new email arrives.
 */
export const processIncomingMessage = internalAction({
  args: {
    messageId: v.string(),
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg: any = await ctx.runQuery(
      internal.pipeline.orchestrator.getMessageByMessageId,
      { messageId: args.messageId }
    );

    if (!msg) {
      console.warn(`[Pipeline] Message ${args.messageId} not found in database.`);
      return;
    }

    // 1. Schedule pure LLM classification (non-blocking)
    await ctx.scheduler.runAfter(
      0,
      internal.pipeline.classifier.classifyIncomingEmail,
      {
        messageId: args.messageId,
        inboxId: args.inboxId,
      }
    );

    // 2. Schedule Domain Intelligence & Trustpilot Reputation (non-blocking)
    if (msg.fromEmail) {
      await ctx.scheduler.runAfter(
        0,
        internal.pipeline.domainReputation.enrichSenderReputation,
        {
          messageId: args.messageId,
          fromEmail: msg.fromEmail,
        }
      );
    }
  },
});
