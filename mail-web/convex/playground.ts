import { definePlaygroundAPI } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { cancellationAgent } from "./pipeline/cancellationAgent";

/**
 * Here we expose the API so the frontend can access it.
 * Authorization is handled by passing up an apiKey that can be generated
 * on the dashboard or via CLI via:
 * npx convex run --component agent apiKeys:issue
 */
export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [cancellationAgent],
  userNameLookup: async (ctx, userId) => {
    try {
      const user = await ctx.db.get(userId as any);
      const name = (user?.name as string) || (user?.email as string);
      return name || userId;
    } catch {
      return userId;
    }
  },
});
