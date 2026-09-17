import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { extractDomain } from "./domainReputation";

const subscriptionMetadataSchema = z.object({
  matchedExistingSubscriptionId: z
    .string()
    .nullable()
    .describe(
      "If this receipt is a recurring renewal, payment confirmation, or reactivation for one of the user's existing subscriptions listed below (even if previously marked as cancelled), return its exact ID. If this is a brand new subscription for a service not in the list, return null."
    ),
  service: z.string().describe("The company or service name, e.g. 'Adobe', 'Netflix', 'Spotify'"),
  domain: z.string().describe("The official domain, e.g. 'adobe.com'"),
  planName: z.string().describe("The plan or tier name, e.g. 'Creative Cloud All Apps'"),
  costMonthly: z.string().describe("The monthly cost formatted with currency, e.g. '$59.99/mo'"),
  renewalDate: z.string().optional().describe("Next billing or renewal date if mentioned"),
  portalUrl: z.string().optional().describe("Direct management or billing portal URL if present in email"),
  cancellationMethod: z.enum(["magic_link", "portal"]).optional(),
});

const cancellationMetadataSchema = z.object({
  matchedSubscriptionId: z
    .string()
    .nullable()
    .describe(
      "ID of the user's existing subscription that corresponds to this cancellation email, or null if no matching subscription is in the provided list."
    ),
  service: z.string().describe("The company or service name being cancelled, e.g. 'NotReallyAdobe', 'Netflix'"),
  domain: z.string().describe("The domain of the service being cancelled, e.g. 'notreallyadobe.aka0lisa.dev'"),
  planName: z.string().optional().describe("Plan or tier name if mentioned in the cancellation notice"),
  details: z.string().describe("1-sentence summary of the cancellation details from the email"),
});

/**
 * Internal Action: Extracts subscription metadata and creates or updates the subscription entity (LLM-matched deduplication)
 */
export const processSubscriptionEmail = internalAction({
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
      console.warn(`[SubscriptionHandler] Message ${args.messageId} not found.`);
      return;
    }

    const senderDomain = msg.senderDomain || extractDomain(msg.fromEmail);

    // Fetch user's existing subscriptions for semantic deduplication
    const existingSubs: any[] = await ctx.runQuery(
      internal.pipeline.subscriptionCancellation.listSubscriptionsForInbox,
      { inboxId: args.inboxId }
    );

    try {
      const existingSubsContext =
        existingSubs.length > 0
          ? existingSubs
              .map(
                (s) =>
                  `- ID: ${s._id} | Service: ${s.service} | Domain: ${s.domain} | Plan: ${s.planName} | Status: ${s.status}`
              )
              .join("\n")
          : "None (no existing subscriptions)";

      const prompt = `Analyze this subscription receipt, renewal, or plan reactivation email and extract key subscription details.
Also, check if this receipt corresponds to an existing subscription in the user's list (e.g. monthly renewal, duplicate confirmation, or reactivation of a previously cancelled plan).
If it matches an existing subscription, return its ID in matchedExistingSubscriptionId so it can be updated and reactivated.

Existing Subscriptions in User's Inbox:
${existingSubsContext}

Inbound Receipt Email:
From: ${msg.fromName} <${msg.fromEmail}>
Subject: ${msg.subject}
Body:
${(msg.body || msg.preview || "").slice(0, 3000)}`;

      const { object } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: subscriptionMetadataSchema,
        prompt,
      });

      const domain = object.domain || senderDomain || "unknown.com";
      const service = object.service || domain.split(".")[0];

      // Save subscription entity in the database (with LLM-matched ID if updating)
      await ctx.runMutation(internal.pipeline.subscriptionCancellation.saveSubscriptionEntity, {
        inboxId: args.inboxId,
        messageId: args.messageId,
        service,
        domain,
        planName: object.planName || "Subscription Plan",
        costMonthly: object.costMonthly || "$0.00/mo",
        renewalDate: object.renewalDate,
        portalUrl: object.portalUrl,
        cancellationMethod: object.cancellationMethod,
        details: `Subscribed to ${object.planName || service} (${object.costMonthly || "$0.00/mo"})`,
        existingSubscriptionId: object.matchedExistingSubscriptionId
          ? (object.matchedExistingSubscriptionId as any)
          : undefined,
      });

      // Schedule autonomous auth discovery agent to investigate whether passwordless/magic-link is supported
      await ctx.scheduler.runAfter(
        0,
        internal.pipeline.authDiscoveryAgent.runAuthDiscoveryAgent,
        {
          messageId: args.messageId,
          inboxId: args.inboxId,
        }
      );
    } catch (err: any) {
      console.error(`[SubscriptionHandler] Failed to process subscription for ${args.messageId}:`, err);
      // Fallback: create basic entity so it still appears
      const fallbackService = senderDomain ? senderDomain.split(".")[0] : "Subscription";
      await ctx.runMutation(internal.pipeline.subscriptionCancellation.saveSubscriptionEntity, {
        inboxId: args.inboxId,
        messageId: args.messageId,
        service: fallbackService.charAt(0).toUpperCase() + fallbackService.slice(1),
        domain: senderDomain || "unknown.com",
        planName: msg.subject || "Active Plan",
        costMonthly: "$0.00/mo",
        details: "Subscription detected from inbound email",
      });

      await ctx.scheduler.runAfter(
        0,
        internal.pipeline.authDiscoveryAgent.runAuthDiscoveryAgent,
        {
          messageId: args.messageId,
          inboxId: args.inboxId,
        }
      );
    }
  },
});

/**
 * Internal Action: Processes an inbound cancellation confirmation email (LLM-matched)
 */
export const processCancellationEmail = internalAction({
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
      console.warn(`[SubscriptionHandler] Cancellation message ${args.messageId} not found.`);
      return;
    }

    const senderDomain = msg.senderDomain || extractDomain(msg.fromEmail);

    // Fetch user's existing subscriptions to match against
    const existingSubs: any[] = await ctx.runQuery(
      internal.pipeline.subscriptionCancellation.listSubscriptionsForInbox,
      { inboxId: args.inboxId }
    );

    try {
      const existingSubsContext =
        existingSubs.length > 0
          ? existingSubs
              .map(
                (s) =>
                  `- ID: ${s._id} | Service: ${s.service} | Domain: ${s.domain} | Plan: ${s.planName} | Status: ${s.status}`
              )
              .join("\n")
          : "None (no existing subscriptions currently tracked)";

      const prompt = `Analyze this subscription cancellation confirmation email and match it against the user's currently tracked subscriptions.

Current Tracked Subscriptions in Inbox:
${existingSubsContext}

Cancellation Confirmation Email:
From: ${msg.fromName} <${msg.fromEmail}>
Subject: ${msg.subject}
Body:
${(msg.body || msg.preview || "").slice(0, 3000)}

Your Task:
1. Determine if this email confirms the cancellation of one of the subscriptions in the list above. If so, return its exact ID in matchedSubscriptionId.
2. If no tracked subscription matches (e.g. untracked subscription or user cancelled a service not previously recorded), return null in matchedSubscriptionId and extract the service name, domain, and plan name.`;

      const { object } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: cancellationMetadataSchema,
        prompt,
      });

      console.log(
        `[SubscriptionHandler] Cancellation matched for ${args.messageId}: matchedId=${object.matchedSubscriptionId}, service=${object.service}`
      );

      // Case A: Matching subscription found in user's subscriptions
      if (object.matchedSubscriptionId) {
        await ctx.runMutation(
          internal.pipeline.subscriptionCancellation.markSubscriptionCancelledByMatch,
          {
            subscriptionId: object.matchedSubscriptionId as any,
            messageId: args.messageId,
            details: object.details,
          }
        );
      } else {
        // Case B: Edge case - Untracked subscription cancelled outside NotYourAverageMail
        const domain = object.domain || senderDomain || "unknown.com";
        const service = object.service || domain.split(".")[0];
        await ctx.runMutation(
          internal.pipeline.subscriptionCancellation.createUntrackedCancelledSubscription,
          {
            inboxId: args.inboxId,
            messageId: args.messageId,
            service,
            domain,
            planName: object.planName || "Cancelled Subscription",
            details: object.details,
          }
        );
      }
    } catch (err: any) {
      console.error(`[SubscriptionHandler] Failed to process cancellation email ${args.messageId}:`, err);
    }
  },
});
