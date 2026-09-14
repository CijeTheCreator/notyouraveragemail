import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation: Seed realistic subscription emails for testing
 */
export const seedSampleSubscriptionEmails = mutation({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const samples = [
      {
        messageId: `sub-vercel-${now}`,
        folder: "inbox" as const,
        fromName: "Vercel Billing",
        fromEmail: "billing@vercel.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Invoice for Vercel Pro ($20.00/mo)",
        preview: "Thank you for using Vercel. Your receipt for Vercel Pro monthly subscription...",
        body: `Hi there,\n\nHere is your receipt for your monthly Vercel Pro subscription ($20.00/mo).\n\nTo manage or cancel your team subscription, visit https://vercel.com/dashboard/settings/billing.\n\nThank you,\nThe Vercel Team`,
        timestamp: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        senderDomain: "vercel.com",
        actionCard: {
          type: "cancellation",
          service: "Vercel",
          costMonthly: "$20.00/mo",
          recommendedAction: "Manage or cancel Vercel Pro",
          status: "active",
          portalUrl: "https://vercel.com/dashboard/settings/billing",
        },
      },
      {
        messageId: `sub-linear-${now}`,
        folder: "inbox" as const,
        fromName: "Linear",
        fromEmail: "notifications@linear.app",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Your Linear Standard workspace receipt",
        preview: "This is a receipt for your monthly Linear workspace: 1 member @ $10.00/mo...",
        body: `Hi,\n\nYour Linear workspace subscription has renewed: $10.00/mo.\n\nYou can manage workspace plans and billing at https://linear.app/settings/billing.\n\nLinear Orbit Inc.`,
        timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        isRead: true,
        isStarred: false,
        senderDomain: "linear.app",
        actionCard: {
          type: "cancellation",
          service: "Linear",
          costMonthly: "$10.00/mo",
          recommendedAction: "Manage or cancel Linear workspace",
          status: "active",
          portalUrl: "https://linear.app/settings/billing",
        },
      },
      {
        messageId: `sub-netflix-${now}`,
        folder: "inbox" as const,
        fromName: "Netflix",
        fromEmail: "info@mailer.netflix.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Your Netflix Standard Plan payment receipt",
        preview: "Thank you for streaming Netflix. Your monthly charge of $17.99 was processed...",
        body: `Hi there,\n\nYour monthly Netflix membership has renewed at $17.99/mo.\n\nYou can cancel anytime online at https://www.netflix.com/youraccount.\n\nThe Netflix Team`,
        timestamp: new Date(now - 1000 * 60 * 60).toISOString(),
        isRead: true,
        isStarred: false,
        senderDomain: "netflix.com",
        actionCard: {
          type: "cancellation",
          service: "Netflix",
          costMonthly: "$17.99/mo",
          recommendedAction: "Manage or cancel Netflix membership",
          status: "active",
          portalUrl: "https://www.netflix.com/youraccount",
        },
      },
      {
        messageId: `sub-adobe-${now}`,
        folder: "inbox" as const,
        fromName: "Adobe Billing",
        fromEmail: "billing@adobe.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Receipt for your Adobe Creative Cloud subscription",
        preview: "Thank you for your payment of $59.99 for Adobe Creative Cloud All Apps...",
        body: `Dear Customer,\n\nYour monthly Creative Cloud subscription has processed: $59.99/mo.\n\nManage plan or cancel at https://account.adobe.com/plans.\n\nAdobe Team`,
        timestamp: new Date(now - 1000 * 60 * 180).toISOString(),
        isRead: true,
        isStarred: false,
        senderDomain: "adobe.com",
        actionCard: {
          type: "cancellation",
          service: "Adobe",
          costMonthly: "$59.99/mo",
          recommendedAction: "Manage or cancel Adobe subscription",
          status: "active",
          portalUrl: "https://account.adobe.com/plans",
        },
      },
      {
        messageId: `sub-github-${now}`,
        folder: "inbox" as const,
        fromName: "GitHub",
        fromEmail: "billing@github.com",
        toName: args.inboxId.split("@")[0],
        toEmail: args.inboxId,
        subject: "Payment receipt for GitHub Team subscription ($21.00/mo)",
        preview: "Thanks for using GitHub! This is a receipt for your monthly GitHub Team subscription...",
        body: `Thanks for using GitHub!\n\nThis is a receipt for your monthly GitHub Team subscription: $21.00/mo.\n\nManage seats or cancel organization plan at https://github.com/settings/billing.\n\nGitHub, Inc.`,
        timestamp: new Date(now - 1000 * 60 * 360).toISOString(),
        isRead: true,
        isStarred: false,
        senderDomain: "github.com",
        actionCard: {
          type: "cancellation",
          service: "GitHub",
          costMonthly: "$21.00/mo",
          recommendedAction: "Manage or cancel GitHub Team",
          status: "active",
          portalUrl: "https://github.com/settings/billing",
        },
      },
    ];

    for (const sample of samples) {
      await ctx.db.insert("messages", {
        inboxId: args.inboxId,
        ...sample,
      });
    }

    return { success: true, count: samples.length };
  },
});
