"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface SignUpFormProps {
  onSwitchToSignIn?: () => void;
}

export default function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const provisionInboxAction = useAction(api.agentmail.provisionInbox);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepStatus, setStepStatus] = useState("");

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
      await provisionInboxAction({
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
      toast.success("Inbox claimed successfully! Welcome to NotYourAverageMail.");
      router.push("/mail");
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 text-xs bg-red-50 border border-red-200/80 text-red-700 rounded-xl leading-relaxed">
          {error}
        </div>
      )}

      {stepStatus && (
        <div className="p-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{stepStatus}</span>
        </div>
      )}

      <div className="space-y-3.5">
        {/* Full Name */}
        <div className="w-full">
          <label
            htmlFor="signup-name"
            className="block text-xs font-medium text-[#5a5a61] mb-1.5"
          >
            Full Name
          </label>
          <div className="relative">
            <div className="flex items-center rounded-xl border border-black/10 bg-white hover:border-black/20 focus-within:!border-[#111114] focus-within:!ring-1 focus-within:!ring-[#111114] transition-all px-3 py-2 text-sm">
              <input
                id="signup-name"
                type="text"
                required
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full outline-none bg-transparent text-[#111114] placeholder-[#797981]"
              />
            </div>
          </div>
        </div>

        {/* Desired Address Handle */}
        <div className="w-full">
          <label
            htmlFor="signup-handle"
            className="block text-xs font-medium text-[#5a5a61] mb-1.5"
          >
            Choose Your Mail Address
          </label>
          <div className="relative">
            <div className="flex items-center rounded-xl border border-black/10 bg-white hover:border-black/20 focus-within:!border-[#111114] focus-within:!ring-1 focus-within:!ring-[#111114] transition-all px-3 py-2 text-sm">
              <input
                id="signup-handle"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="alex"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="flex-1 outline-none bg-transparent text-[#111114] placeholder-[#797981] lowercase"
              />
              <span className="text-xs font-mono font-medium text-[#5a5a61] bg-[#f0f0f2] px-2 py-0.5 rounded ml-2 select-none shrink-0">
                @agentmail.to
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#797981] mt-1 font-normal">
            No external email needed. This becomes your official autonomous inbox.
          </p>
        </div>

        {/* Password */}
        <div className="w-full">
          <label
            htmlFor="signup-password"
            className="block text-xs font-medium text-[#5a5a61] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <div className="flex items-center rounded-xl border border-black/10 bg-white hover:border-black/20 focus-within:!border-[#111114] focus-within:!ring-1 focus-within:!ring-[#111114] transition-all px-3 py-2 text-sm">
              <input
                id="signup-password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none bg-transparent text-[#111114] placeholder-[#797981]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full transition-all duration-200 h-10 px-5 text-sm font-medium gap-2 bg-[#111114] text-white hover:bg-[#27272a] active:scale-[0.98] shadow-sm hover:shadow w-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
      >
        <span>{loading ? "Creating Inbox..." : "Create Account"}</span>
      </button>
    </form>
  );
}
