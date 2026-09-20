import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { extractOtpCode } from "./pipeline/otp";
import { extractDomain } from "./pipeline/domainReputation";

const AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0";

// Helper to get AgentMail API key
function getApiKey() {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) {
    throw new Error("AGENTMAIL_API_KEY environment variable is not configured.");
  }
  return key;
}

/**
 * Action: Provisions a new Inbox on AgentMail for the registered user
 */
export const provisionInbox = action({
  args: {
    username: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = getApiKey();
    const candidateInboxId = `${args.username}@agentmail.to`;

    // 1. Check if the inbox already exists on AgentMail
    try {
      const checkRes = await fetch(
        `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(candidateInboxId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (checkRes.ok) {
        const existing = await checkRes.json();
        return {
          success: true,
          inboxId: existing.inbox_id || candidateInboxId,
          email: existing.email || candidateInboxId,
        };
      }
    } catch {
      // Fall through to creation
    }

    // 2. Create if not found
    const response = await fetch(`${AGENTMAIL_BASE_URL}/inboxes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: args.username,
        display_name: args.displayName,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create AgentMail inbox: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      inboxId: data.inbox_id || candidateInboxId,
      email: data.email || candidateInboxId,
    };
  },
});

/**
 * Action: Ensures AgentMail webhook is registered for real-time instant email delivery
 */
export const ensureWebhookConfigured = action({
  args: {},
  handler: async () => {
    const apiKey = getApiKey();
    const targetUrl = `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://steady-ram-494.convex.site"}/webhooks/agentmail`;

    // 1. List existing webhooks
    const listRes = await fetch(`${AGENTMAIL_BASE_URL}/webhooks`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (listRes.ok) {
      const data = await listRes.json();
      const existing = (data.webhooks || []).find((wh: any) => wh.url === targetUrl && wh.enabled);
      if (existing) {
        return {
          success: true,
          webhookId: existing.webhook_id,
          url: existing.url,
          status: "already_registered",
        };
      }
    }

    // 2. Register webhook
    const createRes = await fetch(`${AGENTMAIL_BASE_URL}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        event_types: ["message.received", "message.sent"],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.message || `Failed to register webhook: HTTP ${createRes.status}`);
    }

    const created = await createRes.json();
    return {
      success: true,
      webhookId: created.webhook_id,
      url: created.url,
      status: "created",
    };
  },
});

/**
 * Action: Sends an outbound email via AgentMail API and records it in Convex DB
 */
export const sendEmail = action({
  args: {
    inboxId: v.string(),
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    html: v.optional(v.string()),
    fromName: v.string(),
    attachments: v.optional(
      v.array(v.object({ storageId: v.string(), name: v.string() }))
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = getApiKey();

    // Load each attachment from Convex storage and base64-encode it for AgentMail.
    // (No `Buffer` in the default Convex runtime, so encode with btoa in chunks.)
    const outgoingAttachments: { filename: string; content_type?: string; content: string }[] = [];
    for (const att of args.attachments ?? []) {
      if (!att.storageId) continue;
      const blob = await ctx.storage.get(att.storageId as Id<"_storage">);
      if (!blob) {
        throw new Error(`Attachment "${att.name}" was not found in storage`);
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      outgoingAttachments.push({
        filename: att.name,
        content_type: blob.type || undefined,
        content: btoa(binary),
      });
    }

    const response = await fetch(`${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(args.inboxId)}/messages/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html || `<p>${args.text.replace(/\n/g, "<br/>")}</p>`,
        ...(outgoingAttachments.length > 0 ? { attachments: outgoingAttachments } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `AgentMail send failed with status ${response.status}`);
    }

    const sentMessage = await response.json();

    // Store in Convex DB
    await ctx.runMutation(internal.agentmail.recordSentMessage, {
      inboxId: args.inboxId,
      messageId: sentMessage.message_id || `sent-${Date.now()}`,
      threadId: sentMessage.thread_id,
      fromName: args.fromName,
      fromEmail: args.inboxId,
      toName: args.to.split("@")[0],
      toEmail: args.to,
      subject: args.subject,
      preview: args.text.slice(0, 100),
      body: args.text,
      htmlBody: args.html,
      timestamp: new Date().toISOString(),
    });

    // Automated return mailer hook for test removal requests
    if (args.to.toLowerCase().includes("notreallydatabroker@aka0lisa.dev")) {
      await ctx.scheduler.runAfter(2000, internal.testRemoval.triggerReturnMailer, {
        toInboxId: args.inboxId,
        originalSubject: args.subject,
      });
    }

    return {
      success: true,
      messageId: sentMessage.message_id,
    };
  },
});

/**
 * Helper to parse sender and recipient email addresses
 */
export function parseEmailAddress(raw: string | undefined): { name: string; email: string } {
  if (!raw) return { name: "Unknown", email: "unknown@domain.com" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const cleanName = match[1].trim().replace(/^["']|["']$/g, "");
    return {
      name: cleanName || match[2].trim().split("@")[0],
      email: match[2].trim(),
    };
  }
  return {
    name: raw.split("@")[0],
    email: raw.trim(),
  };
}

/**
 * Action: Fetches messages from AgentMail API for an inbox and synchronizes with Convex
 */
export const syncInboxMessages = action({
  args: {
    inboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = getApiKey();

    const response = await fetch(
      `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(args.inboxId)}/messages?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch messages: HTTP ${response.status}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    for (const msg of messages) {
      const sender = parseEmailAddress(msg.from);
      const rawTo = Array.isArray(msg.to) ? msg.to[0] : msg.to;
      const recipient = parseEmailAddress(rawTo || args.inboxId);

      let bodyText = msg.extracted_text || msg.text || msg.preview || "";
      let bodyHtml = msg.extracted_html || msg.html;

      // If message body was omitted in list summary, fetch full item
      if (!bodyText && msg.message_id) {
        try {
          const detailRes = await fetch(
            `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(args.inboxId)}/messages/${encodeURIComponent(msg.message_id)}`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
            }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            bodyText = detail.extracted_text || detail.text || detail.preview || "";
            bodyHtml = detail.extracted_html || detail.html;
          }
        } catch {
          // Keep whatever preview was available
        }
      }

      if (sender.email.toLowerCase() === args.inboxId.toLowerCase()) {
        await ctx.runMutation(internal.agentmail.recordSentMessage, {
          inboxId: args.inboxId,
          messageId: msg.message_id,
          threadId: msg.thread_id,
          fromName: sender.name,
          fromEmail: sender.email,
          toName: recipient.name,
          toEmail: recipient.email,
          subject: msg.subject || "(No Subject)",
          preview: msg.preview || bodyText.slice(0, 100),
          body: bodyText,
          htmlBody: bodyHtml,
          timestamp: msg.timestamp || new Date().toISOString(),
        });
      } else {
        await ctx.runMutation(internal.agentmail.upsertInboundMessage, {
          inboxId: args.inboxId,
          messageId: msg.message_id,
          threadId: msg.thread_id,
          fromName: sender.name,
          fromEmail: sender.email,
          toName: recipient.name,
          toEmail: recipient.email,
          subject: msg.subject || "(No Subject)",
          preview: msg.preview || bodyText.slice(0, 100),
          body: bodyText,
          htmlBody: bodyHtml,
          timestamp: msg.timestamp || new Date().toISOString(),
        });
      }
    }

    return {
      syncedCount: messages.length,
    };
  },
});

// Internal Mutation: Record sent message
export const recordSentMessage = internalMutation({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    fromName: v.string(),
    fromEmail: v.string(),
    toName: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    htmlBody: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!existing) {
      await ctx.db.insert("messages", {
        inboxId: args.inboxId,
        messageId: args.messageId,
        threadId: args.threadId,
        folder: "sent",
        fromName: args.fromName,
        fromEmail: args.fromEmail,
        toName: args.toName,
        toEmail: args.toEmail,
        subject: args.subject,
        preview: args.preview,
        body: args.body,
        htmlBody: args.htmlBody,
        timestamp: args.timestamp,
        isRead: true,
        isStarred: false,
      });
    } else if (existing.folder !== "sent") {
      await ctx.db.patch(existing._id, { folder: "sent", isRead: true });
    }
  },
});

// Internal Mutation: Upsert inbound message
export const upsertInboundMessage = internalMutation({
  args: {
    inboxId: v.string(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    fromName: v.string(),
    fromEmail: v.string(),
    toName: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    htmlBody: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!existing) {
      // Check for OTP code pattern using pipeline module
      const otpCode = extractOtpCode(args.subject, args.body);

      // Extract sender domain
      const senderDomain = extractDomain(args.fromEmail);

      await ctx.db.insert("messages", {
        inboxId: args.inboxId,
        messageId: args.messageId,
        threadId: args.threadId,
        folder: "inbox",
        fromName: args.fromName,
        fromEmail: args.fromEmail,
        toName: args.toName,
        toEmail: args.toEmail,
        subject: args.subject,
        preview: args.preview,
        body: args.body,
        htmlBody: args.htmlBody,
        timestamp: args.timestamp,
        isRead: false,
        isStarred: false,
        otpCode,
        senderDomain,
        priority: "normal",
        pipelineStatus: "processing",
      });

      // Trigger asynchronous background pipeline stages (LLM Classifier & Domain Intel in parallel)
      await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.processIncomingMessage, {
        messageId: args.messageId,
        inboxId: args.inboxId,
      });
    }
  },
});
