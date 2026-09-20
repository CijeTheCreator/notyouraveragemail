"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";

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
    <section id="install" className="py-20 md:py-28 max-w-4xl mx-auto px-4 sm:px-6 scroll-mt-12 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/[0.08] bg-white text-[11px] font-mono text-[#5a5a61] mb-4">
        <Terminal className="size-3.5 text-[#111114]" />
        <span>One-Line Native Installer</span>
      </div>

      <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111114] leading-tight mb-4">
        Install the companion in seconds.
      </h2>
      <p className="text-sm sm:text-base text-[#5a5a61] max-w-xl mx-auto leading-relaxed mb-8">
        Run this single command in your macOS terminal to download, verify, and launch the companion app directly into your menu bar.
      </p>

      {/* Terminal Block */}
      <div className="text-left rounded-xl border border-black/[0.12] bg-[#161619] shadow-lg overflow-hidden max-w-3xl mx-auto">
        {/* Window Chrome Header */}
        <div className="px-4 py-2.5 bg-[#202024] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f56]" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[11px] font-mono text-white/50">
            bash — companion-install.sh
          </span>
          <div className="w-10" />
        </div>

        {/* Command Body */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-3 font-mono text-xs sm:text-sm text-[#fafafb] whitespace-nowrap">
            <span className="text-emerald-400 select-none">$</span>
            <span className="text-[#fafafb] selection:bg-white/20">
              {installCommand}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="size-8 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Copy command"
            aria-label="Copy install command"
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4 text-white/80" />
            )}
          </button>
        </div>
      </div>

      <p className="mt-4 text-[11px] font-mono text-[#797981]">
        Compatible with Apple Silicon & Intel macOS 13+ · Zero configuration required
      </p>
    </section>
  );
}
