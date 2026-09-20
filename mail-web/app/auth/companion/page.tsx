"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

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
    (currentUser?.username ? `${currentUser.username}@agentmail.to` : "");

  const deepLink = inboxId
    ? `notyouraveragemail://connect?inboxId=${encodeURIComponent(inboxId)}`
    : "";

  useEffect(() => {
    if (isAuthenticated && inboxId && !hasRedirected) {
      setHasRedirected(true);
      // Automatically trigger deep-link back to the macOS companion app
      window.location.href = deepLink;
    }
  }, [isAuthenticated, inboxId, deepLink, hasRedirected]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA]">
        <p className="font-freeman text-xl text-[#2c2a29]">Loading NotYourAverageMail...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4">
        <div className="max-w-md w-full space-y-6 bg-purple-100 p-8 border-2 border-[#2c2a29] brutal-shadow-left text-center">
          <h2 className="text-4xl font-anton text-[#2c2a29]">
            CONNECT DESKTOP BUDDY
          </h2>
          <p className="font-freeman text-sm text-[#2c2a29]">
            Please sign in to your NotYourAverageMail account to link your cursor companion.
          </p>
          <div className="pt-4">
            <Link
              href="/auth/signin?redirect=/auth/companion"
              className="inline-block w-full bg-[#8544FA] text-white font-bold py-3 px-6 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Sign In to Continue ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4">
      <div className="max-w-md w-full space-y-6 bg-green-100 p-8 border-2 border-[#2c2a29] brutal-shadow-left text-center">
        <div className="inline-block p-4 bg-green-200 border-2 border-[#2c2a29] rounded-full">
          <span className="text-4xl">⚡</span>
        </div>
        <h2 className="text-4xl font-anton text-[#2c2a29]">
          ACCOUNT CONNECTED!
        </h2>
        <p className="font-freeman text-sm text-[#2c2a29]">
          Linking your desktop companion to <strong>{inboxId}</strong>.
        </p>

        <div className="pt-4 space-y-3">
          <a
            href={deepLink}
            className="inline-block w-full bg-[#2c2a29] text-white font-bold py-3 px-6 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Open Desktop Companion ↗
          </a>
          <p className="text-xs font-mono text-gray-600">
            If your browser doesn't open the app automatically, click the button above.
          </p>
        </div>
      </div>
    </div>
  );
}
