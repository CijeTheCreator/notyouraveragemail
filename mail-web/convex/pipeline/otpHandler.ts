import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal Action: Process OTP / Authentication Email
 * (Placeholder - currently unimplemented as requested)
 */
export const processOtpEmail = internalAction({
  args: {
    messageId: v.string(),
    inboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(`[OTP Handler] Received OTP email for processing: messageId=${args.messageId}, inboxId=${args.inboxId}`);
    // Unimplemented for now
  },
});
