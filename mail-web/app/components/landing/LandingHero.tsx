"use client";

import React from "react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { ArrowRight, Terminal } from "lucide-react";
import { HexagonPattern } from "@/app/components/ui/hexagon-pattern";

export default function LandingHero() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <section className="relative pt-20 pb-20 md:pt-32 md:pb-28 overflow-hidden">
      {/* Hexagon Pattern Background filling the hero section */}
      <div className="absolute inset-0 pointer-events-none">
        <HexagonPattern
          radius={44}
          gap={3}
          strokeDasharray="0"
          className="stroke-black/[0.06] fill-transparent"
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#111114] leading-[1.08] mb-6 max-w-4xl mx-auto">
          An All Gas, No Brakes way of experiencing mail
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#5a5a61] max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
          An AI-native email engine built to do the dirty work. Auto-cancel predatory
          subscriptions with verified proof, wipe your identity from hundreds of data brokers,
          and control your inbox hands-free with an ambient macOS desktop companion.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isLoading && isAuthenticated ? (
            <Link
              href="/mail"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-[#111114] hover:bg-black text-white text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow"
            >
              <span>Go to Inbox</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-[#111114] hover:bg-black text-white text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow"
            >
              <span>Open Mail</span>
              <ArrowRight className="size-4" />
            </Link>
          )}

          <a
            href="#install"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-black/[0.1] bg-white hover:bg-black/[0.03] text-[#111114] text-xs font-medium transition-all shadow-2xs"
          >
            <Terminal className="size-3.5 text-[#5a5a61]" />
            <span>Install Companion</span>
          </a>
        </div>
      </div>
    </section>
  );
}
