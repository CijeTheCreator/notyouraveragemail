import { internalAction, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Query: Check if an opt-out skill already exists for a brokerId, domain, or broker name
 */
export const getSkillByBrokerOrDomain = query({
  args: {
    brokerId: v.optional(v.string()),
    domain: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.brokerId) {
      const normalizedBrokerId = args.brokerId.toLowerCase().trim();
      const byBrokerId = await ctx.db
        .query("optOutSkills")
        .withIndex("by_brokerId", (q) => q.eq("brokerId", normalizedBrokerId))
        .first();
      if (byBrokerId) return byBrokerId;
    }

    if (args.domain) {
      const normalizedDomain = args.domain.toLowerCase().trim();
      const byDomain = await ctx.db
        .query("optOutSkills")
        .withIndex("by_domain", (q) => q.eq("domain", normalizedDomain))
        .first();
      if (byDomain) return byDomain;
    }

    if (args.name) {
      const normalizedName = args.name.toLowerCase().trim();
      const byName = await ctx.db
        .query("optOutSkills")
        .withIndex("by_name", (q) => q.eq("name", args.name!))
        .first();
      if (byName) return byName;

      const all = await ctx.db.query("optOutSkills").collect();
      const matched = all.find(
        (s) => s.name.toLowerCase().trim() === normalizedName
      );
      if (matched) return matched;
    }

    return null;
  },
});

/**
 * Query: List all available brokers with saved opt-out skills
 */
export const listAllSkills = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db.query("optOutSkills").collect();
    return skills.map((s) => ({
      brokerId: s.brokerId,
      name: s.name,
      domain: s.domain,
      optOutUrl: s.optOutUrl,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));
  },
});

/**
 * Internal Mutation: Insert or update an opt-out skill record
 */
export const saveOptOutSkill = internalMutation({
  args: {
    brokerId: v.string(),
    name: v.string(),
    domain: v.string(),
    skillText: v.string(),
    optOutUrl: v.optional(v.string()),
    sourceMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedBrokerId = args.brokerId.toLowerCase().trim();
    const normalizedDomain = args.domain.toLowerCase().trim();

    const existing = await ctx.db
      .query("optOutSkills")
      .withIndex("by_brokerId", (q) => q.eq("brokerId", normalizedBrokerId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        brokerId: normalizedBrokerId,
        name: args.name,
        domain: normalizedDomain,
        skillText: args.skillText,
        optOutUrl: args.optOutUrl || existing.optOutUrl,
        sourceMessageId: args.sourceMessageId || existing.sourceMessageId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("optOutSkills", {
      brokerId: normalizedBrokerId,
      name: args.name,
      domain: normalizedDomain,
      skillText: args.skillText,
      optOutUrl: args.optOutUrl,
      sourceMessageId: args.sourceMessageId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal Action: Generate procedural Firecrawl + Playwright opt-out skill from execution logs
 * Only runs if no skill exists yet for this broker (idempotent: 1 skill per broker)
 */
export const generateSkillIfMissing = internalAction({
  args: {
    inboxId: v.string(),
    brokerId: v.string(),
    name: v.string(),
    domain: v.string(),
    optOutUrl: v.optional(v.string()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedBrokerId = args.brokerId.toLowerCase().trim();
    const normalizedDomain = args.domain.toLowerCase().trim();

    // 1. Check if an opt-out skill already exists for this broker or domain
    const existing: any = await ctx.runQuery(
      api.pipeline.optOutSkills.getSkillByBrokerOrDomain,
      {
        brokerId: normalizedBrokerId,
        domain: normalizedDomain,
        name: args.name,
      }
    );

    if (existing && existing.skillText && existing.skillText.length > 100) {
      console.log(
        `[OptOutSkills] Skill already exists for broker "${args.name}" (${normalizedBrokerId}). Skipping generation.`
      );
      return { skipped: true, skillId: existing._id };
    }

    // 2. Fetch data removal logs for this broker
    const logs: any[] = await ctx.runQuery(
      api.dataBrokers.getRemovalLogs,
      {
        inboxId: args.inboxId,
        brokerId: args.brokerId,
      }
    );

    if (!logs || logs.length === 0) {
      console.warn(
        `[OptOutSkills] No removal logs found for broker "${args.brokerId}". Cannot synthesize skill.`
      );
      return { error: "No execution logs found" };
    }

    console.log(
      `[OptOutSkills] Synthesizing procedural Opt-Out Skill for ${args.name} (${logs.length} logs)...`
    );

    // 3. Construct chronological execution log text
    const logTrace = logs
      .map(
        (l: any) =>
          `[${new Date(l.timestamp).toISOString()}] ${l.logLine}${
            l.screenshotUrl ? ` [Screenshot: ${l.screenshotUrl}]` : ""
          }`
      )
      .join("\n");

    const prompt = `You are a Principal Browser Automation & Reverse Engineering Specialist at NotYourAverageMail.
Your mission is to synthesize an autonomous data removal execution log trace into a clean, reproducible, procedural "Opt-Out Skill" for the data broker/company: "${args.name}" (domain: "${normalizedDomain}").

Below is the verified chronological execution log of our autonomous Data Removal Agent successfully executing an opt-out / deletion request against this broker:

=== EXECUTION LOG TRACE ===
${logTrace}
=== END LOG TRACE ===

Target Data Broker:
- Name: ${args.name}
- Broker ID: ${normalizedBrokerId}
- Domain: ${normalizedDomain}
- Initial Opt-Out / Suppression URL: ${args.optOutUrl || "Discovered via Search"}

Please synthesize this into a structured Markdown Opt-Out Skill document following this EXACT format:

# Opt-Out Skill: ${args.name} (${normalizedDomain})

## Overview
- **Broker / Service**: ${args.name}
- **Domain**: ${normalizedDomain}
- **Opt-Out / Suppression Portal**: ${args.optOutUrl || "Discovered in session"}
- **Difficulty / Automation Method**: (e.g. Automated Web Form, Email Confirmation Link, Profile Search + Suppression)

## Prerequisites
- Firecrawl API key with interactive scrape capabilities
- Playwright runtime or Firecrawl interactive action session
- User identity parameters: \`<USER_NAME>\`, \`<USER_EMAIL>\`, \`<USER_ADDRESS>\` (if applicable)

## Step-by-Step Procedural Workflow
For EVERY distinct navigation, form submission, email confirmation, or button click taken in the log trace:
### Step N: <Descriptive Step Name>
1. **Step Name & Objective**: What this step achieves.
2. **Target URL / View state**: The URL or state where this action occurs.
3. **Firecrawl Interactive Action Schema** (JSON payload for \`/interact\`, e.g. \`{ "action": { "type": "write", "selector": "input[name='email']", "text": "<USER_EMAIL>" } }\`, \`click\`, \`press\`, \`wait\`)
4. **Playwright Equivalent Code Snippet** (e.g. \`await page.fill('...', '...'); await page.click('...');\`)
5. **Notes & Edge Cases** (Handling email verification links, captcha considerations, confirmation notice)

## Security & Redaction Rule
- STAGE NO REAL PERSONAL DATA, CREDENTIALS, OR TOKENS.
- Use placeholders: \`<USER_NAME>\`, \`<USER_EMAIL>\`, \`<USER_ADDRESS>\`, \`<CONFIRMATION_CODE>\`, \`<MAGIC_LINK>\`.

## Verification Criteria
Describe exact indicators that confirm the opt-out / data deletion succeeded (e.g. status banner, removal confirmation text, proof screenshot).

Produce ONLY the markdown documentation content.`;

    try {
      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        prompt,
      });

      const cleanSkill = text.trim();

      // 4. Save to optOutSkills table
      await ctx.runMutation(
        internal.pipeline.optOutSkills.saveOptOutSkill,
        {
          brokerId: normalizedBrokerId,
          name: args.name,
          domain: normalizedDomain,
          skillText: cleanSkill,
          optOutUrl: args.optOutUrl,
          sourceMessageId: args.messageId,
        }
      );

      // 5. Append log to dataRemovalLogs
      await ctx.runMutation(
        internal.dataBrokers.appendRemovalLog,
        {
          inboxId: args.inboxId,
          brokerId: args.brokerId,
          messageId: args.messageId,
          logLine: `[Skill Engine] Successfully generated and published procedural Opt-Out Skill for ${args.name} (${normalizedDomain}).`,
        }
      );

      console.log(
        `[OptOutSkills] Successfully published skill for ${args.name} (${cleanSkill.length} chars).`
      );

      return { success: true, brokerId: normalizedBrokerId };
    } catch (err: any) {
      console.error(
        `[OptOutSkills] Failed to generate opt-out skill for ${args.name}:`,
        err
      );
      return { error: err?.message || "Generation failed" };
    }
  },
});
