import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const emailClassificationSchema = z.object({
  category: z
    .enum(["subscription_confirmation", "subscription_cancellation", "otp_auth", "data_removal", "general"])
    .describe(
      "Classify this email:\n" +
        "- 'subscription_confirmation': If it is a subscription receipt, recurring payment confirmation, plan renewal, plan reactivation / resumed subscription, or purchase invoice for a subscription service.\n" +
        "- 'subscription_cancellation': If it is a confirmation or notice that a subscription, membership, or recurring plan has been cancelled, ended, terminated, or will not renew.\n" +
        "- 'otp_auth': If it is an authentication message containing a one-time passcode (OTP), security code, or magic sign-in link.\n" +
        "- 'data_removal': If it is an acknowledgment, confirmation, verification request, refusal, or follow-up from a company or data broker regarding personal data deletion, privacy opt-out, GDPR erasure, or CCPA removal request.\n" +
        "- 'general': All other standard messages, marketing newsletters, notifications, or personal emails."
    ),
  reason: z.string().describe("Brief 1-sentence rationale for the classification."),
});

/**
 * Internal Action: Pure LLM Classifier for Inbound Messages
 * Classifies the email and schedules the dedicated domain service (non-blocking).
 */
export const classifyIncomingEmail = internalAction({
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
      console.warn(`[Classifier] Message ${args.messageId} not found in database.`);
      return;
    }

    try {
      const prompt = `Classify this inbound email:
From: ${msg.fromName} <${msg.fromEmail}>
Subject: ${msg.subject}
Snippet/Preview: ${msg.preview || ""}
Body:
${(msg.body || "").slice(0, 2000)}`;

      const { object } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: emailClassificationSchema,
        prompt,
      });

      console.log(
        `[Classifier] Message ${args.messageId} classified as "${object.category}": ${object.reason}`
      );

      if (object.category === "subscription_confirmation") {
        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.subscriptionHandler.processSubscriptionEmail,
          {
            messageId: args.messageId,
            inboxId: args.inboxId,
          }
        );
      } else if (object.category === "subscription_cancellation") {
        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.subscriptionHandler.processCancellationEmail,
          {
            messageId: args.messageId,
            inboxId: args.inboxId,
          }
        );
      } else if (object.category === "otp_auth") {
        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.otpHandler.processOtpEmail,
          {
            messageId: args.messageId,
            inboxId: args.inboxId,
          }
        );
      } else if (object.category === "data_removal") {
        await ctx.scheduler.runAfter(
          0,
          internal.pipeline.dataRemovalHandler.processDataRemovalEmail,
          {
            messageId: args.messageId,
            inboxId: args.inboxId,
          }
        );
      }
    } catch (err: any) {
      console.error(`[Classifier] Classification failed for ${args.messageId}:`, err?.message || err);
    }
  },
});
