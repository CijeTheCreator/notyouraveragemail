import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Query: Check if the user/inbox has an active Figma connection
 */
export const getFigmaConnectionStatus = query({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("figmaConnections")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .first();

    if (connection && connection.accessToken) {
      return {
        connected: true,
        figmaUserId: connection.figmaUserId,
        figmaEmail: connection.figmaEmail,
        figmaHandle: connection.figmaHandle,
        expiresAt: connection.expiresAt,
      };
    }

    // Fallback: check if backend has a global FIGMA_ACCESS_TOKEN configured
    const hasGlobalToken = !!process.env.FIGMA_ACCESS_TOKEN;
    if (hasGlobalToken) {
      return {
        connected: true,
        figmaHandle: "Global Workspace Token",
        isGlobal: true,
      };
    }

    return {
      connected: false,
    };
  },
});

/**
 * Mutation: Disconnect Figma account
 */
export const disconnectFigma = mutation({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("figmaConnections")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .first();

    if (connection) {
      await ctx.db.delete(connection._id);
    }

    return { success: true };
  },
});

/**
 * Internal Mutation: Save or update Figma connection tokens
 */
export const saveFigmaConnection = internalMutation({
  args: {
    inboxId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    figmaUserId: v.optional(v.string()),
    figmaEmail: v.optional(v.string()),
    figmaHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("figmaConnections")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken ?? existing.refreshToken,
        expiresAt: args.expiresAt ?? existing.expiresAt,
        figmaUserId: args.figmaUserId ?? existing.figmaUserId,
        figmaEmail: args.figmaEmail ?? existing.figmaEmail,
        figmaHandle: args.figmaHandle ?? existing.figmaHandle,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("figmaConnections", {
        inboxId: args.inboxId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        figmaUserId: args.figmaUserId,
        figmaEmail: args.figmaEmail,
        figmaHandle: args.figmaHandle,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Internal Query: Retrieve raw Figma access token for an inbox
 */
export const getFigmaAccessToken = internalQuery({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("figmaConnections")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .first();

    if (connection?.accessToken) {
      return {
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
      };
    }

    return null;
  },
});

/**
 * Action: Generate Figma OAuth authorization URL
 */
export const getOAuthAuthorizationUrl = action({
  args: {
    inboxId: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.FIGMA_CLIENT_ID;
    if (!clientId) {
      throw new Error("FIGMA_CLIENT_ID is not configured in Convex environment");
    }

    const stateObj = {
      inboxId: args.inboxId,
      ts: Date.now(),
    };
    const state = encodeURIComponent(JSON.stringify(stateObj));

    // Figma OAuth scopes: file_content:read
    const scopes = "file_content:read";
    const authUrl = `https://www.figma.com/oauth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      args.redirectUri
    )}&scope=${encodeURIComponent(
      scopes
    )}&state=${encodeURIComponent(state)}&response_type=code`;

    return { authUrl, state };
  },
});

/**
 * Action: Exchange authorization code with Figma for Access Token
 */
export const exchangeOAuthCode = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.FIGMA_CLIENT_ID;
    const clientSecret = process.env.FIGMA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Figma OAuth credentials are not configured in Convex environment");
    }

    let inboxId = "";
    try {
      let decodedStr = args.state;
      try {
        decodedStr = decodeURIComponent(args.state);
      } catch (_) {}
      try {
        if (!decodedStr.startsWith("{")) {
          decodedStr = atob(decodedStr);
        }
      } catch (_) {}
      const decoded = JSON.parse(decodedStr);
      inboxId = decoded.inboxId || "";
    } catch (e) {
      console.warn("Could not parse state for inboxId:", e);
      // Fallback: if state is a raw inboxId string
      inboxId = args.state;
    }

    if (!inboxId) {
      throw new Error("Invalid or missing inboxId in OAuth state");
    }

    // Exchange code with Figma
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: args.redirectUri,
      code: args.code,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Figma token exchange failed (${tokenRes.status}): ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // in seconds
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
    // Figma's `user_id` is a ~19-digit number that overflows a JS double (and
    // fails v.string()). Use the exact string form, and fall back to /v1/me's `id`.
    let figmaUserId: string | undefined =
      typeof tokenData.user_id_string === "string" ? tokenData.user_id_string : undefined;

    // Fetch user details from Figma /v1/me
    let figmaEmail: string | undefined;
    let figmaHandle: string | undefined;

    try {
      const meRes = await fetch("https://api.figma.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        figmaEmail = meData.email;
        figmaHandle = meData.handle;
        if (!figmaUserId && meData.id != null) {
          figmaUserId = String(meData.id);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Figma profile (/v1/me):", e);
    }

    // Persist into Convex database
    await ctx.runMutation(internal.figma.saveFigmaConnection, {
      inboxId,
      accessToken,
      refreshToken,
      expiresAt,
      figmaUserId,
      figmaEmail,
      figmaHandle,
    });

    return {
      success: true,
      inboxId,
      figmaHandle,
      figmaEmail,
    };
  },
});
