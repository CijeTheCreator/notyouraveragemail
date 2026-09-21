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
      "NotYourAverageMail brings your subscriptions into one place. When you want to cancel, just click cancel and it takes care of the rest, navigating the customer portal and sending you screenshot proof when it’s done.",
    stack: ["firecrawl", "agentmail", "openai", "convex"],
  },
  {
    title: "Remove Your Personal Information",
    description:
      "NotYourAverageMail finds your information across hundreds of data brokers. With one click, it sends opt-out requests, handles replies, and interacts with their websites when needed to get your data removed. It takes proactive steps to reduce spam and protect your privacy.",
    stack: ["firecrawl", "agentmail", "openai", "convex"],
  },
  {
    title: "Know Your Sender",
    description:
      "NotYourAverageMail checks the sender against Trustpilot in real time, showing you their rating, review count, and complaint signals right next to the email. See who you’re dealing with before you click, reply, or buy.",
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

function formatBrandText(text: string): React.ReactNode {
  if (!text.includes("NotYourAverageMail")) return text;
  const parts = text.split("NotYourAverageMail");
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 && (
        <span>
          <strong className="font-bold text-[#111114]">NotYourAverage</strong>Mail
        </span>
      )}
      {part}
    </React.Fragment>
  ));
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
            address. <strong className="font-bold text-[#111114]">NotYourAverage</strong>Mail puts
            subscription cancellations in one place, so you can cancel multiple subscriptions from
            your inbox, while proactively taking steps to not only filter spam, but request deletion
            of your data from data brokers.
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
                {formatBrandText(feat.description)}
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
