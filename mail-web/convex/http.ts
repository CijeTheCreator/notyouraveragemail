import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Register Convex Auth HTTP routes
auth.addHttpRoutes(http);

function parseAddress(raw: string | undefined): { name: string; email: string } {
  if (!raw) return { name: "Unknown", email: "unknown@domain.com" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const clean = match[1].trim().replace(/^["']|["']$/g, "");
    return { name: clean || match[2].trim().split("@")[0], email: match[2].trim() };
  }
  return { name: raw.split("@")[0], email: raw.trim() };
}

// Webhook handler logic for AgentMail inbound & outbound events
const handleAgentMailWebhook = httpAction(async (ctx, request) => {
  try {
    // Optional Svix header verification if secret configured
    const webhookSecret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (webhookSecret && (!svixId || !svixTimestamp || !svixSignature)) {
      return new Response(JSON.stringify({ error: "Missing Svix signature headers" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await request.json();
    const eventType = payload.event_type;

    if (eventType === "message.received" && payload.message) {
      const msg = payload.message;
      const rawFrom = Array.isArray(msg.from) ? msg.from[0] : msg.from;
      const sender = parseAddress(rawFrom);
      const rawTo = Array.isArray(msg.to) ? msg.to[0] : msg.to;
      const recipient = parseAddress(rawTo || msg.inbox_id);

      let bodyText = msg.extracted_text || msg.text || msg.preview || "";
      let bodyHtml = msg.extracted_html || msg.html;

      // If body was omitted (e.g. payload > 1MB), fetch full message from AgentMail API
      if (!bodyText && msg.inbox_id && msg.message_id && process.env.AGENTMAIL_API_KEY) {
        try {
          const res = await fetch(
            `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(msg.inbox_id)}/messages/${encodeURIComponent(msg.message_id)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
              },
            }
          );
          if (res.ok) {
            const fullMsg = await res.json();
            bodyText = fullMsg.extracted_text || fullMsg.text || fullMsg.preview || "";
            bodyHtml = fullMsg.extracted_html || fullMsg.html;
          }
        } catch (e) {
          console.warn("Could not fetch full message in webhook:", e);
        }
      }

      await ctx.runMutation(internal.agentmail.upsertInboundMessage, {
        inboxId: msg.inbox_id,
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
    } else if (eventType === "message.sent" && payload.message) {
      const msg = payload.message;
      const rawFrom = Array.isArray(msg.from) ? msg.from[0] : msg.from;
      const sender = parseAddress(rawFrom);
      const rawTo = Array.isArray(msg.to) ? msg.to[0] : msg.to;
      const recipient = parseAddress(rawTo);
      const bodyText = msg.extracted_text || msg.text || msg.preview || "";

      await ctx.runMutation(internal.agentmail.recordSentMessage, {
        inboxId: msg.inbox_id,
        messageId: msg.message_id,
        threadId: msg.thread_id,
        fromName: sender.name,
        fromEmail: sender.email,
        toName: recipient.name,
        toEmail: recipient.email,
        subject: msg.subject || "(No Subject)",
        preview: msg.preview || bodyText.slice(0, 100),
        body: bodyText,
        htmlBody: msg.extracted_html || msg.html,
        timestamp: msg.timestamp || new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ received: true, event_type: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Register Webhook endpoints (both standard and alias paths)
http.route({
  path: "/webhooks/agentmail",
  method: "POST",
  handler: handleAgentMailWebhook,
});

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: handleAgentMailWebhook,
});

export default http;
