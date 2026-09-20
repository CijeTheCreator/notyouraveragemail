"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, Download } from "lucide-react";
import { toast } from "sonner";
import { CornerBrackets } from "./FirecrawlPrimitives";

export default function InstallCommandCard() {
  const [copied, setCopied] = useState(false);
  const installCommand =
    "curl -fsSL https://raw.githubusercontent.com/CijeTheCreator/modern-mail/main/mail-desktop/scripts/install.sh | bash";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    toast.success("Install command copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="install"
      className="max-w-7xl mx-auto border-x border-black/[0.08] relative -mt-1 bg-[#fafafb] select-none scroll-mt-16"
    >
      {/* Top and Bottom Horizontal Divider Lines */}
      <div className="h-1 top-0 left-0 w-full bg-black/[0.08] absolute" />
      <div className="h-1 bottom-0 left-0 w-full bg-black/[0.08] absolute" />
      <CornerBrackets strokeColor="text-black/[0.12]" />

      <div className="p-8 sm:p-12 lg:p-16 border-b border-black/[0.08] bg-white relative">
        <CornerBrackets strokeColor="text-black/[0.06]" />

        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-4">
            Install the Desktop Companion <br />
            <span className="text-[#5a5a61]">in seconds.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal mb-8">
            Run this single line in your terminal to download, verify, and launch the companion
            app directly into your menu bar.
          </p>

          {/* Terminal Box */}
          <div className="rounded border border-black/[0.12] bg-[#111114] overflow-hidden shadow-xs relative">
            <CornerBrackets strokeColor="text-white/10" />

            {/* Window Chrome Header */}
            <div className="px-4 py-2.5 bg-[#1a1a1e] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#ff5f56]" />
                <span className="size-2 rounded-full bg-[#ffbd2e]" />
                <span className="size-2 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-[11px] font-mono text-white/50">
                bash — companion-install.sh
              </span>
              <div className="w-10" />
            </div>

            {/* Command Line */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-3 font-mono text-xs sm:text-sm text-white whitespace-nowrap">
                <span className="text-emerald-400 select-none">$</span>
                <span className="selection:bg-white/20">{installCommand}</span>
              </div>

              <button
                onClick={handleCopy}
                className="size-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Copy command"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
