import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query: Get the currently authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Query: List messages in an inbox filtered by folder
 */
export const listMessages = query({
  args: {
    inboxId: v.string(),
    folder: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("sent"),
        v.literal("drafts"),
        v.literal("trash")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.folder) {
      return await ctx.db
        .query("messages")
        .withIndex("by_inbox_and_folder", (q) =>
          q.eq("inboxId", args.inboxId).eq("folder", args.folder!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .order("desc")
      .collect();
  },
});

/**
 * Mutation: Toggle star status
 */
export const toggleStar = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.id);
    if (msg) {
      await ctx.db.patch(args.id, { isStarred: !msg.isStarred });
    }
  },
});

/**
 * Mutation: Toggle read status
 */
export const toggleRead = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.id);
    if (msg) {
      await ctx.db.patch(args.id, { isRead: !msg.isRead });
    }
  },
});

/**
 * Mutation: Move email to trash folder
 */
export const moveToTrash = mutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { folder: "trash" });
  },
});

/**
 * Mutation: Update user profile with provisioned inboxId
 */
export const setUserInbox = mutation({
  args: {
    inboxId: v.string(),
    username: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.patch(userId, {
      inboxId: args.inboxId,
      username: args.username,
      name: args.displayName,
    });

    await ctx.db.insert("inboxes", {
      userId,
      inboxId: args.inboxId,
      username: args.username,
      displayName: args.displayName,
      createdAt: new Date().toISOString(),
    });
  },
});
