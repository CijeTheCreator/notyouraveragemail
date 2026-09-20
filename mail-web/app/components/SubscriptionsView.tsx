"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ArrowUpRight, RotateCw, Check, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionsViewProps {
  inboxId: string;
}

function ServiceLogo({ domain, name }: { domain: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  const cleanDomain = domain
    ? domain.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]
    : "";

  if (error || !cleanDomain) {
    return (
      <div className="size-8 rounded-md bg-[#f6f6f9] border border-[#00000014] text-[#111114] font-semibold text-xs flex items-center justify-center shrink-0">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${cleanDomain}`}
      alt={name}
      onError={() => setError(true)}
      className="size-8 rounded-md border border-[#00000014] object-contain bg-white shrink-0 p-1"
      loading="lazy"
    />
  );
}

export default function SubscriptionsView({ inboxId }: SubscriptionsViewProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const rawSubscriptions = useQuery(
    api.pipeline.subscriptionCancellation.listSubscriptions,
    { inboxId }
  );
  const oneClickCancelAction = useAction(
    api.pipeline.subscriptionCancellation.executeOneClickCancel
  );

  const subscriptions = useMemo(() => rawSubscriptions || [], [rawSubscriptions]);

  // Compute stats for Firecrawl metric cards
  const totalTrackedSpend = useMemo(() => {
    let sum = 0;
    for (const sub of subscriptions) {
      if (sub.status !== "cancelled") {
        const match = sub.costMonthly.match(/\$?([\d]+(?:\.[\d]{2})?)/);
        if (match) {
          sum += parseFloat(match[1]);
        }
      }
    }
    return sum.toFixed(2);
  }, [subscriptions]);

  const activeCount = useMemo(() => {
    return subscriptions.filter((s) => s.status !== "cancelled").length;
  }, [subscriptions]);

  const cancelledCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === "cancelled").length;
  }, [subscriptions]);

  const handleOneClickCancel = async (sub: (typeof subscriptions)[0]) => {
    setCancellingId(sub.messageId);
    try {
      const res = await oneClickCancelAction({
        messageId: sub.messageId,
        service: sub.service,
        domain: sub.domain,
        portalUrl: sub.portalUrl,
      });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || `Failed to cancel ${sub.service}`);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex-1 bg-[#fafafb] flex flex-col h-screen overflow-hidden font-sans select-none">
      {/* 56px Top Header Bar */}
      <header className="h-14 flex-shrink-0 border-b border-[#00000014] px-4 flex items-center justify-between gap-3 bg-[#fafafb]">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#797981] font-medium hidden sm:inline">Inboxes</span>
          <span className="text-xs text-[#797981] hidden sm:inline">/</span>
          <h2 className="text-xs font-semibold text-[#111114] tracking-tight truncate">
            Subscriptions
          </h2>
          <span className="text-[11px] font-mono text-[#797981] ml-1 bg-black/5 px-1.5 py-0.5 rounded">
            {subscriptions.length}
          </span>
        </div>
      </header>

      {/* Firecrawl-Style Stat Cards Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0">
        <div className="border border-[#00000014] bg-white rounded-lg shadow-xs overflow-hidden">
          <div className="flex flex-wrap lg:flex-nowrap divide-y lg:divide-y-0 lg:divide-x divide-[#00000014]">
            {/* Card 1: Monthly Spend */}
            <div className="flex-1 min-w-[180px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Monthly Spend
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#111114]">
                ${totalTrackedSpend}<span className="text-xs font-normal text-[#797981] font-sans">/mo</span>
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Tracked recurring spend
              </div>
            </div>

            {/* Card 2: Active Subscriptions */}
            <div className="flex-1 min-w-[180px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Active Subscriptions
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#111114]">
                {activeCount}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Active billing detected
              </div>
            </div>

            {/* Card 3: Cancelled Subscriptions */}
            <div className="flex-1 min-w-[180px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Cancelled
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#186a23]">
                {cancelledCount}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Cancelled via 1-click
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pb-4 overflow-hidden">
        <div className="border border-[#00000014] bg-white rounded-lg shadow-xs flex-1 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#f6f6f9] border-b border-[#00000014] px-5 py-2.5 text-[11px] font-semibold text-[#797981] uppercase tracking-wider flex items-center justify-between select-none shrink-0">
            <div className="w-5/12 sm:w-1/2">Service</div>
            <div className="w-3/12 sm:w-1/4">Monthly Cost</div>
            <div className="w-4/12 sm:w-1/4 text-right pr-2">Action</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#00000014]">
            {subscriptions.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-2 text-[#797981]">
                <div className="size-10 rounded-full border border-[#00000014] bg-[#fafafb] flex items-center justify-center text-[#797981] mb-1">
                  <CreditCard className="size-5" />
                </div>
                <p className="font-semibold text-xs text-[#111114]">No subscriptions found</p>
                <p className="text-[11px] text-[#797981] max-w-sm">
                  Inbound subscription receipts and renewal notices will automatically appear here once received in your inbox.
                </p>
              </div>
            ) : (
              subscriptions.map((sub) => {
                const isCancelling =
                  (cancellingId === sub.messageId || sub.status === "cancelling") &&
                  sub.status !== "requires-human-action" &&
                  sub.status !== "cancelled";
                const isCancelled = sub.status === "cancelled";

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#eeeef1]/40 transition-colors"
                  >
                    {/* Left: Logo & Name / Domain */}
                    <div className="w-5/12 sm:w-1/2 flex items-center gap-3 min-w-0 pr-4">
                      <ServiceLogo domain={sub.domain} name={sub.service} />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#111114] block truncate">
                          {sub.service}
                        </span>
                        <span className="text-[11px] text-[#797981] font-mono block truncate">
                          {sub.domain}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Monthly Cost */}
                    <div className="w-3/12 sm:w-1/4 shrink-0 font-mono text-xs font-semibold text-[#111114]">
                      {sub.costMonthly}
                    </div>

                    {/* Right: Actions */}
                    <div className="w-4/12 sm:w-1/4 flex items-center justify-end gap-2 shrink-0">
                      {isCancelled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#186a23]/10 text-[#186a23] border border-[#186a23]/20 px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5">
                            <Check className="size-3 stroke-[2.5]" />
                            <span>Cancelled</span>
                          </span>
                          {(sub as any).cancellationScreenshotUrl && (
                            <a
                              href={(sub as any).cancellationScreenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#161619] px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors"
                              title="View Screenshot Proof of Cancellation"
                            >
                              <span>Proof</span>
                              <ArrowUpRight className="size-3 text-[#797981]" />
                            </a>
                          )}
                        </div>
                      ) : isCancelling ? (
                        <button
                          disabled
                          className="bg-[#111114]/80 text-[#fafafb] px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <RotateCw className="size-3 animate-spin" />
                          <span>Cancelling...</span>
                        </button>
                      ) : sub.status === "requires-human-action" ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={sub.portalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#8d5400]/10 border border-[#8d5400]/20 text-[#8d5400] hover:bg-[#8d5400]/20 px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors"
                            title="Autonomous cancel did not complete. Click to open provider portal."
                          >
                            <AlertCircle className="size-3" />
                            <span>Manual Cancel</span>
                            <ArrowUpRight className="size-3" />
                          </a>
                          {sub.isMagicLink && (
                            <button
                              onClick={() => handleOneClickCancel(sub)}
                              className="bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#161619] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
                              title="Retry autonomous cancel"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      ) : sub.isMagicLink ? (
                        <button
                          onClick={() => handleOneClickCancel(sub)}
                          className="bg-[#111114] hover:bg-black/90 text-[#fafafb] px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <span>One-Click Cancel</span>
                        </button>
                      ) : (
                        <a
                          href={sub.portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#161619] px-3.5 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Cancel</span>
                          <ArrowUpRight className="size-3 text-[#797981]" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
