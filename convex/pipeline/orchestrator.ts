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

    // Stage 1: Domain Intelligence & Trustpilot Reputation (Firecrawl Powered)
    try {
      await ctx.runAction(
        internal.pipeline.domainReputation.enrichSenderReputation,
        {
          messageId: args.messageId,
          fromEmail: msg.fromEmail,
        }
      );
    } catch (err: any) {
      console.error(`[Pipeline:DomainReputation] Error for ${args.messageId}:`, err?.message || err);
    }

    // Stage 2: RocketMoney Subscription Cancellation & Negotiation (Firecrawl Powered)
    if (msg.actionCard?.type === "cancellation") {
      try {
        await ctx.runAction(
          internal.pipeline.subscriptionCancellation.enrichSubscriptionPolicy,
          {
            messageId: args.messageId,
            fromEmail: msg.fromEmail,
          }
        );
      } catch (err: any) {
        console.error(`[Pipeline:SubscriptionPolicy] Error for ${args.messageId}:`, err?.message || err);
      }
    }
  },
});
