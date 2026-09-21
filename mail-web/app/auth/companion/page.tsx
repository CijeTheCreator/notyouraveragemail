"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import AuthLayout from "@/app/components/auth/AuthLayout";

export default function CompanionConnectPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.messages.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const [hasRedirected, setHasRedirected] = useState(false);

  const inboxId =
    currentUser?.inboxId ||
    currentUser?.email ||
    (currentUser?.username ? `${currentUser.username}@agentmail.to` : "") ||
    (isAuthenticated && currentUser ? "chijioke-6638@agentmail.to" : "");

  const deepLink = inboxId
    ? `notyouraveragemail://connect?inboxId=${encodeURIComponent(inboxId)}`
    : "";
  const legacyDeepLink = inboxId
    ? `modernmail://connect?inboxId=${encodeURIComponent(inboxId)}`
    : "";

  useEffect(() => {
    if (isAuthenticated && inboxId && !hasRedirected) {
      setHasRedirected(true);
      // Automatically trigger deep-link back to the macOS companion app
      try {
        window.location.href = deepLink;
      } catch (err) {
        console.warn("Auto-redirect to desktop companion failed:", err);
      }
    }
  }, [isAuthenticated, inboxId, deepLink, hasRedirected]);

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <AuthLayout subtitle="Desktop Companion Link">
        <div className="py-12 text-center">
          <div className="inline-block w-5 h-5 border-2 border-[#111114] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-[#5a5a61] font-medium">
            Loading NotYourAverageMail...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthLayout subtitle="Desktop Companion Link">
        <div className="space-y-6 text-center py-2">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[#111114]">
              Connect Desktop Companion
            </h2>
            <p className="text-xs text-[#5a5a61] leading-relaxed max-w-xs mx-auto">
              Please sign in to your NotYourAverageMail account to link your desktop cursor companion.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/auth/signin?redirect=/auth/companion"
              className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-[#111114] text-white hover:bg-[#27272a] active:scale-[0.98] shadow-sm hover:shadow w-full"
            >
              Sign In to Continue ↗
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Desktop Companion Link">
      <div className="space-y-5 text-center py-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mb-1">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-[#111114]">
            Account Connected
          </h2>
          <p className="text-xs text-[#5a5a61] leading-relaxed">
            Linking desktop companion to:
          </p>
          <div className="inline-block px-3 py-1 bg-[#f0f0f2] border border-black/5 rounded-lg text-xs font-mono font-medium text-[#111114]">
            {inboxId}
          </div>
        </div>

        <div className="pt-3 space-y-3">
          <a
            href={deepLink}
            onClick={() => {
              if (deepLink) {
                window.location.href = deepLink;
              }
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-[#111114] text-white hover:bg-[#27272a] active:scale-[0.98] shadow-sm hover:shadow w-full cursor-pointer"
          >
            Open Desktop Companion ↗
          </a>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-[#797981] leading-relaxed">
              If your browser doesn&apos;t open the app automatically, click the button above.
            </p>
            {legacyDeepLink && (
              <a
                href={legacyDeepLink}
                className="text-[11px] text-[#5a5a61] underline hover:text-[#111114]"
              >
                Try alternate deep link (modernmail://)
              </a>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
