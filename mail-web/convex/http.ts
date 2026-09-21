import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { auth } from "./auth";
import { registerStaticRoutes } from "@convex-dev/static-hosting";

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

// Figma OAuth endpoints
const handleFigmaStart = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const inboxId = url.searchParams.get("inboxId") || "default@agentmail.to";
  const baseUrl = url.origin;
  const redirectUri = `${baseUrl}/api/auth/figma/callback`;

  const { authUrl } = await ctx.runAction(api.figma.getOAuthAuthorizationUrl, {
    inboxId,
    redirectUri,
  });

  return Response.redirect(authUrl, 302);
});

const handleFigmaCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const baseUrl = url.origin;

  if (error) {
    return Response.redirect(
      `${baseUrl}/auth/figma?error=${encodeURIComponent(errorDescription || error)}`,
      302
    );
  }

  if (!code || !state) {
    return Response.redirect(
      `${baseUrl}/auth/figma?error=Missing+code+or+state`,
      302
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/figma/callback`;
    const result = await ctx.runAction(api.figma.exchangeOAuthCode, {
      code,
      redirectUri,
      state,
    });

    return Response.redirect(
      `${baseUrl}/auth/figma?status=connected&handle=${encodeURIComponent(result.figmaHandle || "")}`,
      302
    );
  } catch (err: any) {
    return Response.redirect(
      `${baseUrl}/auth/figma?error=${encodeURIComponent(err.message || "Failed to link Figma account")}`,
      302
    );
  }
});

http.route({
  path: "/api/auth/figma/start",
  method: "GET",
  handler: handleFigmaStart,
});

http.route({
  path: "/api/auth/figma/callback",
  method: "GET",
  handler: handleFigmaCallback,
});

// Unsub Skill Public HTTP API: list available companies with cancellation skills
const handleListUnsubCompanies = httpAction(async (ctx, request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const companies = await ctx.runQuery(
      api.pipeline.cancellingSkills.listAllSkills,
      {}
    );
    return new Response(
      JSON.stringify({
        ok: true,
        count: companies.length,
        companies,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Failed to list companies",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Unsub Skill Public HTTP API: get procedural cancelling skill for a company
const handleGetUnsubSkill = httpAction(async (ctx, request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const company = url.searchParams.get("company") || undefined;
    const domain = url.searchParams.get("domain") || undefined;

    if (!company && !domain) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Missing required query parameter: please provide either ?company=<name> or ?domain=<domain>",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const skill = await ctx.runQuery(
      api.pipeline.cancellingSkills.getSkillByDomainOrCompany,
      { company, domain }
    );

    if (!skill) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `No cancellation skill found for ${domain || company}`,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        company: skill.company,
        domain: skill.domain,
        portalUrl: skill.portalUrl,
        skillText: skill.skillText,
        updatedAt: skill.updatedAt,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Failed to retrieve skill",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

http.route({
  path: "/api/unsub/companies",
  method: "GET",
  handler: handleListUnsubCompanies,
});

http.route({
  path: "/api/unsub/companies",
  method: "OPTIONS",
  handler: handleListUnsubCompanies,
});

http.route({
  path: "/api/unsub/skill",
  method: "GET",
  handler: handleGetUnsubSkill,
});

http.route({
  path: "/api/unsub/skill",
  method: "OPTIONS",
  handler: handleGetUnsubSkill,
});

// Opt-Out Skill Public HTTP API: list available data brokers with opt-out skills
const handleListOptOutBrokers = httpAction(async (ctx, request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const brokers = await ctx.runQuery(
      api.pipeline.optOutSkills.listAllSkills,
      {}
    );
    return new Response(
      JSON.stringify({
        ok: true,
        count: brokers.length,
        brokers,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Failed to list opt-out brokers",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Opt-Out Skill Public HTTP API: get procedural opt-out skill for a broker
const handleGetOptOutSkill = httpAction(async (ctx, request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const broker =
      url.searchParams.get("broker") ||
      url.searchParams.get("brokerId") ||
      undefined;
    const domain = url.searchParams.get("domain") || undefined;
    const name = url.searchParams.get("name") || undefined;

    if (!broker && !domain && !name) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Missing required query parameter: please provide ?broker=<id>, ?domain=<domain>, or ?name=<name>",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const skill = await ctx.runQuery(
      api.pipeline.optOutSkills.getSkillByBrokerOrDomain,
      { brokerId: broker, domain, name }
    );

    if (!skill) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `No opt-out skill found for ${broker || domain || name}`,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        brokerId: skill.brokerId,
        name: skill.name,
        domain: skill.domain,
        optOutUrl: skill.optOutUrl,
        skillText: skill.skillText,
        updatedAt: skill.updatedAt,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Failed to retrieve opt-out skill",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

http.route({
  path: "/api/optout/brokers",
  method: "GET",
  handler: handleListOptOutBrokers,
});

http.route({
  path: "/api/optout/brokers",
  method: "OPTIONS",
  handler: handleListOptOutBrokers,
});

http.route({
  path: "/api/optout/skill",
  method: "GET",
  handler: handleGetOptOutSkill,
});

http.route({
  path: "/api/optout/skill",
  method: "OPTIONS",
  handler: handleGetOptOutSkill,
});

// Static hosting catch-all must be registered last
registerStaticRoutes(http, components.staticHosting);

export default http;
