import React from "react";
import { CreditCard, Shield, Star, CheckCircle2, ArrowUpRight } from "lucide-react";

export default function WebFeaturesSection() {
  const features = [
    {
      title: "Subscription Cancellation",
      tag: "Autonomous Web Agent",
      icon: <CreditCard className="size-4 text-[#111114]" />,
      description:
        "When receipts arrive, NotYourAverageMail detects recurring charges and dispatches an autonomous agent via Firecrawl to navigate account settings, cancel your plan, and return verified screenshot proof directly to your inbox.",
      highlights: [
        "Zero-click cancellation workflow",
        "Autonomous Firecrawl portal navigation",
        "Screenshot evidence delivered to mailbox",
      ],
      footnote: "Tested against real SaaS & enterprise cancellation flows",
    },
    {
      title: "Data Broker Wipe",
      tag: "Privacy & Anti-Spam",
      icon: <Shield className="size-4 text-[#111114]" />,
      description:
        "Indexes over 400 data brokers trading your personal contact information. Automates formal opt-out requests, handles follow-up verification emails automatically, and purges your digital footprint to eliminate spam at the source.",
      highlights: [
        "400+ indexed data brokers",
        "Automated CCPA/GDPR removal requests",
        "Autonomous reply & verification handling",
      ],
      footnote: "Proactive privacy protection before spam hits your inbox",
    },
    {
      title: "Trust Intelligence",
      tag: "Reputation Engine",
      icon: <Star className="size-4 text-[#111114]" />,
      description:
        "Extracts sender business domains in real time and scrapes TrustPilot to surface star ratings, verified review volume, and early warning signals for scams, fake invoices, and billing disputes right next to the sender header.",
      highlights: [
        "Live TrustPilot ratings & review counts",
        "Scam & deceptive billing signal detection",
        "Inline trust badges in the reader header",
      ],
      footnote: "Instant situational awareness on every commercial email",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-12">
      {/* Header */}
      <div className="max-w-2xl mb-14">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#797981] mb-2.5">
          Web Application · Autonomous Workflows
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111114] leading-tight mb-4">
          Built to run missions, not just receive messages.
        </h2>
        <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed">
          Traditional webmail sits passively while subscriptions renew and data brokers sell your address.
          NotYourAverageMail executes proactive autonomous workflows to protect your wallet and attention.
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            className="rounded-xl border border-black/[0.08] bg-white p-6 flex flex-col justify-between hover:border-black/[0.18] transition-all hover:shadow-xs group"
          >
            <div>
              {/* Card Top */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="size-8 rounded-md bg-[#fafafb] border border-black/[0.08] flex items-center justify-center">
                  {feature.icon}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/[0.04] text-[#5a5a61] border border-black/[0.06]">
                  0{idx + 1} // {feature.tag}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-semibold text-[#111114] tracking-tight mb-2.5 group-hover:text-black transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs text-[#5a5a61] leading-relaxed mb-6">
                {feature.description}
              </p>

              {/* Highlights */}
              <ul className="space-y-2 mb-6 pt-4 border-t border-black/[0.06]">
                {feature.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[#323237]">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footnote */}
            <div className="pt-4 border-t border-black/[0.06] text-[11px] text-[#797981] font-mono flex items-center justify-between">
              <span>{feature.footnote}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
