import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const TEST_BROKER_ID = "notreallydatabroker";
export const TEST_BROKER_NAME = "NotReallyDataBroker";
export const TEST_BROKER_EMAIL = "notreallydatabroker@aka0lisa.dev";
export const TEST_BROKER_DOMAIN = "notreallydatabroker.aka0lisa.dev";
export const TEST_BROKER_PORTAL = "https://notreallydatabroker.aka0lisa.dev/optout";

/**
 * Mutation: Ensures NotReallyDataBroker is present in the dataBrokers catalog
 */
export const ensureTestBrokerSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("dataBrokers")
      .withIndex("by_brokerId", (q) => q.eq("brokerId", TEST_BROKER_ID))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: TEST_BROKER_NAME,
        email: TEST_BROKER_EMAIL,
        website: "https://notreallydatabroker.aka0lisa.dev",
        optOutUrl: TEST_BROKER_PORTAL,
        category: "people-search",
        region: "us",
      });
      return existing._id;
    }

    return await ctx.db.insert("dataBrokers", {
      brokerId: TEST_BROKER_ID,
      name: TEST_BROKER_NAME,
      email: TEST_BROKER_EMAIL,
      website: "https://notreallydatabroker.aka0lisa.dev",
      optOutUrl: TEST_BROKER_PORTAL,
      category: "people-search",
      region: "us",
    });
  },
});

/**
 * Internal Mutation: Automated Return Mailer Hook
 * Sends a confirmation email back to the user's inbox when a removal request is received
 */
export const triggerReturnMailer = internalMutation({
  args: {
    toInboxId: v.string(),
    originalSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const token = `nrd-${Math.floor(1000 + Math.random() * 9000)}`;
    const messageId = `nrd-reply-${now}`;
    const confirmUrl = `https://notreallydatabroker.aka0lisa.dev/optout?email=${encodeURIComponent(
      args.toInboxId
    )}&token=${token}&confirm=true`;

    const subject = `Action Required: Confirm Data Deletion - NotReallyDataBroker (Ref #${token.toUpperCase()})`;

    const body = `Hello,

We received your request to remove personal data and suppression records associated with ${args.toInboxId} from our databases.

In accordance with our automated privacy procedures, please click the direct confirmation link below to finalize your opt-out and complete the deletion:
${confirmUrl}

If the link does not open automatically, copy and paste it into your browser. Once confirmed, all records linked to this address will be permanently purged.

Sincerely,
NotReallyDataBroker Team
notreallydatabroker@aka0lisa.dev
https://notreallydatabroker.aka0lisa.dev`;

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #2c2a29; background: #ffffff;">
  <h2 style="color: #2c2a29; margin-top: 0;">NotReallyDataBroker Privacy Compliance</h2>
  <p>Hello,</p>
  <p>We received your request to remove personal data associated with <strong>${args.toInboxId}</strong>.</p>
  <p>To finalize your opt-out and complete permanent deletion, please click the button below:</p>
  <div style="margin: 28px 0; text-align: center;">
    <a href="${confirmUrl}" style="background-color: #8544FA; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
      Confirm Opt-Out & Delete Data
    </a>
  </div>
  <p style="font-size: 12px; color: #666;">Ref #${token.toUpperCase()} &bull; NotReallyDataBroker Team &bull; notreallydatabroker@aka0lisa.dev</p>
</div>`;

    await ctx.db.insert("messages", {
      inboxId: args.toInboxId,
      messageId,
      folder: "inbox",
      fromName: TEST_BROKER_NAME,
      fromEmail: TEST_BROKER_EMAIL,
      toName: args.toInboxId.split("@")[0],
      toEmail: args.toInboxId,
      subject,
      preview: "Action Required: Please click to confirm your data deletion request...",
      body,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      senderDomain: TEST_BROKER_DOMAIN,
    });

    // Schedule NotYourAverageMail classifier to process this incoming broker email
    await ctx.scheduler.runAfter(
      0,
      internal.pipeline.classifier.classifyIncomingEmail,
      {
        messageId,
        inboxId: args.toInboxId,
      }
    );

    return { success: true, messageId };
  },
});

/**
 * Mutation: Triggered directly from test-removal web opt-out form
 */
export const submitWebOptOut = mutation({
  args: {
    email: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; messageId: string }> => {
    // Call the return mailer to send confirmation email into the user's inbox
    return await ctx.runMutation(internal.testRemoval.triggerReturnMailer, {
      toInboxId: args.email,
      originalSubject: "Web Opt-Out Request",
    });
  },
});

/**
 * Mutation: Triggered when user/agent clicks "Confirm Opt-Out & Delete Data" on the portal
 */
export const confirmOptOut = mutation({
  args: {
    email: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dataRemovals")
      .withIndex("by_inboxId_and_brokerId", (q) =>
        q.eq("inboxId", args.email).eq("brokerId", TEST_BROKER_ID)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "completed",
        agentNotes: "Opt-out confirmed via web portal link.",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dataRemovals", {
        inboxId: args.email,
        brokerId: TEST_BROKER_ID,
        status: "completed",
        agentNotes: "Opt-out confirmed via web portal link.",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("dataRemovalLogs", {
      inboxId: args.email,
      brokerId: TEST_BROKER_ID,
      logLine: `[Web Portal] Opt-out confirmed on https://notreallydatabroker.aka0lisa.dev/optout (Token: ${args.token || "web"})`,
      timestamp: now,
    });

    return {
      success: true,
      message: `Personal records for ${args.email} successfully purged from NotReallyDataBroker.`,
    };
  },
});
