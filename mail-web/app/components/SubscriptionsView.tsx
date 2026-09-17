"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ArrowUpRight, RotateCw, Check } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionsViewProps {
  inboxId: string;
}

function ServiceLogo({ domain, name }: { domain: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  if (error || !domain) {
    return (
      <div className="w-8 h-8 rounded border-2 border-[#2c2a29] bg-[#D0B4FF] text-[#2c2a29] font-anton text-xs flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      onError={() => setError(true)}
      className="w-8 h-8 rounded border-2 border-[#2c2a29] object-contain bg-white flex-shrink-0 p-0.5"
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

  // Compute single Tracked Spend value
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
    <div className="flex-1 bg-[#FEFBEA] flex flex-col h-screen overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-4 border-b-2 border-[#2c2a29] bg-white/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-anton text-2xl tracking-wide text-[#2c2a29]">
            SUBSCRIPTIONS
          </h2>
          {/* Single Tracked Spend Pill */}
          <span className="bg-[#FEF08A] text-[#854D0E] border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm">
            Tracked Spend: ${totalTrackedSpend}/mo
          </span>
        </div>
      </div>

      {/* Subscriptions List - Identical layout to Mails Table */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-[#2c2a29]">
        {subscriptions.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
            <p className="font-bold text-base text-[#2c2a29]">No subscriptions found</p>
            <p className="text-xs text-gray-600 font-sans max-w-sm">
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
                className="p-4 flex items-center justify-between gap-6 hover:bg-white/60 transition-colors"
              >
                {/* Left: Logo & Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <ServiceLogo domain={sub.domain} name={sub.service} />
                  <div>
                    <span className="text-sm font-bold text-[#2c2a29] block truncate">
                      {sub.service}
                    </span>
                    <span className="text-xs text-gray-500 font-mono block truncate">
                      {sub.domain}
                    </span>
                  </div>
                </div>

                {/* Middle: Subscription Amount */}
                <div className="font-mono text-sm font-bold text-[#2c2a29] flex-shrink-0">
                  {sub.costMonthly}
                </div>

                {/* Right: One-Click Cancel or Cancel ↗ Button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCancelled ? (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-600 px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                        <Check className="w-3.5 h-3.5" />
                        <span>Cancelled</span>
                      </span>
                      {(sub as any).cancellationScreenshotUrl && (
                        <a
                          href={(sub as any).cancellationScreenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="brutal-btn bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-600 px-2 py-1 text-[11px] font-bold flex items-center gap-0.5"
                          title="View Screenshot Proof of Cancellation"
                        >
                          <span>Proof</span>
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                        </a>
                      )}
                    </div>
                  ) : isCancelling ? (
                    <button
                      disabled
                      className="brutal-btn bg-[#8544FA] text-[#FEFBEA] px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 opacity-80 cursor-not-allowed"
                    >
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </button>
                  ) : sub.status === "requires-human-action" ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={sub.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="brutal-btn bg-[#FEF08A] hover:bg-[#fde047] text-[#854D0E] px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                        title="Autonomous cancel did not complete. Click to open provider portal."
                      >
                        <span>Manual Cancel</span>
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </a>
                      {sub.isMagicLink && (
                        <button
                          onClick={() => handleOneClickCancel(sub)}
                          className="brutal-btn bg-white hover:bg-gray-100 text-[#2c2a29] px-2.5 py-1.5 text-xs font-bold"
                          title="Retry autonomous cancel"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  ) : sub.isMagicLink ? (
                    <button
                      onClick={() => handleOneClickCancel(sub)}
                      className="brutal-btn bg-[#8544FA] hover:bg-[#7330ea] text-[#FEFBEA] px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>One-Click Cancel</span>
                    </button>
                  ) : (
                    <a
                      href={sub.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="brutal-btn bg-white hover:bg-gray-100 text-[#2c2a29] px-3.5 py-1.5 text-xs font-bold flex items-center gap-1"
                    >
                      <span>Cancel</span>
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
