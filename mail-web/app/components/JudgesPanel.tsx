"use client";

import React, { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  X,
  ExternalLink,
  RotateCw,
  Check,
  Copy,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { FolderType } from "../types";

interface JudgesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inboxId: string;
  userEmail?: string;
  userName?: string;
  onNavigateFolder?: (folder: FolderType) => void;
}

export default function JudgesPanel({
  isOpen,
  onClose,
  inboxId,
  userEmail,
  userName,
  onNavigateFolder,
}: JudgesPanelProps) {
  const [activeTab, setActiveTab] = useState<"web" | "desktop">("web");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isStartingRemoval, setIsStartingRemoval] = useState(false);
  const [copiedInstallCmd, setCopiedInstallCmd] = useState(false);

  // Convex mutations and actions
  const saveUserSubscriptionMutation = useMutation(api.testCheckout.saveUserSubscription);
  const startRemovalAction = useAction(api.dataBrokers.startRemoval);

  if (!isOpen) return null;

  const targetEmail = inboxId || userEmail || "alex@agentmail.to";
  const targetName = userName || (targetEmail.split("@")[0] || "Judge");

  const subscriptionPortalUrl =
    process.env.NEXT_PUBLIC_TEST_SUBSCRIPTION_PORTAL_URL ||
    "https://notreallyadobe.aka0lisa.dev/plans";
  const brokerPortalUrl =
    process.env.NEXT_PUBLIC_TEST_BROKER_PORTAL_URL ||
    "https://notreallydatabroker.aka0lisa.dev/optout";
  const testOtpUrl =
    process.env.NEXT_PUBLIC_TEST_OTP_URL ||
    "http://localhost:3002/otp";
  const installScriptUrl =
    process.env.NEXT_PUBLIC_COMPANION_INSTALL_SCRIPT_URL ||
    "https://raw.githubusercontent.com/CijeTheCreator/modern-mail/main/mail-desktop/scripts/install.sh";

  const installCommand = `curl -fsSL ${installScriptUrl} | bash`;

  const getDisplayHost = (urlStr: string) => {
    try {
      return new URL(urlStr).host;
    } catch {
      return urlStr.replace(/^https?:\/\//, "").split("/")[0];
    }
  };

  // Handler: Start test NotReallyAdobe subscription
  const handleStartSubscription = async () => {
    setIsSubscribing(true);
    const toastId = toast.loading("Creating NotReallyAdobe Creative Cloud subscription...");
    try {
      await saveUserSubscriptionMutation({
        email: targetEmail,
        name: targetName,
        planName: "NotReallyAdobe Creative Cloud",
        costMonthly: "$59.99/mo",
        renewalDate: "Oct 16, 2026",
        portalUrl: subscriptionPortalUrl,
      });
      toast.success("Subscription created! Check Inbox & Subscriptions tab.", {
        id: toastId,
        description: "NotReallyAdobe confirmation email & One-Click Cancel action card generated.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to start subscription:", err);
      toast.error("Could not create test subscription", {
        id: toastId,
        description: msg || "Please check Convex connection.",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  // Handler: Trigger test broker removal
  const handleTestBrokerRemoval = async () => {
    setIsStartingRemoval(true);
    const toastId = toast.loading("Dispatching opt-out request to NotReallyDataBroker...");
    try {
      const res = await startRemovalAction({
        inboxId: targetEmail,
        brokerId: "notreallydatabroker",
      });
      toast.success(res?.message || "Removal request dispatched!", {
        id: toastId,
        description: "Data removal agent initiated opt-out pipeline.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to start removal:", err);
      toast.error("Could not start broker removal", {
        id: toastId,
        description: msg || "Check Convex broker tables.",
      });
    } finally {
      setIsStartingRemoval(false);
    }
  };

  // Copy install script command
  const handleCopyInstallCmd = () => {
    navigator.clipboard.writeText(installCommand);
    setCopiedInstallCmd(true);
    setTimeout(() => setCopiedInstallCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Gentle Blur Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-xs transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Slideout Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-[480px] bg-white border-l border-[#00000014] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-250">
          {/* Top Segmented Tab Switcher with Minimal Close */}
          <div className="p-3 border-b border-[#00000014] bg-[#fafafb] flex items-center justify-between gap-3">
            <div className="grid grid-cols-2 p-1 bg-[#eeeef1] rounded-lg gap-1 flex-1">
              <button
                onClick={() => setActiveTab("web")}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                  activeTab === "web"
                    ? "bg-white text-[#111114] shadow-xs"
                    : "text-[#5a5a61] hover:text-[#111114]"
                }`}
              >
                Web Application
              </button>
              <button
                onClick={() => setActiveTab("desktop")}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                  activeTab === "desktop"
                    ? "bg-white text-[#111114] shadow-xs"
                    : "text-[#5a5a61] hover:text-[#111114]"
                }`}
              >
                Desktop Companion
              </button>
            </div>

            <button
              onClick={onClose}
              className="size-7 rounded-md border border-[#00000014] bg-white hover:bg-[#f6f6f9] text-[#797981] hover:text-[#111114] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close panel (Esc)"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === "web" ? (
              <>
                {/* Feature 1: Subscription Cancellation */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#111114]">
                    Subscription Cancellation
                  </h3>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    When receipt emails arrive, Modern Mail detects recurring charges, deploys an
                    autonomous cancellation agent via Firecrawl to navigate customer portals and
                    cancel plans, and returns screenshot proof of cancellation directly to the user.
                  </p>

                  <div className="bg-[#fafafb] border border-[#00000014] rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#111114]">
                        Subscription:
                      </span>
                      <span className="text-[11px] font-mono text-[#797981]">
                        NotReallyAdobe Creative Cloud
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleStartSubscription}
                        disabled={isSubscribing}
                        className="flex-1 bg-[#111114] hover:bg-black text-[#fafafb] py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw
                          className={`size-3 ${isSubscribing ? "animate-spin" : ""}`}
                        />
                        <span>{isSubscribing ? "Creating..." : "Start Test Subscription"}</span>
                      </button>

                      {onNavigateFolder && (
                        <button
                          onClick={() => {
                            onNavigateFolder("subscriptions");
                            onClose();
                          }}
                          className="bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#111114] py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Subscriptions Tab</span>
                          <ArrowRight className="size-3" />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-[#797981] flex items-center gap-1 pt-1">
                      <span>Live Portal:</span>
                      <a
                        href={subscriptionPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#111114] underline hover:text-black inline-flex items-center gap-0.5"
                      >
                        {getDisplayHost(subscriptionPortalUrl)}
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                </section>

                <hr className="border-t border-[#00000014]" />

                {/* Feature 2: Remove your personal information */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#111114]">
                    Remove your personal information
                  </h3>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    Modern Mail indexes hundreds of data brokers, automates formal opt-out requests,
                    automatically replies to emails from them, and tries to use Firecrawl to interact with
                    the pages if needed. It takes proactive measures to prevent spam and protect your privacy.
                  </p>

                  <div className="bg-[#fafafb] border border-[#00000014] rounded-lg p-3 space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleTestBrokerRemoval}
                        disabled={isStartingRemoval}
                        className="flex-1 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#111114] py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw
                          className={`size-3 ${isStartingRemoval ? "animate-spin" : ""}`}
                        />
                        <span>{isStartingRemoval ? "Running..." : "Test Broker Opt-Out"}</span>
                      </button>

                      {onNavigateFolder && (
                        <button
                          onClick={() => {
                            onNavigateFolder("data-removal");
                            onClose();
                          }}
                          className="bg-[#111114] hover:bg-black text-[#fafafb] py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Data Removal Tab</span>
                          <ArrowRight className="size-3" />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-[#797981] flex items-center gap-1 pt-1">
                      <span>Live Portal:</span>
                      <a
                        href={brokerPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#111114] underline hover:text-black inline-flex items-center gap-0.5"
                      >
                        {getDisplayHost(brokerPortalUrl)}
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                </section>

                <hr className="border-t border-[#00000014]" />

                {/* Feature 3: Trust Intelligence */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#111114]">
                    Trust Intelligence
                  </h3>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    Modern Mail extracts the sender&apos;s business domain and scrapes TrustPilot in real
                    time to evaluate company reputation, star ratings, review counts, and complaint signals
                    (such as scam or billing disputes).
                  </p>

                  <div className="bg-[#fafafb] border border-[#00000014] rounded-lg p-3 space-y-2">
                    <span className="text-xs font-medium text-[#111114] block">
                      How to inspect the result:
                    </span>
                    <p className="text-xs text-[#5a5a61] leading-relaxed">
                      Open any business email in your inbox (such as NotReallyAdobe or Stripe). In the top
                      of the reader next to the sender&apos;s address, click the Trust Score badge to view
                      the verified TrustPilot score and rating breakdown.
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Installation Guide at the top */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#111114]">
                    Installation Guide
                  </h3>

                  <div className="bg-[#fafafb] border border-[#00000014] rounded-lg p-3 space-y-2">
                    <p className="text-xs text-[#5a5a61] leading-relaxed">
                      Run this simple one-line script in your terminal to install and launch the desktop companion:
                    </p>

                    <div className="flex items-center justify-between bg-white border border-[#00000014] rounded p-2 text-xs font-mono text-[#111114]">
                      <span className="truncate mr-2">{installCommand}</span>
                      <button
                        onClick={handleCopyInstallCmd}
                        className="text-[#797981] hover:text-[#111114] shrink-0 cursor-pointer"
                        title="Copy install command"
                      >
                        {copiedInstallCmd ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Clicky YC inspiration short summary */}
                <div className="bg-[#f6f6f9] border border-[#00000014] rounded-lg p-3">
                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    Inspired by Clicky (a YC app), Modern Mail Companion is an ambient AI buddy living
                    beside your cursor to handle email workflows seamlessly across your computer.
                  </p>
                </div>

                <hr className="border-t border-[#00000014]" />

                {/* Feature 1: OTP buddy */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#111114]">
                    OTP buddy
                  </h3>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    When an OTP or 2FA verification email arrives, the companion intercepts the message,
                    detects the code, locates the OTP input field on your active screen, and automatically
                    fills the digits into the field.
                  </p>

                  <div className="bg-[#fafafb] border border-[#00000014] rounded-lg p-3 space-y-2.5">
                    <a
                      href={testOtpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-[#111114] hover:bg-black text-[#fafafb] py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors text-center"
                    >
                      <span>Open Test OTP Site</span>
                      <ExternalLink className="size-3" />
                    </a>

                    <p className="text-[11px] text-[#797981] leading-relaxed">
                      Open the test OTP page, enter your mailbox address, and watch the companion automatically
                      navigate to the input and fill the code.
                    </p>
                  </div>
                </section>

                <hr className="border-t border-[#00000014]" />

                {/* Feature 2: Contextual Drafting */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#111114]">
                      Contextual Drafting
                    </h3>
                    <kbd className="text-[10px] font-mono bg-[#f6f6f9] border border-[#00000014] px-1.5 py-0.5 rounded text-[#111114]">
                      ⌘⇧M
                    </kbd>
                  </div>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    Draft context-rich emails directly from any application on your computer — Pages, Keynote,
                    Figma, or your web browser. Select any file, document, or screen content and press{" "}
                    <kbd className="font-mono text-[10px] bg-black/5 px-1 py-0.5 rounded">⌘⇧M</kbd> to
                    instantly draft an email from anywhere. The agent also uses Firecrawl to search the web
                    and automatically discover the right recipient email contacts if they aren&apos;t already
                    in your address book.
                  </p>
                </section>

                <hr className="border-t border-[#00000014]" />

                {/* Feature 3: Voice Push-To-Talk (at the bottom) */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#111114]">
                      Voice Push-To-Talk
                    </h3>
                    <kbd className="text-[10px] font-mono bg-[#f6f6f9] border border-[#00000014] px-1.5 py-0.5 rounded text-[#111114]">
                      Control + Option (⌃⌥)
                    </kbd>
                  </div>

                  <p className="text-xs text-[#5a5a61] leading-relaxed">
                    Hold <kbd className="font-mono text-[10px] bg-black/5 px-1 py-0.5 rounded">⌃⌥</kbd> anywhere
                    on your computer and speak. Streaming voice dictation translates your voice directly into
                    structured email drafts ready for review or sending.
                  </p>
                </section>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#00000014] bg-[#fafafb] flex items-center justify-between text-xs text-[#797981]">
            <span>Press <kbd className="font-mono text-[10px] bg-black/5 px-1 py-0.5 rounded">Esc</kbd> to exit</span>
            <button
              onClick={onClose}
              className="text-xs font-medium text-[#111114] hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
