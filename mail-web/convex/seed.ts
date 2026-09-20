import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Seeder Mutation: Seeds 3 realistic test emails for testing purposes.
 * DO NOT RUN AUTOMATICALLY - call manually via Convex dashboard or CLI when ready:
 *   npx convex run seed:seedTestEmails '{"inboxId": "osadebec98@agentmail.to"}'
 */
export const seedTestEmails = mutation({
  args: {
    inboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Resolve inboxId
    let targetInboxId = args.inboxId;

    if (!targetInboxId) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const user = await ctx.db.get(userId);
        targetInboxId = user?.inboxId || user?.email;
      }
    }

    if (!targetInboxId) {
      const firstUser = await ctx.db.query("users").first();
      targetInboxId = firstUser?.inboxId || firstUser?.email || "osadebec98@agentmail.to";
    }

    const now = new Date();
    const isoNow = now.toISOString();

    // 2. Define the 3 realistic test emails
    const testEmails = [
      {
        messageId: `seed-otp-${targetInboxId}`,
        threadId: `thread-otp-1`,
        folder: "inbox" as const,
        fromName: "GitHub Security",
        fromEmail: "security@github.com",
        toName: targetInboxId.split("@")[0],
        toEmail: targetInboxId,
        subject: "Your GitHub two-factor authentication code: 749102",
        preview: "Your one-time verification code is 749102. It expires in 10 minutes.",
        body: `Hello,\n\nWe received a sign-in request for your GitHub account from a new browser or device.\n\nYour one-time authentication code is:\n\n749102\n\nThis verification code expires in 10 minutes. If you did not attempt this sign-in, please reset your password and review active security sessions immediately.\n\nThanks,\nThe GitHub Security Team`,
        htmlBody: `<div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 2px solid #2c2a29; background-color: #FEFBEA;">
          <h2 style="font-family: monospace; color: #2c2a29; margin-bottom: 12px;">GitHub Authentication Code</h2>
          <p style="color: #4b5563; font-size: 14px;">We received a sign-in request for your account from an unrecognized browser session.</p>
          <div style="background-color: #FEF08A; border: 2px solid #2c2a29; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #8544FA;">749102</span>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Expires in 10 minutes. Never share this code with anyone.</p>
        </div>`,
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        isRead: false,
        isStarred: true,
        otpCode: "749102",
        actionCard: undefined,
      },
      {
        messageId: `seed-action-${targetInboxId}`,
        threadId: `thread-action-2`,
        folder: "inbox" as const,
        fromName: "Adobe Creative Cloud",
        fromEmail: "billing@adobe.com",
        toName: targetInboxId.split("@")[0],
        toEmail: targetInboxId,
        subject: "Notice of upcoming plan pricing change for Creative Cloud",
        preview: "Starting October 1, your plan rate will update to $69.99/mo (previously $54.99/mo).",
        body: `Dear Subscriber,\n\nThank you for creating with Adobe Creative Cloud. We are writing to let you know about upcoming adjustments to your All Apps subscription plan.\n\nBeginning next month, your monthly renewal fee will increase from $54.99/mo to $69.99/mo. This update reflects our continued investment in generative AI tools (Firefly), enhanced collaboration workflows, and multi-asset cloud storage.\n\nRecommended Action:\nIf you wish to retain your current pricing, switch to an annual pre-paid tier, or cancel your subscription before the next billing cycle, you can do so in your account settings.\n\nSincerely,\nThe Adobe Creative Cloud Team`,
        htmlBody: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 2px solid #2c2a29; background-color: #ffffff;">
          <div style="background-color: #8544FA; color: #ffffff; padding: 12px 20px; font-weight: bold; font-family: sans-serif; text-transform: uppercase;">Adobe Subscription Alert</div>
          <div style="padding: 20px;">
            <h3 style="color: #2c2a29; margin-top: 0;">Plan Pricing Adjustment</h3>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">Starting on October 1st, your monthly renewal will update from <strong>$54.99/mo</strong> to <strong>$69.99/mo</strong>.</p>
            <div style="border-left: 4px solid #8544FA; background-color: #EDE9FE; padding: 12px 16px; margin: 16px 0; font-size: 13px;">
              <strong>NotYourAverageMail AI Triage:</strong> A 27% price hike was detected. You can automate cancellation or dispatch a retention discount query.
            </div>
            <p style="color: #6b7280; font-size: 12px;">You may cancel or change plans anytime before your renewal date.</p>
          </div>
        </div>`,
        timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        isRead: false,
        isStarred: false,
        otpCode: undefined,
        actionCard: {
          type: "cancellation",
          service: "Adobe Creative Cloud",
          costMonthly: "$69.99/mo",
          recommendedAction: "Price hike detected (+$15/mo). Click to trigger automated cancellation or negotiate retention discount.",
          autoTriggerDays: 7,
          status: "pending",
        },
      },
      {
        messageId: `seed-collab-${targetInboxId}`,
        threadId: `thread-collab-3`,
        folder: "inbox" as const,
        fromName: "Sarah Chen",
        fromEmail: "sarah.chen@agenticlabs.io",
        toName: targetInboxId.split("@")[0],
        toEmail: targetInboxId,
        subject: "NotYourAverageMail Architecture & Launch Strategy",
        preview: "Reviewed the 2-pane Neobrutalist design and Convex + AgentMail integration. Looks awesome.",
        body: `Hey team,\n\nI just went through the latest build of NotYourAverageMail with the 2-pane Neobrutalist layout and Convex Auth integration. Everything feels super snappy and clean.\n\nKey launch milestones for this sprint:\n1. 2-pane minimal view verification (done)\n2. Real-time AgentMail sync & webhook pipeline (in progress)\n3. Autonomous AI Agent Action Cards for price cancellation and OTP extraction\n\nLet's do a quick sync call at 4:30 PM today to walk through the submission demo.\n\nCheers,\nSarah Chen\nLead Architect @ Agentic Labs`,
        htmlBody: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; border: 2px solid #2c2a29; background-color: #FEFBEA;">
          <h3 style="color: #2c2a29; margin-top: 0;">NotYourAverageMail Architecture & Launch</h3>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hey team,</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">I just went through the latest build of NotYourAverageMail with the 2-pane layout and Convex Auth integration. Everything feels super snappy.</p>
          <ul style="color: #374151; font-size: 13px; line-height: 1.8;">
            <li>2-pane minimal view verification</li>
            <li>Real-time AgentMail sync & webhook pipeline</li>
            <li>Autonomous AI Agent Action Cards</li>
          </ul>
          <p style="color: #374151; font-size: 14px;">Let's sync at 4:30 PM today!</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— Sarah Chen, Lead Architect</p>
        </div>`,
        timestamp: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
        isRead: true,
        isStarred: false,
        otpCode: undefined,
        actionCard: undefined,
      },
    ];

    let insertedCount = 0;

    for (const email of testEmails) {
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_messageId", (q) => q.eq("messageId", email.messageId))
        .first();

      if (!existing) {
        await ctx.db.insert("messages", {
          inboxId: targetInboxId,
          messageId: email.messageId,
          threadId: email.threadId,
          folder: email.folder,
          fromName: email.fromName,
          fromEmail: email.fromEmail,
          toName: email.toName,
          toEmail: email.toEmail,
          subject: email.subject,
          preview: email.preview,
          body: email.body,
          htmlBody: email.htmlBody,
          timestamp: email.timestamp,
          isRead: email.isRead,
          isStarred: email.isStarred,
          otpCode: email.otpCode,
          actionCard: email.actionCard,
        });

        if (email.actionCard) {
          await ctx.db.insert("actionCards", {
            messageId: email.messageId,
            service: email.actionCard.service,
            type: email.actionCard.type,
            status: "pending",
            costMonthly: email.actionCard.costMonthly,
            details: email.actionCard.recommendedAction,
            autoTriggerAt: Date.now() + (email.actionCard.autoTriggerDays || 7) * 86400000,
          });
        }

        insertedCount++;
      }
    }

    return {
      success: true,
      inboxId: targetInboxId,
      seededCount: insertedCount,
      totalTemplates: testEmails.length,
    };
  },
});
