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

interface CompanionFeature {
  title: string;
  shortcut?: string;
  description: string;
  stack: TechKey[];
}

const COMPANION_FEATURES: CompanionFeature[] = [
  {
    title: "OTP Buddy",
    description:
      "When an OTP or 2FA verification email arrives, the companion intercepts the message, detects the code, locates the OTP input field on your active screen, and automatically fills the digits into the field.",
    stack: ["agentmail", "convex"],
  },
  {
    title: "Contextual Drafting",
    shortcut: "⌘⇧M",
    description:
      "Draft context-rich emails directly from any application on your computer — Pages, Keynote, Figma, or your web browser. Select any file, document, or screen content and press ⌘⇧M to instantly draft an email from anywhere. The agent also uses Firecrawl to search the web and automatically discover the right recipient email contacts if they aren't already in your address book.",
    stack: ["firecrawl", "openai", "codex", "convex"],
  },
  {
    title: "Voice Push-To-Talk",
    shortcut: "⌃⌥",
    description:
      "Hold Control + Option anywhere on your computer and speak. Streaming voice dictation translates your voice directly into structured email drafts ready for review or sending.",
    stack: ["openai", "convex"],
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

export default function DesktopCompanionSection() {
  return (
    <section
      id="companion"
      className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-white select-none scroll-mt-16"
    >
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />
      <CornerBrackets strokeColor="text-black/[0.12]" />

      {/* Header Block */}
      <div className="p-8 sm:p-12 lg:p-16 border-b border-black/[0.08] relative">
        <CornerBrackets strokeColor="text-black/[0.06]" />
        <div className="max-w-3xl">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#797981] mb-3">
            DESKTOP COMPANION
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-4">
            An ambient assistant living <br />
            <span className="text-[#5a5a61]">beside your cursor.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal">
            Inspired by Clicky (a YC app), NotYourAverageMail Companion is an ambient AI buddy living
            beside your cursor to handle email workflows seamlessly across your computer.
          </p>
        </div>
      </div>

      {/* 3 Capabilities Grid - Minimal with tech stack logos */}
      <div className="grid grid-cols-1 md:grid-cols-3 relative">
        {COMPANION_FEATURES.map((item, idx) => (
          <div
            key={item.title}
            className={`p-8 sm:p-10 relative bg-white flex flex-col justify-between hover:bg-[#fafafb] transition-colors border-b md:border-b-0 ${
              idx < COMPANION_FEATURES.length - 1 ? "md:border-r border-black/[0.08]" : ""
            }`}
          >
            <CornerBrackets strokeColor="text-black/[0.06] group-hover:text-black/[0.16]" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#111114]">
                  {item.title}
                </h3>
                {item.shortcut && (
                  <kbd className="px-2 py-0.5 rounded bg-black/[0.04] text-[11px] font-mono font-semibold text-[#111114] border border-black/[0.08]">
                    {item.shortcut}
                  </kbd>
                )}
              </div>

              <p className="text-sm text-[#5a5a61] leading-relaxed font-normal">
                {item.description}
              </p>
            </div>

            {/* Stack of tech logos */}
            <TechStackRow stack={item.stack} />
          </div>
        ))}
      </div>
    </section>
  );
}
