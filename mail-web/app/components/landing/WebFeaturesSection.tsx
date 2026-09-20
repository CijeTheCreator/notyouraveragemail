"use client";

import React from "react";
import Image from "next/image";
import { CornerBrackets } from "./FirecrawlPrimitives";

const TECH_LOGOS = {
  firecrawl: { name: "Firecrawl", src: "/svgs/firecrawl-light.svg" },
  agentmail: { name: "AgentMail", src: "/svgs/agentmail-dark.svg" },
  openai: { name: "OpenAI", src: "/svgs/openai-dark.svg" },
  codex: { name: "Codex", src: "/svgs/codex-light.svg" },
  convex: { name: "Convex", src: "/svgs/convex.svg" },
} as const;

type TechKey = keyof typeof TECH_LOGOS;

interface Feature {
  title: string;
  description: string;
  stack: TechKey[];
}

const WEB_FEATURES: Feature[] = [
  {
    title: "Subscription Cancellation",
    description:
      "When receipt emails arrive, NotYourAverageMail detects recurring charges, deploys an autonomous cancellation agent via Firecrawl to navigate customer portals and cancel plans, and returns screenshot proof of cancellation directly to you.",
    stack: ["firecrawl", "agentmail", "openai", "convex"],
  },
  {
    title: "Remove Your Personal Information",
    description:
      "NotYourAverageMail indexes hundreds of data brokers, automates formal opt-out requests, automatically replies to emails from them, and uses Firecrawl to interact with the pages if needed. It takes proactive measures to prevent spam and protect your privacy.",
    stack: ["firecrawl", "agentmail", "convex"],
  },
  {
    title: "Trust Intelligence",
    description:
      "NotYourAverageMail extracts the sender's business domain and scrapes TrustPilot in real time to evaluate company reputation, star ratings, review counts, and complaint signals (such as scam or billing disputes) right beside the sender in your inbox.",
    stack: ["firecrawl", "openai", "convex"],
  },
];

function TechStackRow({ stack }: { stack: TechKey[] }) {
  return (
    <div className="flex items-center mt-6 pt-5 border-t border-black/[0.06]">
      <div className="flex -space-x-1 items-center">
        {stack.map((key) => {
          const tech = TECH_LOGOS[key];
          return (
            <div
              key={key}
              title={tech.name}
              className="size-7 rounded border border-black/[0.1] bg-white flex items-center justify-center p-1 shadow-2xs hover:scale-110 hover:z-10 transition-transform"
            >
              <Image
                src={tech.src}
                alt={tech.name}
                width={18}
                height={18}
                className="object-contain max-h-4 max-w-4"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WebFeaturesSection() {
  return (
    <section
      id="features"
      className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-white select-none scroll-mt-16"
    >
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />
      <CornerBrackets strokeColor="text-black/[0.12]" />

      {/* Header Block without 'WEB APPLICATION' */}
      <div className="p-8 sm:p-12 lg:p-16 border-b border-black/[0.08] relative">
        <CornerBrackets strokeColor="text-black/[0.06]" />
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-4">
            Built to run missions, <br />
            <span className="text-[#5a5a61]">not just receive messages.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal">
            Traditional webmail sits passively while subscriptions renew and data brokers sell your
            address. NotYourAverageMail executes proactive autonomous workflows to protect your
            wallet and privacy.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 relative">
        {WEB_FEATURES.map((feat, idx) => (
          <div
            key={feat.title}
            className={`p-8 sm:p-10 relative bg-white flex flex-col justify-between hover:bg-[#fafafb] transition-colors border-b md:border-b-0 ${
              idx < WEB_FEATURES.length - 1 ? "md:border-r border-black/[0.08]" : ""
            }`}
          >
            <CornerBrackets strokeColor="text-black/[0.06] group-hover:text-black/[0.16]" />

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#111114] mb-3">
                {feat.title}
              </h3>

              <p className="text-sm text-[#5a5a61] leading-relaxed font-normal">
                {feat.description}
              </p>
            </div>

            {/* Stack of tech logos only */}
            <TechStackRow stack={feat.stack} />
          </div>
        ))}
      </div>
    </section>
  );
}
