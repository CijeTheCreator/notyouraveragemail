import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      from: process.env.AUTH_EMAIL ?? "Adobe <onboarding@resend.dev>",
    }),
    Password<DataModel>({
      profile(params) {
        const username = (params.username as string) || (params.email as string)?.split("@")[0] || "user";
        const inboxId = `${username}@agentmail.to`;
        return {
          name: (params.name as string) || username,
          username,
          email: inboxId,
          inboxId,
        };
      },
    }),
  ],
});
