import { internalAction, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Query: Check if a cancelling skill already exists for a domain or company
 */
export const getSkillByDomainOrCompany = query({
  args: {
    domain: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.domain) {
      const normalizedDomain = args.domain.toLowerCase().trim();
      const byDomain = await ctx.db
        .query("cancellingSkills")
        .withIndex("by_domain", (q) => q.eq("domain", normalizedDomain))
        .first();
      if (byDomain) return byDomain;
    }

    if (args.company) {
      const normalizedCompany = args.company.toLowerCase().trim();
      // Look up by indexed company or scan if casing differs
      const byCompany = await ctx.db
        .query("cancellingSkills")
        .withIndex("by_company", (q) => q.eq("company", args.company!))
        .first();
      if (byCompany) return byCompany;

      const all = await ctx.db.query("cancellingSkills").collect();
      const matched = all.find(
        (s) => s.company.toLowerCase().trim() === normalizedCompany
      );
      if (matched) return matched;
    }

    return null;
  },
});

/**
 * Query: List all available companies with saved cancellation skills
 */
export const listAllSkills = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db.query("cancellingSkills").collect();
    return skills.map((s) => ({
      company: s.company,
      domain: s.domain,
      portalUrl: s.portalUrl,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));
  },
});

/**
 * Internal Mutation: Insert or update a cancelling skill record
 */
export const saveCancellingSkill = internalMutation({
  args: {
    company: v.string(),
    domain: v.string(),
    skillText: v.string(),
    portalUrl: v.optional(v.string()),
    sourceMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedDomain = args.domain.toLowerCase().trim();
    const existing = await ctx.db
      .query("cancellingSkills")
      .withIndex("by_domain", (q) => q.eq("domain", normalizedDomain))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        company: args.company,
        domain: normalizedDomain,
        skillText: args.skillText,
        portalUrl: args.portalUrl || existing.portalUrl,
        sourceMessageId: args.sourceMessageId || existing.sourceMessageId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("cancellingSkills", {
      company: args.company,
      domain: normalizedDomain,
      skillText: args.skillText,
      portalUrl: args.portalUrl,
      sourceMessageId: args.sourceMessageId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal Action: Generate procedural Firecrawl + Playwright cancelling skill from execution logs
 * Only runs if no skill exists yet for this service/domain (idempotent: 1 skill per company)
 */
export const generateSkillIfMissing = internalAction({
  args: {
    messageId: v.string(),
    company: v.string(),
    domain: v.string(),
    portalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedDomain = args.domain.toLowerCase().trim();
    const normalizedCompany = args.company.trim();

    // 1. Check if skill already exists for this domain or company
    const existingSkill = await ctx.runQuery(
      api.pipeline.cancellingSkills.getSkillByDomainOrCompany,
      {
        domain: normalizedDomain,
        company: normalizedCompany,
      }
    );

    if (existingSkill) {
      console.log(
        `[CancellingSkill] Skill already exists for ${args.company} (${normalizedDomain}). Skipping generation.`
      );
      return { skipped: true, reason: "Already exists" };
    }

    // 2. Fetch execution logs for this messageId
    const logs = await ctx.runQuery(
      api.pipeline.subscriptionCancellation.getSubscriptionLogs,
      { messageId: args.messageId }
    );

    if (!logs || logs.length === 0) {
      console.warn(
        `[CancellingSkill] No execution logs found for messageId ${args.messageId}. Skipping skill generation.`
      );
      return { skipped: true, reason: "No execution logs found" };
    }

    const logText = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] ${l.logLine}`)
      .join("\n");

    console.log(
      `[CancellingSkill] Synthesizing cancelling skill for ${args.company} (${normalizedDomain}) from ${logs.length} log lines...`
    );

    // 3. Prompt LLM to distill logs into procedural Firecrawl + Playwright cancellation instructions
    const prompt = `You are an expert browser automation engineer specializing in Firecrawl Interactive Scraping and Playwright.

Analyze the following execution logs from a confirmed, successful automated subscription cancellation for:
- Company/Service: "${args.company}"
- Domain: "${normalizedDomain}"
- Portal URL: "${args.portalUrl || "N/A"}"

Execution Logs:
\`\`\`text
${logText}
\`\`\`

TASK:
Synthesize these real-world execution logs into a clean, reusable, procedural cancellation skill formatted in Markdown.
The skill must explain step-by-step how an autonomous agent or developer can use **FIRECRAWL with Playwright** to cancel this subscription.

FORMAT SPECIFICATION:
Your output must be structured as follows:

# Cancellation Skill: ${args.company} (${normalizedDomain})

## Overview
- **Service**: ${args.company}
- **Domain**: ${normalizedDomain}
- **Management Portal**: ${args.portalUrl || "Billing/Account Settings"}
- **Difficulty / Verification**: e.g., Low / Medium / High (OTP required, retention flow, etc.)

## Prerequisites
- Firecrawl API key with interactive scrape capabilities
- Playwright runtime or Firecrawl \`/v2/scrape/:id/interact\` endpoint access
- User credentials (<USER_EMAIL>, <PASSWORD>)

## Step-by-Step Procedural Workflow
Break down each action taken during the cancellation:
For each step provide:
1. **Step Name & Objective**
2. **Target URL / View state**
3. **Firecrawl Interactive Action Schema** (JSON payload for \`/interact\`, e.g. \`{ "action": { "type": "click", "selector": "button[data-testid='cancel']" } }\`, \`write\`, \`press\`, \`wait\`)
4. **Playwright Equivalent Code Snippet** (e.g. \`await page.locator('...').click();\`)
5. **Notes & Edge Cases** (Handling retention offers, feedback surveys, confirmation dialogs)

## Security & Redaction Rule
- STAGE NO REAL CREDENTIALS OR TOKENS.
- Use placeholders: \`<USER_EMAIL>\`, \`<PASSWORD>\`, \`<OTP_CODE>\`, \`<MAGIC_LINK>\`.

## Verification Criteria
Describe exact indicators that confirm cancellation succeeded (e.g. status badge text, confirmation banner, retention email).

Produce ONLY the markdown documentation content.`;

    try {
      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        prompt,
      });

      const cleanSkill = text.trim();

      // 4. Save to cancellingSkills table
      await ctx.runMutation(
        internal.pipeline.cancellingSkills.saveCancellingSkill,
        {
          company: args.company,
          domain: normalizedDomain,
          skillText: cleanSkill,
          portalUrl: args.portalUrl,
          sourceMessageId: args.messageId,
        }
      );

      // 5. Append log to subscriptionLogs
      await ctx.runMutation(
        internal.pipeline.cancellationAgent.appendExecutionLog,
        {
          messageId: args.messageId,
          logLine: `[Skill Engine] Successfully generated and published procedural Cancelling Skill for ${args.company} (${normalizedDomain}).`,
        }
      );

      console.log(
        `[CancellingSkill] Successfully saved cancelling skill for ${args.company} (${normalizedDomain}).`
      );

      return { success: true };
    } catch (err: any) {
      console.error(
        `[CancellingSkill] Error generating skill for ${args.company}:`,
        err
      );
      return { success: false, error: err.message };
    }
  },
});
