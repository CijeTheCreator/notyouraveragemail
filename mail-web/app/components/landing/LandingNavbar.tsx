"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { ArrowRight, Menu, X } from "lucide-react";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-[#fafafb]/85 backdrop-blur-md border-b border-black/[0.07] shadow-xs"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center text-sm font-semibold tracking-tight text-[#111114] hover:opacity-85 transition-opacity"
        >
          <span className="font-semibold text-[13.5px] tracking-tight text-[#111114]">
            <span className="italic">NotYourAverage</span>Mail
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#5a5a61]">
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
            Desktop Companion
          </a>
          <a
            href="#install"
            className="hover:text-[#111114] transition-colors"
          >
            Install
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* GitHub link */}
          <a
            href="https://github.com/CijeTheCreator/modern-mail"
            target="_blank"
            rel="noreferrer"
            className="size-8 rounded-md border border-black/[0.08] bg-white hover:bg-black/[0.03] text-[#5a5a61] hover:text-[#111114] flex items-center justify-center transition-colors"
            title="View on GitHub"
          >
            <GithubIcon className="size-4" />
          </a>

          {/* Auth State Button */}
          {!isLoading && isAuthenticated ? (
            <Link
              href="/mail"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#111114] hover:bg-black text-white text-xs font-medium transition-all shadow-xs"
            >
              <span>Go to Inbox</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="text-xs font-medium text-[#5a5a61] hover:text-[#111114] px-2.5 py-1.5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#111114] hover:bg-black text-white text-xs font-medium transition-all shadow-xs"
              >
                <span>Open Mail</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden size-8 rounded-md border border-black/[0.08] bg-white flex items-center justify-center text-[#5a5a61]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#fafafb] border-b border-black/[0.08] px-4 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-[#5a5a61] hover:text-[#111114] py-1"
          >
            Features
          </a>
          <a
            href="#companion"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-[#5a5a61] hover:text-[#111114] py-1"
          >
            Desktop Companion
          </a>
          <a
            href="#install"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-[#5a5a61] hover:text-[#111114] py-1"
          >
            Install
          </a>
        </div>
      )}
    </header>
  );
}
