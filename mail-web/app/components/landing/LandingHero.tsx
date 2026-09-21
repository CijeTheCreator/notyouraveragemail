"use client";

import React from "react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { ArrowRight, Terminal } from "lucide-react";
import { HexagonPattern } from "@/app/components/ui/hexagon-pattern";
import { CornerBrackets } from "./FirecrawlPrimitives";

export default function LandingHero() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <section className="relative max-w-7xl mx-auto border-x border-black/[0.08] pt-20 pb-20 md:pt-28 md:pb-28 overflow-hidden bg-[#fafafb]">
      <CornerBrackets strokeColor="text-black/[0.08]" />

      {/* Hexagon Pattern Background filling the hero section */}
      <div className="absolute inset-0 pointer-events-none">
        <HexagonPattern
          radius={44}
          gap={3}
          strokeDasharray="0"
          className="stroke-black/[0.06] fill-transparent"
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-bold tracking-tight text-[#111114] leading-[1.1] mb-6 max-w-5xl mx-auto">
          An All Gas, No Brakes way <br className="hidden sm:inline" />
          to consume and compose mail
        </h1>

        {/* Subtitle - Friendly, Human, All Gas No Brakes */}
        <p className="text-base sm:text-lg text-[#5a5a61] max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
          An innovative mailbox that transforms how you manage email, making it easy to cancel
          subscriptions without linking your bank account, remove your personal information from data
          brokers, check live sender trust ratings, and take a fresh approach to composing and sending
          messages.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isLoading && isAuthenticated ? (
            <Link
              href="/mail"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded bg-[#111114] hover:bg-black text-white text-xs font-mono font-medium tracking-wide transition-all shadow-sm hover:shadow"
            >
              <span>Mail</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded bg-[#111114] hover:bg-black text-white text-xs font-mono font-medium tracking-wide transition-all shadow-sm hover:shadow"
            >
              <span>Open Mail</span>
              <ArrowRight className="size-4" />
            </Link>
          )}

          <a
            href="#install"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded border border-black/[0.1] bg-white hover:bg-black/[0.03] text-[#111114] text-xs font-mono font-medium transition-all shadow-2xs"
          >
            <Terminal className="size-3.5 text-[#5a5a61]" />
            <span>Install MailBuddy</span>
          </a>
        </div>
      </div>
    </section>
  );
}
