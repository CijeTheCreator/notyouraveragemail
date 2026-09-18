import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { extractDomain } from "./domainReputation";

const brokerMatchingSchema = z.object({
  matchedBrokerId: z
    .string()
    .nullable()
    .describe(
      "The exact brokerId identifier (e.g. 'spokeo', 'beenverified', 'whitepages') of the data broker sending this privacy or data removal email, or null if it cannot be matched to any broker."
    ),
  isDataRemovalRelated: z
    .boolean()
    .describe("Whether this email is genuinely related to data privacy, deletion, opt-out, GDPR erasure, or CCPA rights."),
  summary: z.string().describe("1-sentence summary of what the broker is stating in this email."),
});

/**
 * Internal Action: Processes an inbound data removal email
 * Matches it to a broker and delegates execution to the Data Removal Agent
 */
export const processDataRemovalEmail = internalAction({
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
      console.warn(`[DataRemovalHandler] Message ${args.messageId} not found.`);
      return;
    }

    const domain = msg.senderDomain || extractDomain(msg.fromEmail);

    // 1. Direct match by domain or email in catalog
    const directMatch = await ctx.runQuery(
      internal.dataBrokers.findBrokerByDomainOrEmail,
      { domain, email: msg.fromEmail }
    );

    let brokerId = directMatch?.brokerId;

    // 2. If no direct match, ask LLM with candidate brokers
    if (!brokerId) {
      const prompt = `Analyze this inbound email and determine which data broker or people-search company it is from:
From: ${msg.fromName} <${msg.fromEmail}>
Subject: ${msg.subject}
Body:
${(msg.body || msg.preview || "").slice(0, 2000)}`;

      try {
        const { object } = await generateObject({
          model: openai("gpt-5-nano"),
          schema: brokerMatchingSchema,
          prompt,
        });

        if (object.isDataRemovalRelated && object.matchedBrokerId) {
          brokerId = object.matchedBrokerId;
        }
      } catch (err) {
        console.warn("[DataRemovalHandler] LLM broker matching error:", err);
      }
    }

    // Fallback: use sender domain prefix as candidate brokerId if domain exists
    if (!brokerId && domain && domain.includes(".")) {
      const candidateId = domain.split(".")[0].toLowerCase();
      const broker = await ctx.runQuery(internal.dataBrokers.getBroker, {
        brokerId: candidateId,
      });
      if (broker) {
        brokerId = broker.brokerId;
      }
    }

    if (!brokerId) {
      console.log(
        `[DataRemovalHandler] Could not match message ${args.messageId} to a known data broker.`
      );
      return;
    }

    console.log(
      `[DataRemovalHandler] Message ${args.messageId} matched to broker "${brokerId}". Dispatching DataRemovalAgent...`
    );

    // 3. Dispatch the autonomous agent
    await ctx.scheduler.runAfter(
      0,
      internal.pipeline.dataRemovalAgent.runRemovalAgent,
      {
        inboxId: args.inboxId,
        brokerId,
        messageId: args.messageId,
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
        subject: msg.subject,
        body: msg.body || msg.preview || "",
        userName: msg.toName || args.inboxId.split("@")[0],
      }
    );
  },
});
