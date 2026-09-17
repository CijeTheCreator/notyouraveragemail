import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const DEFAULT_PORTAL_URL = "https://notreallyadobe.aka0lisa.dev/plans";
const DEFAULT_PLAN_NAME = "Creative Cloud All Apps";
const DEFAULT_COST_MONTHLY = "$59.99/mo";
const SENDER_NAME = "NotReallyAdobe";
const SENDER_EMAIL = "NotReallyAdobe@aka0lisa.dev";
const SENDER_DOMAIN = "notreallyadobe.aka0lisa.dev";

function generatePurchaseEmail(params: {
  toName: string;
  toEmail: string;
  planName: string;
  costMonthly: string;
  portalUrl: string;
  orderNumber: string;
  orderedDate: string;
}) {
  const { toName, toEmail, planName, costMonthly, portalUrl, orderNumber, orderedDate } = params;

  const subject = "Thanks for your purchase!";

  const body = `Hi ${toName},

Thank you for your purchase of ${planName}.

Your subscription to ${planName} has been confirmed. You will be charged ${costMonthly} (plus tax) monthly. Your subscription will automatically renew monthly until you cancel. Cancel anytime via NotReallyAdobe Account or Customer Support.

Order details:
- Order number: ${orderNumber}
- Ordered: ${orderedDate}
- Plan: ${planName}
- Service: Creative Cloud
- Subtotal: ${costMonthly}
- Tax/VAT 0.00%: $0.00/mo
- Order Total: ${costMonthly}

As a reminder, your NotReallyAdobe ID is ${toEmail}. Use it to access all your Creative Cloud apps and services.

Manage your subscription anytime online at:
${portalUrl}

Thank you for choosing NotReallyAdobe.
NotReallyAdobe Billing Team
https://notreallyadobe.aka0lisa.dev`;

  const htmlBody = `
<table width="100%" bgcolor="#E4E4E4" style="background-color:#E4E4E4; margin:0; padding:24px 0; -webkit-font-smoothing:antialiased; width:100% !important;" border="0" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center">
      <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px; max-width:600px; background-color:#ffffff; border-top:4px solid #EB1000; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); overflow:hidden;">
        <tr>
          <td style="padding:40px 50px 50px 50px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#2C2C2C;">
            <!-- Brand Header -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-bottom:28px;">
                  <span style="color:#EB1000; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:24px; font-weight:900; letter-spacing:-0.5px;">NotReallyAdobe</span>
                </td>
                <td align="right" style="padding-bottom:28px; font-family:monospace; font-size:12px; color:#8E8E8E;">
                  ORDER #${orderNumber}
                </td>
              </tr>
            </table>

            <!-- Header Greeting -->
            <h1 style="margin:0 0 20px 0; font-size:26px; font-weight:700; line-height:32px; color:#000000;">
              ${toName}, welcome to your Creative Cloud subscription!
            </h1>

            <!-- Legal / Pricing Summary -->
            <p style="margin:0 0 24px 0; font-size:16px; line-height:24px; color:#2C2C2C;">
              Your subscription to <strong>${planName}</strong> has been confirmed. You will be charged <strong>${costMonthly} (plus tax) monthly</strong>. Your subscription will automatically renew monthly until you cancel. You can cancel anytime via <a href="${portalUrl}" style="color:#1473E6; text-decoration:none; font-weight:600;">NotReallyAdobe Account</a> or Customer Support.
            </p>

            <!-- ID Reminder -->
            <div style="background-color:#F8F9FA; border-left:3px solid #1473E6; padding:12px 16px; margin:20px 0; font-size:14px; line-height:20px; color:#505050;">
              As a reminder, your NotReallyAdobe ID is <strong style="color:#111;">${toEmail}</strong>. Use it to access all your Creative Cloud apps and services.
            </div>

            <!-- Order Details Box (Matches sample EML format) -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F5F5; border-radius:8px; margin:28px 0 20px 0; padding:24px;">
              <tr>
                <td colspan="2" style="font-size:18px; font-weight:bold; color:#000000; padding-bottom:16px;">
                  Order details
                </td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Order number</td>
                <td align="right" style="font-size:14px; font-weight:bold; color:#1473E6;">
                  <a href="${portalUrl}" style="color:#1473E6; text-decoration:none;">${orderNumber}</a>
                </td>
              </tr>
              <tr style="border-bottom:1px solid #D5D5D5;">
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0 16px 0; border-bottom:1px solid #E1E1E1;">Ordered</td>
                <td align="right" style="font-size:14px; color:#505050; padding:6px 0 16px 0; border-bottom:1px solid #E1E1E1;">${orderedDate}</td>
              </tr>
              <tr>
                <td style="padding-top:16px; font-size:15px; font-weight:bold; color:#2C2C2C;">
                  ${planName}
                  <div style="font-size:12px; font-weight:normal; color:#767676; margin-top:2px;">Monthly plan • Service: Creative Cloud</div>
                </td>
                <td align="right" style="padding-top:16px; font-size:15px; font-weight:bold; color:#2C2C2C;">
                  ${costMonthly}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:16px; border-top:1px solid #E1E1E1;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:14px; color:#505050; padding:4px 0;">Subtotal</td>
                      <td align="right" style="font-size:14px; color:#2C2C2C; padding:4px 0;">${costMonthly}</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px; color:#505050; padding:4px 0;">Tax/VAT 0.00%</td>
                      <td align="right" style="font-size:14px; color:#2C2C2C; padding:4px 0;">$0.00/mo</td>
                    </tr>
                    <tr>
                      <td style="font-size:16px; font-weight:bold; color:#000000; padding-top:8px;">Order Total</td>
                      <td align="right" style="font-size:16px; font-weight:bold; color:#000000; padding-top:8px;">${costMonthly}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Manage Button -->
            <div style="text-align:center; margin:30px 0;">
              <a href="${portalUrl}" style="background-color:#1473E6; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:24px; font-weight:700; font-size:14px; display:inline-block;">
                Manage your account
              </a>
            </div>

            <p style="font-size:13px; color:#767676; line-height:20px; text-align:center; margin:0 0 30px 0;">
              Visit <a href="${portalUrl}" style="color:#1473E6; text-decoration:none;">Account Management</a> to view your plans and products, billing settings, or cancel anytime.
            </p>

            <hr style="border:none; border-top:1px solid #E1E1E1; margin:24px 0;" />

            <!-- Footer -->
            <p style="font-size:11px; line-height:16px; color:#959595; margin:0;">
              NotReallyAdobe, 345 Park Avenue, San Jose, CA 95110 USA.<br/>
              Creative Cloud and NotReallyAdobe are parody trademarks for testing purposes.<br/>
              Portal: <a href="https://notreallyadobe.aka0lisa.dev" style="color:#959595; text-decoration:underline;">notreallyadobe.aka0lisa.dev</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return { subject, body, htmlBody };
}

function generateCancellationEmail(params: {
  toName: string;
  toEmail: string;
  planName: string;
  portalUrl: string;
  cancelledDate: string;
}) {
  const { toName, toEmail, planName, portalUrl, cancelledDate } = params;

  const subject = "Your NotReallyAdobe Creative Cloud subscription has been cancelled";

  const body = `Dear ${toName},

Your subscription to ${planName} has been cancelled.

This email confirms that your subscription has been successfully cancelled. You will not be charged again.

Cancellation details:
- Plan: ${planName}
- Service: Creative Cloud
- Status: Cancelled
- Effective date: ${cancelledDate}
- Account ID: ${toEmail}

If you change your mind or this was done in error, you can resubscribe anytime at:
${portalUrl}

Thank you for using NotReallyAdobe.
NotReallyAdobe Team
https://notreallyadobe.aka0lisa.dev`;

  const htmlBody = `
<table width="100%" bgcolor="#E4E4E4" style="background-color:#E4E4E4; margin:0; padding:24px 0; -webkit-font-smoothing:antialiased; width:100% !important;" border="0" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center">
      <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:600px; max-width:600px; background-color:#ffffff; border-top:4px solid #EB1000; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); overflow:hidden;">
        <tr>
          <td style="padding:40px 50px 50px 50px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#2C2C2C;">
            <!-- Brand Header -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-bottom:28px;">
                  <span style="color:#EB1000; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:24px; font-weight:900; letter-spacing:-0.5px;">NotReallyAdobe</span>
                </td>
                <td align="right" style="padding-bottom:28px; font-family:monospace; font-size:12px; color:#D32F2F; font-weight:bold;">
                  CANCELLATION CONFIRMATION
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="margin:0 0 20px 0; font-size:26px; font-weight:700; line-height:32px; color:#000000;">
              Your Creative Cloud subscription has been cancelled
            </h1>

            <p style="margin:0 0 24px 0; font-size:16px; line-height:24px; color:#2C2C2C;">
              Dear ${toName}, we're sorry to see you go. This email confirms that your subscription to <strong>${planName}</strong> has been successfully cancelled. You will not be charged again.
            </p>

            <!-- Cancellation Details Box -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F5F5F5; border-radius:8px; margin:28px 0 20px 0; padding:24px;">
              <tr>
                <td colspan="2" style="font-size:18px; font-weight:bold; color:#000000; padding-bottom:16px;">
                  Cancellation details
                </td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Plan</td>
                <td align="right" style="font-size:14px; font-weight:bold; color:#2C2C2C;">${planName}</td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Service</td>
                <td align="right" style="font-size:14px; color:#505050;">Creative Cloud</td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Status</td>
                <td align="right" style="font-size:14px; font-weight:bold; color:#D32F2F;">Cancelled</td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Effective date</td>
                <td align="right" style="font-size:14px; color:#505050;">${cancelledDate}</td>
              </tr>
              <tr>
                <td style="font-size:14px; color:#8E8E8E; padding:6px 0;">Account ID</td>
                <td align="right" style="font-size:14px; color:#505050;">${toEmail}</td>
              </tr>
            </table>

            <!-- Resubscribe Button -->
            <div style="text-align:center; margin:30px 0;">
              <a href="${portalUrl}" style="background-color:#1473E6; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:24px; font-weight:700; font-size:14px; display:inline-block;">
                Resubscribe or Manage Plans
              </a>
            </div>

            <p style="font-size:13px; color:#767676; line-height:20px; text-align:center; margin:0 0 30px 0;">
              If this cancellation was done in error or you change your mind, you can resubscribe anytime at <a href="${portalUrl}" style="color:#1473E6; text-decoration:none;">notreallyadobe.aka0lisa.dev/plans</a>.
            </p>

            <hr style="border:none; border-top:1px solid #E1E1E1; margin:24px 0;" />

            <!-- Footer -->
            <p style="font-size:11px; line-height:16px; color:#959595; margin:0;">
              NotReallyAdobe, 345 Park Avenue, San Jose, CA 95110 USA.<br/>
              Portal: <a href="https://notreallyadobe.aka0lisa.dev" style="color:#959595; text-decoration:underline;">notreallyadobe.aka0lisa.dev</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return { subject, body, htmlBody };
}

/**
 * Mutation: Trigger NotReallyAdobe Creative Cloud subscription receipt email
 * (Decoupled: only inserts the email into messages; does NOT create an actionCard)
 */
export const triggerSubscriptionEmail = mutation({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    portalUrl: v.optional(v.string()),
    costMonthly: v.optional(v.string()),
    planName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = `notreallyadobe-sub-${now}`;
    const planName = args.planName || DEFAULT_PLAN_NAME;
    const costMonthly = args.costMonthly || DEFAULT_COST_MONTHLY;
    const portalUrl = args.portalUrl || DEFAULT_PORTAL_URL;
    const orderNumber = `NRA${now.toString().slice(-8).toUpperCase()}`;
    const orderedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { subject, body, htmlBody } = generatePurchaseEmail({
      toName: args.toName,
      toEmail: args.toEmail,
      planName,
      costMonthly,
      portalUrl,
      orderNumber,
      orderedDate,
    });

    const docId = await ctx.db.insert("messages", {
      inboxId: args.toEmail,
      messageId,
      folder: "inbox",
      fromName: SENDER_NAME,
      fromEmail: SENDER_EMAIL,
      toName: args.toName,
      toEmail: args.toEmail,
      subject,
      preview: `Thank you for your purchase of ${planName} (${costMonthly})...`,
      body,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      senderDomain: SENDER_DOMAIN,
      priority: "normal",
    });

    // Schedule background pipeline orchestrator (LLM classification & domain intel)
    await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, {
      messageId,
      inboxId: args.toEmail,
    });

    return { success: true, messageId, docId, portalUrl };
  },
});

/**
 * Mutation: Trigger NotReallyAdobe Creative Cloud cancellation confirmation email
 * (Decoupled: only inserts the email into messages; does NOT create an actionCard)
 */
export const triggerCancellationEmail = mutation({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
    planName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = `notreallyadobe-cancel-${now}`;
    const planName = args.planName || DEFAULT_PLAN_NAME;
    const portalUrl = args.portalUrl || DEFAULT_PORTAL_URL;
    const toName = args.toName || args.toEmail.split("@")[0];
    const cancelledDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { subject, body, htmlBody } = generateCancellationEmail({
      toName,
      toEmail: args.toEmail,
      planName,
      portalUrl,
      cancelledDate,
    });

    const docId = await ctx.db.insert("messages", {
      inboxId: args.toEmail,
      messageId,
      folder: "inbox",
      fromName: SENDER_NAME,
      fromEmail: SENDER_EMAIL,
      toName,
      toEmail: args.toEmail,
      subject,
      preview: `Confirmation: Your ${planName} subscription has been cancelled...`,
      body,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      senderDomain: SENDER_DOMAIN,
      priority: "normal",
    });

    // Schedule background pipeline orchestrator (LLM classification & domain intel)
    await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, {
      messageId,
      inboxId: args.toEmail,
    });

    return { success: true, messageId, docId, portalUrl };
  },
});

/**
 * Query: Get current authenticated user profile
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user;
  },
});

/**
 * Query: Get active or recent subscription for an email or authenticated user
 */
export const getUserSubscription = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let email = args.email;
    const userId = await getAuthUserId(ctx);

    if (!email && userId) {
      const user = await ctx.db.get(userId);
      email = user?.email;
    }

    if (!email) return null;

    const sub = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    return sub;
  },
});

/**
 * Mutation: Save or activate user subscription and trigger confirmation email
 * (Decoupled: does NOT create an actionCard)
 */
export const saveUserSubscription = mutation({
  args: {
    email: v.string(),
    planName: v.string(),
    costMonthly: v.string(),
    renewalDate: v.string(),
    name: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();
    let subId;

    if (existing) {
      await ctx.db.patch(existing._id, {
        planName: args.planName,
        costMonthly: args.costMonthly,
        renewalDate: args.renewalDate,
        status: "active",
        subscribedAt: now,
        userId: userId ?? existing.userId,
      });
      subId = existing._id;
    } else {
      subId = await ctx.db.insert("userSubscriptions", {
        email: args.email,
        planName: args.planName,
        costMonthly: args.costMonthly,
        renewalDate: args.renewalDate,
        status: "active",
        subscribedAt: now,
        userId: userId ?? undefined,
      });
    }

    // Trigger decoupled subscription confirmation email (no action card)
    const portalUrl = args.portalUrl || DEFAULT_PORTAL_URL;
    const toName = args.name || args.email.split("@")[0];
    const orderNumber = `NRA${now.toString().slice(-8).toUpperCase()}`;
    const orderedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { subject, body, htmlBody } = generatePurchaseEmail({
      toName,
      toEmail: args.email,
      planName: args.planName,
      costMonthly: args.costMonthly,
      portalUrl,
      orderNumber,
      orderedDate,
    });

    const messageId = `notreallyadobe-sub-${now}`;
    await ctx.db.insert("messages", {
      inboxId: args.email,
      messageId,
      folder: "inbox",
      fromName: SENDER_NAME,
      fromEmail: SENDER_EMAIL,
      toName,
      toEmail: args.email,
      subject,
      preview: `Thank you for your purchase of ${args.planName} (${args.costMonthly})...`,
      body,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      senderDomain: SENDER_DOMAIN,
      priority: "normal",
    });

    await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, {
      messageId,
      inboxId: args.email,
    });

    return { success: true, subId };
  },
});

/**
 * Mutation: Cancel user subscription and trigger cancellation email
 * (Decoupled: does NOT create an actionCard)
 */
export const cancelUserSubscription = mutation({
  args: {
    email: v.string(),
    portalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "cancelled",
      });

      // Automatically trigger the decoupled cancellation email (no action card)
      const now = Date.now();
      const messageId = `notreallyadobe-cancel-${now}`;
      const planName = existing.planName || DEFAULT_PLAN_NAME;
      const portalUrl = args.portalUrl || DEFAULT_PORTAL_URL;
      const toName = args.email.split("@")[0];
      const cancelledDate = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const { subject, body, htmlBody } = generateCancellationEmail({
        toName,
        toEmail: args.email,
        planName,
        portalUrl,
        cancelledDate,
      });

      await ctx.db.insert("messages", {
        inboxId: args.email,
        messageId,
        folder: "inbox",
        fromName: SENDER_NAME,
        fromEmail: SENDER_EMAIL,
        toName,
        toEmail: args.email,
        subject,
        preview: `Confirmation: Your ${planName} subscription has been cancelled...`,
        body,
        htmlBody,
        timestamp: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        senderDomain: SENDER_DOMAIN,
        priority: "normal",
      });

      await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, {
        messageId,
        inboxId: args.email,
      });

      return { success: true };
    }
    return { success: false, message: "Subscription not found" };
  },
});
