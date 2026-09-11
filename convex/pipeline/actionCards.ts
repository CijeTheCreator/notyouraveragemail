export interface ActionCardData {
  type: "cancellation" | "data-removal" | "spam-takedown";
  service: string;
  costMonthly?: string;
  recommendedAction: string;
  autoTriggerDays?: number;
  autoTriggerAt?: number;
  status: string;
  supportEmail?: string;
  portalUrl?: string;
  cancellationMethod?: string;
  policySummary?: string;
  recommendedTier?: string;
  executionStatus?: string;
  executionLog?: string[];
}

/**
 * Smart detection of Action Cards (AI Agent Triage queue)
 */
export function detectActionCard(
  subject: string,
  body: string,
  fromEmail: string
): ActionCardData | undefined {
  const content = `${subject} ${body}`.toLowerCase();

  // 1. Subscription price increase / renewal / recurring billing receipt
  const isSubscription =
    content.includes("price increase") ||
    content.includes("rate increase") ||
    content.includes("pricing update") ||
    content.includes("subscription update") ||
    content.includes("subscription renewed") ||
    content.includes("subscription renewal") ||
    content.includes("membership renewal") ||
    content.includes("your renewal") ||
    content.includes("monthly receipt") ||
    content.includes("subscription receipt") ||
    content.includes("billing receipt") ||
    content.includes("upcoming charge") ||
    content.includes("next billing cycle") ||
    content.includes("auto-renewal") ||
    (content.includes("receipt") && (content.includes("monthly") || content.includes("annual") || content.includes("plan")));

  if (isSubscription) {
    let service = fromEmail.split("@")[1]?.split(".")[0] || "Subscription";
    service = service.charAt(0).toUpperCase() + service.slice(1);
    const priceMatch = content.match(/\$[\d]+(\.[\d]{2})?/);
    const costMonthly = priceMatch ? `${priceMatch[0]}/mo` : undefined;

    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const autoTriggerAt = Date.now() + fiveDaysMs;

    return {
      type: "cancellation",
      service,
      costMonthly,
      recommendedAction: `Subscription active for ${service}. Auto-triggers cancellation or discount negotiation in 5 days.`,
      autoTriggerDays: 5,
      autoTriggerAt,
      status: "pending",
      cancellationMethod: "portal",
      recommendedTier: "tier1_agentmail",
    };
  }

  // 2. Data Removal / CCPA / Privacy
  if (
    content.includes("privacy policy") ||
    content.includes("data deletion") ||
    content.includes("personal information") ||
    content.includes("ccpa") ||
    content.includes("gdpr") ||
    content.includes("terms of service update")
  ) {
    let service = fromEmail.split("@")[1]?.split(".")[0] || "Service";
    service = service.charAt(0).toUpperCase() + service.slice(1);

    return {
      type: "data-removal",
      service,
      recommendedAction: `Dispatch automated CCPA/GDPR privacy deletion request to ${service}.`,
      autoTriggerDays: 3,
      status: "pending",
    };
  }

  // 3. Spam / Takedown / Newsletter
  if (
    content.includes("unsubscribe") &&
    (content.includes("promotional") ||
      content.includes("marketing") ||
      content.includes("newsletter") ||
      content.includes("special offer"))
  ) {
    let service = fromEmail.split("@")[1]?.split(".")[0] || "Newsletter";
    service = service.charAt(0).toUpperCase() + service.slice(1);

    return {
      type: "spam-takedown",
      service,
      recommendedAction: `1-Click automated unsubscribe and block sender domain (${service}).`,
      autoTriggerDays: 1,
      status: "pending",
    };
  }

  return undefined;
}
