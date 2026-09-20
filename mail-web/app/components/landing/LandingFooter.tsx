"use client";

import React from "react";
import Link from "next/link";
import { CornerBrackets } from "./FirecrawlPrimitives";

export default function LandingFooter() {
  return (
    <footer className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-white select-none">
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />
      <CornerBrackets strokeColor="text-black/[0.12]" />

      {/* Main Footer Block */}
      <div className="p-8 sm:p-12 border-b border-black/[0.08] relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#fafafb]">
        <CornerBrackets strokeColor="text-black/[0.06]" />

        <div className="space-y-1.5">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-[#111114] hover:opacity-85 transition-opacity"
          >
            <span>NotYourAverage</span>
            <span className="font-normal text-[#5a5a61]">Mail</span>
          </Link>
          <p className="text-xs text-[#797981] font-mono">
            An All Gas, No Brakes way of experiencing mail.
          </p>
        </div>

        <div>
          <a
            href="https://github.com/CijeTheCreator/modern-mail"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#5a5a61] hover:text-[#111114] transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="p-6 sm:p-8 flex items-center justify-between text-[11px] font-mono text-[#797981] bg-white">
        <div>
          © {new Date().getFullYear()} NotYourAverageMail.
        </div>
      </div>
    </footer>
  );
}
