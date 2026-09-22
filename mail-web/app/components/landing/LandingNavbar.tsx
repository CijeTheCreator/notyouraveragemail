"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { ArrowRight, ExternalLink, Menu, X } from "lucide-react";
import { CrosshairNotch } from "./FirecrawlPrimitives";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function LandingNavbar() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 left-0 w-full z-[101] bg-[#fafafb]/90 backdrop-blur-md select-none transition-colors">
      {/* Container vertical border lines */}
      <div className="absolute top-0 max-w-7xl mx-auto border-x border-black/[0.08] h-full pointer-events-none inset-x-0" />

      {/* Horizontal bottom border line */}
      <div className="h-1 bg-black/[0.08] w-full left-0 bottom-0 absolute" />

      {/* Crosshair notches at the bottom corners of the container */}
      <div className="max-w-7xl mx-auto absolute h-full pointer-events-none top-0 inset-x-0 hidden sm:block">
        <CrosshairNotch className="absolute -left-[10.5px] -bottom-[10px]" />
        <CrosshairNotch className="absolute -right-[10.5px] -bottom-[10px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6 relative">
        {/* Brand Text Only - No Logo Picture */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[#111114] hover:opacity-85 transition-opacity"
        >
          <span className="text-[15px] tracking-tight text-[#111114]">
            <span className="font-bold">NotYourAverage</span>
            <span className="font-normal text-[#5a5a61]">Mail</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-[#5a5a61]">
          <a
            href="#features"
            className="hover:text-[#111114] transition-colors"
          >
            Features
          </a>
          <a
            href="#companion"
            className="hover:text-[#111114] transition-colors"
          >
            MailBuddy
          </a>
          <a
            href="#qypa"
            className="hover:text-[#111114] transition-colors"
          >
            QYPA
          </a>
          <a
            href="https://www.skills.sh/cijethecreator/notyouraveragemail-skills/unsub-skill"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[#111114] transition-colors"
          >
            <span>/Unsub skill</span>
            <ExternalLink className="size-3 text-[#797981]" />
          </a>
          <a
            href="https://www.skills.sh/cijethecreator/notyouraveragemail-skills/opt-out-skill"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[#111114] transition-colors"
          >
            <span>/Opt-out skill</span>
            <ExternalLink className="size-3 text-[#797981]" />
          </a>
        </nav>

        {/* Right Side: GitHub + Action CTA ('Mail' if authenticated) */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/CijeTheCreator/notyouraveragemail"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded border border-black/[0.08] bg-white hover:bg-black/[0.03] text-xs font-mono text-[#111114] transition-all shadow-2xs"
          >
            <GithubIcon className="size-3.5" />
            <span>GitHub</span>
          </a>

          {!isLoading && isAuthenticated ? (
            <Link
              href="/mail"
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded bg-[#111114] hover:bg-black text-white text-xs font-mono font-medium transition-all shadow-sm"
            >
              <span>Mail</span>
              <ArrowRight className="size-3" />
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded bg-[#111114] hover:bg-black text-white text-xs font-mono font-medium transition-all shadow-sm"
            >
              <span>Open Mail</span>
              <ArrowRight className="size-3" />
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded text-[#5a5a61] hover:text-[#111114] hover:bg-black/[0.04] transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/[0.08] bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-3 font-mono text-xs">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#5a5a61] hover:text-[#111114] py-1"
          >
            Features
          </a>
          <a
            href="#companion"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#5a5a61] hover:text-[#111114] py-1"
          >
            MailBuddy
          </a>
          <a
            href="#qypa"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#5a5a61] hover:text-[#111114] py-1"
          >
            QYPA
          </a>
          <a
            href="https://www.skills.sh/cijethecreator/notyouraveragemail-skills/unsub-skill"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-1 text-[#5a5a61] hover:text-[#111114] py-1"
          >
            <span>/Unsub skill</span>
            <ExternalLink className="size-3 text-[#797981]" />
          </a>
          <a
            href="https://www.skills.sh/cijethecreator/notyouraveragemail-skills/opt-out-skill"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-1 text-[#5a5a61] hover:text-[#111114] py-1"
          >
            <span>/Opt-out skill</span>
            <ExternalLink className="size-3 text-[#797981]" />
          </a>
          <div className="pt-2 border-t border-black/[0.06] flex items-center gap-3">
            <a
              href="https://github.com/CijeTheCreator/notyouraveragemail"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#111114]"
            >
              <GithubIcon className="size-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
