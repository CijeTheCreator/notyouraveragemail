"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { CornerBrackets } from "./FirecrawlPrimitives";

export default function InstallCommandCard() {
  const [activeTab, setActiveTab] = useState<"human" | "agent">("human");
  const [copied, setCopied] = useState(false);

  const humanCommand =
    "curl -fsSL https://steady-ram-494.convex.site/install.sh | bash";
  const agentCommand =
    "Run the one-line command to install and launch MailBuddy: curl -fsSL https://steady-ram-494.convex.site/install.sh | bash";

  const currentCommand = activeTab === "human" ? humanCommand : agentCommand;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCommand);
    setCopied(true);
    toast.success(
      activeTab === "human"
        ? "Install command copied to clipboard!"
        : "Agent command copied to clipboard!"
    );
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111114] leading-[1.1] mb-6">
            Install MailBuddy <br />
            <span className="text-[#5a5a61]">in seconds.</span>
          </h2>

          {/* Tabs without icons or emojis */}
          <div className="inline-flex p-1 rounded bg-black/[0.04] border border-black/[0.08] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("human");
                setCopied(false);
              }}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                activeTab === "human"
                  ? "bg-white text-[#111114] shadow-2xs"
                  : "text-[#5a5a61] hover:text-[#111114]"
              }`}
            >
              I am a Human
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("agent");
                setCopied(false);
              }}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                activeTab === "agent"
                  ? "bg-white text-[#111114] shadow-2xs"
                  : "text-[#5a5a61] hover:text-[#111114]"
              }`}
            >
              I am an Agent
            </button>
          </div>

          <p className="text-sm sm:text-base text-[#5a5a61] leading-relaxed max-w-2xl font-normal mb-8">
            {activeTab === "human"
              ? "Run it in your terminal to download, verify, and launch MailBuddy directly in your menu bar."
              : "Run the one-line command to install and launch MailBuddy."}
          </p>

          {/* Regular Code Box with Copy Button */}
          <div className="rounded border border-black/[0.12] bg-[#111114] p-4 sm:p-5 flex items-center justify-between gap-4 overflow-x-auto shadow-xs relative">
            <CornerBrackets strokeColor="text-white/10" />

            <div className="flex items-center gap-3 font-mono text-xs sm:text-sm text-white whitespace-nowrap">
              {activeTab === "human" && (
                <span className="text-emerald-400 select-none">$</span>
              )}
              <span className="selection:bg-white/20">{currentCommand}</span>
            </div>

            <button
              onClick={handleCopy}
              className="size-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Copy command"
            >
              {copied ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
