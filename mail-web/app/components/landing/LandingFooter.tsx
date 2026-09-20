import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";


export default function LandingFooter() {
  return (
    <footer className="border-t border-black/[0.08] bg-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-black/[0.06]">
          {/* Brand & Tagline */}
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-xs font-semibold text-[#111114] tracking-tight">
                <span className="italic">NotYourAverage</span>Mail
              </span>
            </div>
            <p className="text-xs text-[#797981] font-mono">
              An All Gas, No Brakes way of experiencing mail.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#5a5a61]">
            <a href="#features" className="hover:text-[#111114] transition-colors">
              Features
            </a>
            <a href="#companion" className="hover:text-[#111114] transition-colors">
              Desktop Companion
            </a>
            <a href="#install" className="hover:text-[#111114] transition-colors">
              Install
            </a>
            <a
              href="https://github.com/CijeTheCreator/modern-mail"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#111114] transition-colors inline-flex items-center gap-1"
            >
              <span>GitHub</span>
              <ArrowUpRight className="size-3" />
            </a>
            <Link
              href="/mail"
              className="hover:text-[#111114] font-medium transition-colors"
            >
              Open Webmail →
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#797981]">
          <div>
            © {new Date().getFullYear()} NotYourAverageMail. Autonomous agent orchestration.
          </div>
          <div>
            Built with OpenAI, Firecrawl, AgentMail, and Convex.
          </div>
        </div>
      </div>
    </footer>
  );
}
