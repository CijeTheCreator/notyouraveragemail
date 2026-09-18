"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Shield, CheckCircle2, Send, AlertTriangle, ArrowRight, Lock } from "lucide-react";

function OptOutContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "chijioke-6638@agentmail.to";
  const token = searchParams.get("token") || "";
  const isConfirmMode = searchParams.get("confirm") === "true";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "confirming" | "confirmed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const submitWebOptOutMutation = useMutation(api.testRemoval.submitWebOptOut);
  const confirmOptOutMutation = useMutation(api.testRemoval.confirmOptOut);

  useEffect(() => {
    if (searchParams.get("email")) {
      setEmail(searchParams.get("email")!);
    }
  }, [searchParams]);

  const handleRequestOptOut = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      await submitWebOptOutMutation({ email });
      setStatus("sent");
    } catch (err: any) {
      console.error("Opt-out request error:", err);
      setErrorMessage(err?.message || "Failed to submit opt-out request.");
      setStatus("error");
    }
  };

  const handleConfirmOptOut = async () => {
    setStatus("confirming");
    setErrorMessage("");

    try {
      await confirmOptOutMutation({ email, token });
      setStatus("confirmed");
    } catch (err: any) {
      console.error("Confirmation error:", err);
      setErrorMessage(err?.message || "Failed to confirm data deletion.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            NotReallyDataBroker
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-purple-600 mt-1">
            Official Data Privacy & Opt-Out Portal
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white border-2 border-slate-900 rounded-lg p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-6">
          {/* State 1: Verification / Confirmation Mode (from email link) */}
          {isConfirmMode && status !== "confirmed" ? (
            <div className="space-y-6">
              <div className="border-l-4 border-purple-600 pl-3 py-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Confirm Data Deletion
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reference Token: <span className="font-mono font-bold text-purple-700">{token || "VERIFY-OPT"}</span>
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                You are exercising your statutory right to erasure. Confirming this request will permanently remove and suppress personal records associated with:
              </p>

              <div className="bg-slate-100 border border-slate-300 rounded p-3 text-center">
                <span className="font-mono text-sm font-bold text-slate-900 break-all">
                  {email}
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs font-semibold rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                id="confirm-optout-btn"
                onClick={handleConfirmOptOut}
                disabled={status === "confirming"}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:translate-x-0.5 active:translate-y-0.5 text-white font-bold text-sm rounded shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {status === "confirming" ? (
                  <span>Purging records...</span>
                ) : (
                  <>
                    <span>Confirm Opt-Out & Delete Data</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Action applies to all downstream directories under GDPR & CCPA.
              </p>
            </div>
          ) : status === "confirmed" ? (
            /* State 2: Confirmed Success State */
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-600 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Opt-Out Confirmed!
              </h2>
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded p-4 text-emerald-950 text-xs leading-relaxed font-semibold">
                Your personal data has been permanently removed and suppressed across all NotReallyDataBroker databases and search indices.
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Target Identifier: {email}
              </div>
            </div>
          ) : status === "sent" ? (
            /* State 3: Email Dispatched State */
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-purple-100 border-2 border-purple-600 rounded-full flex items-center justify-center mx-auto text-purple-700">
                <Send className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Verification Email Dispatched
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent an opt-out confirmation email to <strong className="text-slate-900">{email}</strong>. Please check your Modern Mail inbox and click the verification link to complete your data deletion.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setStatus("idle")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 underline cursor-pointer"
                >
                  Submit another address
                </button>
              </div>
            </div>
          ) : (
            /* State 4: Standard Unsubscribe / Opt-Out Request Form */
            <form onSubmit={handleRequestOptOut} className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Request Personal Data Removal
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your email address to opt out of people-search listings and data brokerage.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Email Identifier
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@agentmail.to"
                  className="w-full px-3 py-2 border-2 border-slate-900 rounded text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs font-semibold rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                id="request-optout-btn"
                type="submit"
                disabled={status === "sending"}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:translate-x-0.5 active:translate-y-0.5 text-white font-bold text-xs rounded border-2 border-slate-900 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{status === "sending" ? "Processing..." : "Submit Opt-Out Request"}</span>
              </button>

              <div className="border-t border-slate-200 pt-4 text-center">
                <a
                  id="direct-optout-link"
                  href={`/optout?email=${encodeURIComponent(email)}&confirm=true`}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 underline flex items-center justify-center gap-1"
                >
                  <span>Or use 1-Click Instant Unsubscribe Link</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" />
          <span>NotReallyDataBroker &bull; Legal Compliance: CCPA & GDPR</span>
        </div>
      </div>
    </div>
  );
}

export default function OptOutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading opt-out portal...</div>}>
      <OptOutContent />
    </Suspense>
  );
}
