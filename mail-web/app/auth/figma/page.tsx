"use client";

import React, { useState, Suspense } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/auth/AuthLayout";

function FigmaConnectContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlError = searchParams.get("error");
  const urlHandle = searchParams.get("handle");

  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.messages.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const inboxId =
    currentUser?.inboxId ||
    currentUser?.email ||
    (currentUser?.username ? `${currentUser.username}@agentmail.to` : "");

  const figmaStatus = useQuery(
    api.figma.getFigmaConnectionStatus,
    inboxId ? { inboxId } : "skip"
  );

  const disconnectMutation = useMutation(api.figma.disconnectFigma);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(urlError);

  const handleConnect = () => {
    if (!inboxId) return;
    setIsConnecting(true);
    const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "";
    window.location.href = `${siteUrl}/api/auth/figma/start?inboxId=${encodeURIComponent(inboxId)}`;
  };

  const handleDisconnect = async () => {
    if (!inboxId) return;
    setIsDisconnecting(true);
    try {
      await disconnectMutation({ inboxId });
    } catch (e: any) {
      setLocalError(e.message || "Failed to disconnect Figma");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthLayout subtitle="Figma Integration">
        <div className="py-12 text-center">
          <div className="inline-block w-5 h-5 border-2 border-[#111114] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-[#5a5a61] font-medium">
            Loading Figma Settings...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthLayout subtitle="Figma Integration">
        <div className="space-y-6 text-center py-2">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[#111114]">
              Connect Figma
            </h2>
            <p className="text-xs text-[#5a5a61] leading-relaxed max-w-xs mx-auto">
              Please sign in to your NotYourAverageMail account to link your Figma developer account.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/signin?redirect=/auth/figma"
              className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-[#111114] text-white hover:bg-[#27272a] active:scale-[0.98] shadow-sm hover:shadow w-full"
            >
              Sign In to Continue ↗
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const isConnected = figmaStatus?.connected || urlStatus === "connected";
  const displayHandle = figmaStatus?.figmaHandle || urlHandle;

  return (
    <AuthLayout subtitle="Figma Integration">
      <div className="space-y-5 py-2">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#f0f0f2] border border-black/5 p-2 mb-1">
            <svg
              width="24"
              height="36"
              viewBox="0 0 38 57"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <path
                d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"
                fill="#1ABCFE"
              />
              <path
                d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"
                fill="#0ACF83"
              />
              <path
                d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"
                fill="#FF7262"
              />
              <path
                d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"
                fill="#F24E1E"
              />
              <path
                d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"
                fill="#A259FF"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#111114]">
            Figma Integration
          </h2>
          <p className="text-xs text-[#5a5a61] leading-relaxed">
            Extract designs, render frame PDFs, and link live canvas files.
          </p>
        </div>

        {localError && (
          <div className="p-3 text-xs bg-red-50 border border-red-200/80 text-red-700 rounded-xl leading-relaxed">
            ⚠️ {localError}
          </div>
        )}

        {/* Status card */}
        <div className="rounded-xl border border-black/10 bg-white p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#797981] font-medium">Status:</span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-200/80 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200/80 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Not Connected
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#797981] font-medium">Active Inbox:</span>
            <span className="font-mono text-[#111114] font-medium">{inboxId || "—"}</span>
          </div>

          {displayHandle && (
            <div className="flex justify-between items-center">
              <span className="text-[#797981] font-medium">Figma Account:</span>
              <span className="font-medium text-[#111114]">@{displayHandle}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-1 space-y-2.5">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 active:scale-[0.98] w-full disabled:opacity-50 cursor-pointer"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect Figma"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-[#111114] text-white hover:bg-[#27272a] active:scale-[0.98] shadow-sm hover:shadow w-full disabled:opacity-50 cursor-pointer"
            >
              {isConnecting ? "Connecting to Figma..." : "Connect Figma Account ↗"}
            </button>
          )}

          <div className="text-center pt-2">
            <Link
              href="/mail"
              className="text-xs text-[#5a5a61] hover:text-[#111114] underline font-medium"
            >
              Return to Inbox →
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function FigmaConnectPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout subtitle="Figma Integration">
          <div className="py-12 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[#111114] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#5a5a61] font-medium">
              Loading Figma Settings...
            </p>
          </div>
        </AuthLayout>
      }
    >
      <FigmaConnectContent />
    </Suspense>
  );
}
