"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export default function SignUpForm() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const provisionInboxAction = useAction(api.agentmail.provisionInbox);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepStatus, setStepStatus] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!cleanHandle) {
      setError("Please specify a valid handle (letters, numbers, hyphens).");
      setLoading(false);
      return;
    }

    const email = `${cleanHandle}@agentmail.to`;

    try {
      setStepStatus("1/3 Provisioning AgentMail inbox...");
      // 1. Provision on AgentMail
      const inboxRes = await provisionInboxAction({
        username: cleanHandle,
        displayName: name.trim() || cleanHandle,
      });

      setStepStatus("2/3 Initializing Convex account...");
      // 2. Create Convex Auth User
      await signIn("password", {
        email,
        password,
        name: name.trim() || cleanHandle,
        username: cleanHandle,
        flow: "signUp",
      });

      setStepStatus("3/3 Opening your inbox...");
      toast.success("Inbox claimed successfully! Welcome to Modern Mail.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      const rawMsg: string = err?.message || "";
      let friendlyMsg = "Failed to create account. That username may already be reserved.";

      if (rawMsg.includes("already exists") || rawMsg.includes("AccountAlreadyExists")) {
        friendlyMsg = `The username "${cleanHandle}" is already registered. If it belongs to you, please Sign In instead.`;
      } else if (rawMsg.includes("AgentMail")) {
        friendlyMsg = `AgentMail provisioning error: ${rawMsg}`;
      }

      setError(friendlyMsg);
      toast.error("Account creation failed", {
        description: friendlyMsg,
      });
    } finally {
      setLoading(false);
      setStepStatus("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-purple-100 p-8 border-2 border-[#2c2a29] brutal-shadow-left">
        <div>
          <h2 className="heading-text-2 text-5xl font-anton text-center mb-2">
            CLAIM INBOX
          </h2>
          <p className="text-center text-sm font-freeman text-[#2c2a29]">
            Already have an address?{" "}
            <Link
              href="/auth/signin"
              className="text-[#8544FA] font-bold underline hover:text-black transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-[#2c2a29] p-3 text-xs font-freeman text-red-800">
            {error}
          </div>
        )}

        {stepStatus && (
          <div className="bg-emerald-100 border-2 border-emerald-600 p-3 text-xs font-bold text-emerald-800 animate-pulse font-mono">
            {stepStatus}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label className="font-freeman block text-xs font-bold uppercase tracking-wider mb-1 text-[#2c2a29]">
              Your Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-[#2c2a29] text-sm font-sans focus:outline-none brutal-shadow-center"
            />
          </div>

          {/* Desired Address */}
          <div>
            <label className="font-freeman block text-xs font-bold uppercase tracking-wider mb-1 text-[#2c2a29]">
              Choose Your New Mail Address
            </label>
            <div className="flex border-2 border-[#2c2a29] bg-white brutal-shadow-center overflow-hidden">
              <input
                type="text"
                required
                placeholder="alex"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-sans focus:outline-none lowercase"
              />
              <span className="bg-[#FEFBEA] border-l-2 border-[#2c2a29] px-2.5 py-2 text-xs font-mono font-bold text-[#8544FA] flex items-center select-none">
                @agentmail.to
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-sans">
              No external email needed. This becomes your official inbox.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="font-freeman block text-xs font-bold uppercase tracking-wider mb-1 text-[#2c2a29]">
              Set Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-[#2c2a29] text-sm font-sans focus:outline-none brutal-shadow-center"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="button-primary bg-[#8544FA] text-[#FEFBEA] w-full py-3 text-lg font-bold tracking-wide hover:bg-[#7330ea] disabled:opacity-50 mt-2"
          >
            {loading ? "CREATING INBOX..." : "CREATE INBOX & SIGN UP"}
          </button>
        </form>
      </div>
    </div>
  );
}
