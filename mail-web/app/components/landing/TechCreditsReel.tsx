"use client";

import React from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { CornerBrackets } from "./FirecrawlPrimitives";

interface TechPartner {
  name: string;
  role: string;
  logo: string;
  url: string;
}

const PARTNERS: TechPartner[] = [
  {
    name: "AgentMail",
    role: "Mail Infra",
    logo: "/svgs/agentmail-dark.svg",
    url: "https://agentmail.to",
  },
  {
    name: "Firecrawl",
    role: "Web Extraction & Interaction",
    logo: "/svgs/firecrawl-light.svg",
    url: "https://firecrawl.dev",
  },
  {
    name: "OpenAI",
    role: "LLM, Transcription & Computer Use API",
    logo: "/svgs/openai-dark.svg",
    url: "https://openai.com",
  },
  {
    name: "Codex",
    role: "Coding Agent",
    logo: "/svgs/codex-light.svg",
    url: "https://openai.com",
  },
  {
    name: "Convex",
    role: "Realtime Backend, Frontend Hosting",
    logo: "/svgs/convex.svg",
    url: "https://convex.dev",
  },
];

export default function TechCreditsReel() {
  return (
    <div className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-white select-none">
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />

      <div className="relative lg:flex items-stretch">
        {/* Left Side: Firecrawl-style Anchor Block */}
        <div className="p-8 lg:p-10 lg-max:text-center relative shrink-0 border-b lg:border-b-0 lg:border-r border-black/[0.08] flex flex-col justify-center min-w-[280px] lg:min-w-[360px] bg-white">
          <CornerBrackets strokeColor="text-black/[0.12]" />

          <div className="text-xl sm:text-2xl font-normal tracking-tight text-[#111114] leading-tight">
            Special thanks to <br />
            the stack powering <br />
            <span className="underline decoration-black/20 decoration-2 underline-offset-4">
              <span className="font-bold">NotYourAverage</span>Mail
            </span>
          </div>
        </div>

        {/* Right Side: Infinite Marquee Belt matching anchor height */}
        <div className="flex-1 min-w-0 relative overflow-hidden min-h-[148px] lg:min-h-[164px] flex items-stretch bg-[#fafafb]/60">
          <CornerBrackets strokeColor="text-black/[0.08]" />

          {/* Scrolling track: 2 identical sets of partner cards for seamless looping */}
          <div className="animate-firecrawl-marquee flex items-stretch h-full">
            {/* Set 1 */}
            <div className="flex items-stretch h-full">
              {PARTNERS.map((partner, i) => (
                <a
                  key={`partner-set1-${partner.name}-${i}`}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-full min-h-[148px] lg:min-h-[164px] -ml-1 relative w-[240px] lg:w-[260px] shrink-0 group cursor-pointer border-x border-black/[0.08] bg-white flex flex-col items-center justify-center p-6 transition-all duration-200 hover:bg-[#fafafb]"
                >
                  <CornerBrackets strokeColor="text-black/[0.06] group-hover:text-black/[0.18]" />

                  {/* Bottom Accent Bar on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#111114] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Logo + Text for what they did */}
                  <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center group-hover:-translate-y-1 transition-transform duration-200">
                    <div className="h-10 w-10 relative flex items-center justify-center">
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        width={38}
                        height={38}
                        className="object-contain max-h-10 max-w-10 filter drop-shadow-2xs group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#111114] tracking-tight">
                        {partner.name}
                      </div>
                      <div className="text-[11px] text-[#797981] font-mono leading-none mt-1">
                        {partner.role}
                      </div>
                    </div>
                  </div>

                  {/* Hover Slide-In Link */}
                  <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[#111114] text-[10px] font-mono font-medium opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
                    <ArrowUpRight className="size-3.5" />
                  </div>
                </a>
              ))}
            </div>

            {/* Set 2 */}
            <div className="flex items-stretch h-full">
              {PARTNERS.map((partner, i) => (
                <a
                  key={`partner-set2-${partner.name}-${i}`}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-full min-h-[148px] lg:min-h-[164px] -ml-1 relative w-[240px] lg:w-[260px] shrink-0 group cursor-pointer border-x border-black/[0.08] bg-white flex flex-col items-center justify-center p-6 transition-all duration-200 hover:bg-[#fafafb]"
                >
                  <CornerBrackets strokeColor="text-black/[0.06] group-hover:text-black/[0.18]" />

                  {/* Bottom Accent Bar on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#111114] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Logo + Text for what they did */}
                  <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-center group-hover:-translate-y-1 transition-transform duration-200">
                    <div className="h-10 w-10 relative flex items-center justify-center">
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        width={38}
                        height={38}
                        className="object-contain max-h-10 max-w-10 filter drop-shadow-2xs group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#111114] tracking-tight">
                        {partner.name}
                      </div>
                      <div className="text-[11px] text-[#797981] font-mono leading-none mt-1">
                        {partner.role}
                      </div>
                    </div>
                  </div>

                  {/* Hover Slide-In Link */}
                  <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[#111114] text-[10px] font-mono font-medium opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
                    <ArrowUpRight className="size-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
