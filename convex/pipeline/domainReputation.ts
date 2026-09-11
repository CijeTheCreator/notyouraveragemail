import { action, internalAction, internalMutation, internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "zoho.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "agentmail.to",
]);

const SUSPICIOUS_COMPLAINT_WORDS = [
  "scam",
  "fraud",
  "phishing",
  "stolen",
  "hack",
  "fake",
  "complaint",
  "chargeback",
  "rip off",
  "ripoff",
  "unauthorized",
  "billing",
  "refund",
  "frozen",
  "worst",
  "disrespect",
  "deceptive",
  "terrible",
];

export function extractDomain(email: string): string {
  if (!email || !email.includes("@")) return "";
  const parts = email.split("@");
  return parts[parts.length - 1].trim().toLowerCase();
}

export function isConsumerDomain(domain: string): boolean {
  return CONSUMER_EMAIL_DOMAINS.has(domain.toLowerCase());
}

interface ScrapedReputation {
  companyName?: string;
  trustScore?: number;
  stars?: number;
  ratingCategory?: string;
  reviewCount?: number;
  complaintKeywords: string[];
  summary?: string;
  trustpilotUrl?: string;
  status: "completed" | "unrated" | "failed";
  isSuspicious: boolean;
}

/**
 * Parses Trustpilot scraped markdown & metadata
 */
function parseTrustpilotContent(
  domain: string,
  url: string,
  metadata: any,
  markdown: string,
  extractedComplaints?: string[]
): ScrapedReputation {
  const ogTitle: string = metadata?.ogTitle || metadata?.title || "";
  const description: string = metadata?.ogDescription || metadata?.description || "";
  const fullText = `${ogTitle} ${description}\n${markdown}`;

  // 1. Company Name & Score from Title (e.g. 'Stripe is rated "Bad" with 1.6 / 5 on Trustpilot')
  let companyName = domain.split(".")[0];
  companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
  let ratingCategory: string | undefined = undefined;
  let trustScore: number | undefined = undefined;

  const titleMatch = ogTitle.match(/(.+?)\s+is rated\s+"([^"]+)"\s+with\s+([\d.]+)\s*\/\s*5/i);
  if (titleMatch) {
    companyName = titleMatch[1].trim();
    ratingCategory = titleMatch[2].trim();
    trustScore = parseFloat(titleMatch[3]);
  } else {
    // Fallback: look for TrustScore or rating in metadata/text
    const scoreMatch = fullText.match(/(?:trustscore|rating)[:\s]*([\d.]+)\s*(?:out of 5|\/\s*5)/i);
    if (scoreMatch) {
      trustScore = parseFloat(scoreMatch[1]);
    }
    const catMatch = fullText.match(/(?:rated\s*")([A-Za-z]+)(?:")/i);
    if (catMatch) {
      ratingCategory = catMatch[1];
    }
  }

  // 2. Review Count (e.g. "Join the 17,473 people who've already reviewed Stripe")
  let reviewCount: number | undefined = undefined;
  const countMatch = fullText.match(/([\d,]+)\s*(?:people who've already reviewed|reviews)/i);
  if (countMatch) {
    reviewCount = parseInt(countMatch[1].replace(/,/g, ""), 10);
  }

  // 3. Top Specific Complaints (up to 3 concise natural language items)
  let complaintList: string[] = [];
  if (extractedComplaints && Array.isArray(extractedComplaints) && extractedComplaints.length > 0) {
    complaintList = extractedComplaints
      .filter((c) => typeof c === "string" && c.trim())
      .slice(0, 3);
  } else {
    // Fallback: extract headline quotes from review links in markdown
    const matches = Array.from(
      markdown.matchAll(/\[\*\*(.+?)\*\*\]\(https:\/\/www\.trustpilot\.com\/reviews\/[^\)]+\)/g)
    );
    for (const match of matches) {
      const clean = match[1].replace(/…|\.\.\./g, "").trim();
      if (clean && clean.length > 5 && !complaintList.includes(clean)) {
        complaintList.push(clean);
        if (complaintList.length >= 3) break;
      }
    }
  }

  // Final fallback to keyword-based descriptions if empty
  if (complaintList.length === 0) {
    const lowerText = fullText.toLowerCase();
    const matched = SUSPICIOUS_COMPLAINT_WORDS.filter((kw) => lowerText.includes(kw));
    complaintList = matched.slice(0, 3).map((kw) => `Frequent issues reported regarding ${kw}`);
  }

  // 4. Stars
  const stars = trustScore ? Math.round(trustScore) : undefined;

  // 5. Suspicious flag: TrustScore < 3.0 or ratingCategory "Bad" / "Poor"
  const isSuspicious =
    trustScore !== undefined
      ? trustScore < 3.0
      : ratingCategory === "Bad" || ratingCategory === "Poor";

  let summary = description;
  if (!summary && trustScore) {
    summary = `${companyName} has a TrustScore of ${trustScore}/5 (${ratingCategory || "Rated"}) based on ${reviewCount ? reviewCount.toLocaleString() : "public"} reviews.`;
  }

  return {
    companyName,
    trustScore,
    stars,
    ratingCategory,
    reviewCount,
    complaintKeywords: complaintList,
    summary,
    trustpilotUrl: url,
    status: trustScore !== undefined ? "completed" : "unrated",
    isSuspicious,
  };
}

/**
 * Scrapes Trustpilot using Firecrawl API
 */
async function scrapeTrustpilotWithFirecrawl(
  domain: string,
  apiKey: string
): Promise<ScrapedReputation> {
  const directUrl = `https://www.trustpilot.com/review/${encodeURIComponent(domain)}`;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: directUrl,
        formats: ["markdown", "json"],
        waitFor: 3000,
        jsonOptions: {
          prompt:
            "Extract up to 3 concise, specific customer complaints, pain points, or common criticisms mentioned in the reviews (e.g. 'Frozen payouts without notice', 'Unresponsive customer support', 'Unexpected charges').",
          schema: {
            type: "object",
            properties: {
              topComplaints: {
                type: "array",
                items: { type: "string" },
                maxItems: 3,
              },
            },
          },
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const statusCode = data?.data?.metadata?.statusCode || 200;

      if (statusCode === 200 && data?.data?.markdown) {
        const parsed = parseTrustpilotContent(
          domain,
          directUrl,
          data.data.metadata,
          data.data.markdown,
          data.data.json?.topComplaints
        );
        if (parsed.status === "completed") {
          return parsed;
        }
      }
    }

    // If direct URL was 404 or unrated, fallback to Firecrawl search
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `site:trustpilot.com/review "${domain}"`,
        limit: 1,
      }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const firstResult = searchData?.data?.[0];
      if (firstResult && firstResult.url?.includes("trustpilot.com/review/")) {
        const parsed = parseTrustpilotContent(
          domain,
          firstResult.url,
          firstResult.metadata,
          firstResult.markdown || ""
        );
        if (parsed.status === "completed") {
          return parsed;
        }
      }
    }

    return {
      status: "unrated",
      isSuspicious: false,
      complaintKeywords: [],
      summary: `No verified Trustpilot profile found for ${domain}.`,
      trustpilotUrl: directUrl,
    };
  } catch (err: any) {
    console.error(`Firecrawl scrape error for ${domain}:`, err?.message || err);
    return {
      status: "failed",
      isSuspicious: false,
      complaintKeywords: [],
      summary: "Domain reputation lookup temporarily unavailable.",
    };
  }
}

/**
 * Internal Action: Enriches sender reputation for an incoming message
 */
export const enrichSenderReputation = internalAction({
  args: {
    messageId: v.string(),
    fromEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const domain = extractDomain(args.fromEmail);
    if (!domain) return;

    // 1. Check if it's a consumer email provider (gmail, yahoo, etc.)
    if (isConsumerDomain(domain)) {
      await ctx.runMutation(internal.pipeline.domainReputation.applyMessageReputation, {
        messageId: args.messageId,
        senderDomain: domain,
        trustScore: undefined,
        ratingCategory: undefined,
        isSuspicious: false,
        priority: "normal",
      });
      return;
    }

    // 2. Check cached domainIntelligence in Convex DB
    const cached: any = await ctx.runQuery(
      internal.pipeline.domainReputation.getCachedDomainIntelligence,
      { domain }
    );

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (cached && Date.now() - cached.updatedAt < SEVEN_DAYS_MS) {
      const isSuspicious =
        cached.isSuspicious ?? (cached.trustScore !== undefined && cached.trustScore < 3.0);
      await ctx.runMutation(internal.pipeline.domainReputation.applyMessageReputation, {
        messageId: args.messageId,
        senderDomain: domain,
        trustScore: cached.trustScore,
        ratingCategory: cached.ratingCategory,
        isSuspicious,
        priority: isSuspicious ? "low" : "normal",
      });
      return;
    }

    // 3. Scrape via Firecrawl
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY is not set. Skipping live reputation scrape.");
      return;
    }

    const rep = await scrapeTrustpilotWithFirecrawl(domain, apiKey);

    // 4. Save to cache
    await ctx.runMutation(internal.pipeline.domainReputation.saveDomainIntelligence, {
      domain,
      companyName: rep.companyName,
      trustScore: rep.trustScore,
      stars: rep.stars,
      ratingCategory: rep.ratingCategory,
      reviewCount: rep.reviewCount,
      complaintKeywords: rep.complaintKeywords,
      summary: rep.summary,
      trustpilotUrl: rep.trustpilotUrl,
      status: rep.status,
      isSuspicious: rep.isSuspicious,
      updatedAt: Date.now(),
    });

    // 5. Update message priority and badges
    await ctx.runMutation(internal.pipeline.domainReputation.applyMessageReputation, {
      messageId: args.messageId,
      senderDomain: domain,
      trustScore: rep.trustScore,
      ratingCategory: rep.ratingCategory,
      isSuspicious: rep.isSuspicious,
      priority: rep.isSuspicious ? "low" : "normal",
    });
  },
});

/**
 * Internal Mutation: Save/Update Domain Intelligence
 */
export const saveDomainIntelligence = internalMutation({
  args: {
    domain: v.string(),
    companyName: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    stars: v.optional(v.number()),
    ratingCategory: v.optional(v.string()),
    reviewCount: v.optional(v.number()),
    complaintKeywords: v.optional(v.array(v.string())),
    summary: v.optional(v.string()),
    trustpilotUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("unrated"),
      v.literal("failed")
    ),
    isSuspicious: v.optional(v.boolean()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("domainIntelligence")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        companyName: args.companyName,
        trustScore: args.trustScore,
        stars: args.stars,
        ratingCategory: args.ratingCategory,
        reviewCount: args.reviewCount,
        complaintKeywords: args.complaintKeywords,
        summary: args.summary,
        trustpilotUrl: args.trustpilotUrl,
        status: args.status,
        isSuspicious: args.isSuspicious,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("domainIntelligence", args);
    }
  },
});

/**
 * Internal Mutation: Apply reputation and priority to a message
 */
export const applyMessageReputation = internalMutation({
  args: {
    messageId: v.string(),
    senderDomain: v.string(),
    trustScore: v.optional(v.number()),
    ratingCategory: v.optional(v.string()),
    isSuspicious: v.boolean(),
    priority: v.union(v.literal("high"), v.literal("normal"), v.literal("low")),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();

    if (msg) {
      await ctx.db.patch(msg._id, {
        senderDomain: args.senderDomain,
        trustScore: args.trustScore,
        ratingCategory: args.ratingCategory,
        isSuspicious: args.isSuspicious,
        priority: args.priority,
        pipelineStatus: "processed",
      });
    }
  },
});

/**
 * Internal Query: Retrieve cached domain intelligence
 */
export const getCachedDomainIntelligence = internalQuery({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domainIntelligence")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
  },
});

/**
 * Public Query: Get domain intelligence for UI popover
 */
export const getDomainIntelligence = query({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    if (!args.domain) return null;
    return await ctx.db
      .query("domainIntelligence")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
  },
});

/**
 * Public Action: Force refresh domain intelligence via Firecrawl
 */
export const forceRefreshDomain = action({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");

    const rep = await scrapeTrustpilotWithFirecrawl(args.domain, apiKey);

    await ctx.runMutation(internal.pipeline.domainReputation.saveDomainIntelligence, {
      domain: args.domain,
      companyName: rep.companyName,
      trustScore: rep.trustScore,
      stars: rep.stars,
      ratingCategory: rep.ratingCategory,
      reviewCount: rep.reviewCount,
      complaintKeywords: rep.complaintKeywords,
      summary: rep.summary,
      trustpilotUrl: rep.trustpilotUrl,
      status: rep.status,
      isSuspicious: rep.isSuspicious,
      updatedAt: Date.now(),
    });

    return rep;
  },
});

