import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation: Send an Adobe Magic Sign-In Link email to modern-mail
 */
export const sendMagicLinkEmail = mutation({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    portalOrigin: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const origin = args.portalOrigin || "http://localhost:3001";
    const token = args.token || Math.random().toString(36).substring(2, 15);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyUrl = `${origin}/verify?token=${token}&email=${encodeURIComponent(args.toEmail)}`;

    const now = Date.now();
    const messageId = `adobe-auth-${now}`;

    // Target inboxId is toEmail
    const inboxId = args.toEmail;

    const emailSubject = `Adobe ID: Your Magic Sign-In Link (${otp})`;
    const emailBody = `Hi ${args.toName || "there"},

We received a request to sign in to your Adobe account with ${args.toEmail}.

Click the secure link below to sign in instantly:
${verifyUrl}

Alternatively, you can use your one-time passcode: ${otp}

If you didn't request this sign-in link, you can safely ignore this email.

Adobe Account Team
https://account.adobe.com`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e1e1e1; border-radius: 8px;">
        <div style="margin-bottom: 20px;">
          <span style="font-weight: 800; font-size: 20px; color: #EB1000; letter-spacing: -0.5px;">Adobe</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #222; margin-top: 0;">Sign in to your Adobe account</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.5;">Click the button below to sign in immediately without a password.</p>
        <div style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background-color: #0265DC; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: 600; font-size: 14px; display: inline-block;">
            Sign In to Adobe
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Or use your 6-digit one-time code: <strong style="font-family: monospace; font-size: 16px; color: #111;">${otp}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #888; font-size: 11px; margin-bottom: 0;">Adobe Inc., 345 Park Avenue, San Jose, CA 95110 USA</p>
      </div>
    `;

    const docId = await ctx.db.insert("messages", {
      inboxId,
      messageId,
      folder: "inbox",
      fromName: "Adobe ID",
      fromEmail: "account@adobe.com",
      toName: args.toName || args.toEmail.split("@")[0],
      toEmail: args.toEmail,
      subject: emailSubject,
      preview: "Click to sign in instantly to your Adobe account...",
      body: emailBody,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      otpCode: otp,
      senderDomain: "adobe.com",
      priority: "high",
    });

    return { success: true, messageId, docId, verifyUrl, otp };
  },
});

/**
 * Mutation: Trigger Adobe Creative Cloud subscription receipt email with cancellation ActionCard
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
    const messageId = `adobe-sub-${now}`;
    const planName = args.planName || "Creative Cloud All Apps";
    const costMonthly = args.costMonthly || "$59.99/mo";
    const portalUrl = args.portalUrl || "http://localhost:3001/plans";

    const emailSubject = `Receipt for your ${planName} subscription (${costMonthly})`;
    const emailBody = `Dear ${args.toName},

Thank you for your payment of ${costMonthly} for ${planName}.

Your subscription has been successfully activated and gives you full access to Photoshop, Illustrator, Premiere Pro, and 20+ creative applications.

Order Summary:
- Plan: ${planName} (Annual, paid monthly)
- Billing frequency: Monthly
- Amount: ${costMonthly}
- Next renewal date: ${new Date(now + 30 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

You can manage your subscription, update billing methods, or cancel anytime online at:
${portalUrl}

Thank you for choosing Adobe.
Adobe Billing Team
https://account.adobe.com/plans`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e1e1e1; border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <span style="font-weight: 800; font-size: 22px; color: #EB1000; letter-spacing: -0.5px;">Adobe</span>
          <span style="font-size: 12px; color: #666; font-family: monospace;">RECEIPT #${messageId.slice(-8).toUpperCase()}</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #222; margin-top: 0;">Subscription Confirmed</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.5;">
          Thank you for subscribing to <strong>${planName}</strong>. Your payment of <strong>${costMonthly}</strong> has processed successfully.
        </p>
        <div style="background-color: #f7f7f8; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <div style="font-size: 13px; color: #555; margin-bottom: 6px;"><strong>Plan:</strong> ${planName}</div>
          <div style="font-size: 13px; color: #555; margin-bottom: 6px;"><strong>Status:</strong> Active (Renews monthly)</div>
          <div style="font-size: 13px; color: #555;"><strong>Amount:</strong> ${costMonthly}</div>
        </div>
        <div style="margin: 24px 0;">
          <a href="${portalUrl}" style="background-color: #0265DC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 18px; font-weight: 600; font-size: 13px; display: inline-block;">
            Manage Your Plan
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">You can review your plan details or cancel anytime in your Adobe Account.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 11px; margin-bottom: 0;">Adobe Inc., 345 Park Avenue, San Jose, CA 95110 USA</p>
      </div>
    `;

    const actionCard = {
      type: "cancellation",
      service: "Adobe",
      costMonthly,
      recommendedAction: `Manage or cancel ${planName}`,
      status: "active",
      portalUrl,
      supportEmail: "billing@adobe.com",
      cancellationMethod: "magic_link",
      policySummary: "Cancel anytime online in Adobe Account settings.",
      recommendedTier: "one_click",
      autoTriggerDays: 3,
    };

    const docId = await ctx.db.insert("messages", {
      inboxId: args.toEmail,
      messageId,
      folder: "inbox",
      fromName: "Adobe Billing",
      fromEmail: "billing@adobe.com",
      toName: args.toName,
      toEmail: args.toEmail,
      subject: emailSubject,
      preview: `Your ${planName} subscription is active (${costMonthly})...`,
      body: emailBody,
      htmlBody,
      timestamp: new Date().toISOString(),
      isRead: false,
      isStarred: false,
      senderDomain: "adobe.com",
      priority: "normal",
      actionCard,
    });

    await ctx.db.insert("actionCards", {
      messageId,
      service: "Adobe",
      type: "cancellation",
      status: "pending",
      costMonthly,
      details: `Manage or cancel ${planName}`,
      supportEmail: "billing@adobe.com",
      portalUrl,
      cancellationMethod: "magic_link",
      policySummary: "Cancel anytime online in Adobe Account settings.",
      recommendedTier: "one_click",
      autoTriggerAt: now + 3 * 86400000,
      updatedAt: now,
    });

    return { success: true, messageId, docId, portalUrl };
  },
});
