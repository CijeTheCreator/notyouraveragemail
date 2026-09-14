import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
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
