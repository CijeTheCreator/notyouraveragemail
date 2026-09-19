import { action, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Internal Mutation: Store or update OTP record in the database
 */
export const recordOtp = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("testOtps")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    for (const record of existing) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.insert("testOtps", {
      email: args.email,
      code: args.code,
      expiresAt: args.expiresAt,
      verified: false,
    });
  },
});

/**
 * Action: Generate 6-digit OTP and send it via Resend
 */
export const sendOtp = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please provide a valid email address.");
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to Convex
    await ctx.runMutation(internal.testOtp.recordOtp, {
      email: cleanEmail,
      code,
      expiresAt,
    });

    // Send email via Resend
    const resendApiKey = process.env.AUTH_RESEND_KEY;
    if (!resendApiKey) {
      throw new Error("AUTH_RESEND_KEY environment variable is not configured.");
    }

    const fromAddress =
      process.env.AUTH_EMAIL?.includes("@")
        ? process.env.AUTH_EMAIL.replace(/^[^<]*<([^>]+)>$/, "Security Verification <$1>")
        : "Security Verification <security@aka0lisa.dev>";

    const subject = `Your verification code: ${code}`;
    const text = `Your verification code is ${code}.\n\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please ignore this email.`;
    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #111827;">Security Verification</h2>
  <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.5;">Please use the following verification code to complete your sign-in or verification request:</p>
  <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 18px; text-align: center; margin-bottom: 20px;">
    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${code}</span>
  </div>
  <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Your verification code is <strong>${code}</strong>.</p>
  <p style="margin: 0; font-size: 12px; color: #9ca3af;">This code is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.</p>
</div>
`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [cleanEmail],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[sendOtp] Resend API error:", errorText);
      throw new Error(`Failed to send verification email via Resend: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
      email: cleanEmail,
    };
  },
});

/**
 * Mutation: Verify OTP code
 */
export const verifyOtp = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim();

    const record = await ctx.db
      .query("testOtps")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .order("desc")
      .first();

    if (!record) {
      return {
        success: false,
        error: "No pending verification code found for this email. Please request a new code.",
      };
    }

    if (Date.now() > record.expiresAt) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new code.",
      };
    }

    if (record.code !== cleanCode) {
      return {
        success: false,
        error: "Invalid verification code. Please check the code and try again.",
      };
    }

    // Mark as verified
    await ctx.db.patch(record._id, {
      verified: true,
    });

    return {
      success: true,
      verified: true,
    };
  },
});
