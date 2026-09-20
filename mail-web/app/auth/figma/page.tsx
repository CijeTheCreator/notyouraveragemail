"use client";

import React, { useState, Suspense } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

  const getAuthUrlAction = useAction(api.figma.getOAuthAuthorizationUrl);
  const disconnectMutation = useMutation(api.figma.disconnectFigma);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(urlError);

  const handleConnect = () => {
    if (!inboxId) return;
    setIsConnecting(true);
    setLocalError(null);
    window.location.href = `/api/auth/figma/start?inboxId=${encodeURIComponent(inboxId)}`;
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
      <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA]">
        <p className="font-freeman text-xl text-[#2c2a29]">Loading Figma Settings...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4">
        <div className="max-w-md w-full space-y-6 bg-purple-100 p-8 border-2 border-[#2c2a29] brutal-shadow-left text-center">
          <h2 className="text-4xl font-anton text-[#2c2a29]">
            CONNECT FIGMA
          </h2>
          <p className="font-freeman text-sm text-[#2c2a29]">
            Please sign in to your NotYourAverageMail account to link your Figma developer account.
          </p>
          <div className="pt-4">
            <Link
              href="/auth/signin?redirect=/auth/figma"
              className="inline-block w-full bg-[#8544FA] text-white font-bold py-3 px-6 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Sign In to Continue ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = figmaStatus?.connected || urlStatus === "connected";
  const displayHandle = figmaStatus?.figmaHandle || urlHandle;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 border-2 border-[#2c2a29] brutal-shadow-left">
        <div className="text-center space-y-2">
          <div className="inline-block bg-orange-100 border-2 border-[#2c2a29] p-3 mb-2">
            <svg
              width="40"
              height="40"
              viewBox="0 0 38 57"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto"
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
          <h2 className="text-3xl font-anton text-[#2c2a29] tracking-wide">
            FIGMA INTEGRATION
          </h2>
          <p className="font-freeman text-sm text-gray-600">
            Allow NotYourAverageMail to extract designs, render frame PDFs, and link live files from Figma.
          </p>
        </div>

        {localError && (
          <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-xs font-semibold">
            ⚠️ {localError}
          </div>
        )}

        <div className="bg-gray-50 border-2 border-[#2c2a29] p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
            {isConnected ? (
              <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 border border-green-600 text-xs">
                ● Connected
              </span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 border border-yellow-600 text-xs">
                ○ Not Connected
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-500 uppercase tracking-wider">Active Inbox:</span>
            <span className="font-mono text-gray-800 font-bold">{inboxId || "—"}</span>
          </div>

          {displayHandle && (
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-500 uppercase tracking-wider">Figma Account:</span>
              <span className="font-mono text-gray-800 font-bold">@{displayHandle}</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {isConnected ? (
            <>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 px-4 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect Figma Account"}
              </button>

              <Link
                href={`notyouraveragemail://connect?inboxId=${encodeURIComponent(inboxId)}`}
                className="block text-center w-full bg-[#8544FA] text-white font-bold py-3 px-4 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
              >
                Return to NotYourAverageMail Buddy ↗
              </Link>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-[#1ABCFE] hover:bg-[#15a4df] text-white font-bold py-3 px-4 border-2 border-[#2c2a29] brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
            >
              {isConnecting ? "Redirecting to Figma..." : "Connect with Figma (OAuth 2.0) ↗"}
            </button>
          )}

          <div className="text-center pt-2">
            <Link
              href="/mail"
              className="text-xs text-gray-500 underline hover:text-gray-900"
            >
              ← Back to Webmail
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FigmaConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fafafb]">
        <p className="text-xs text-[#797981] font-sans">Loading Figma Settings...</p>
      </div>
    }>
      <FigmaConnectContent />
    </Suspense>
  );
}
