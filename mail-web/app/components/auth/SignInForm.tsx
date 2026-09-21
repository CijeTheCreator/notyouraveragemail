"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

interface SignInFormProps {
  onSwitchToSignUp?: () => void;
}

export default function SignInForm({ onSwitchToSignUp }: SignInFormProps) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isNewAccountNeeded, setIsNewAccountNeeded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsNewAccountNeeded(false);
    setLoading(true);

    try {
      const trimmed = handle.trim().toLowerCase();
      const email = trimmed.includes("@") ? trimmed : `${trimmed}@agentmail.to`;

      await signIn("password", {
        email,
        password,
        flow: "signIn",
      });

      toast.success("Welcome back! Signing you in...");
      router.push("/mail");
      router.refresh();
    } catch (err: any) {
      const rawMsg: string = err?.message || "";
      let friendlyMsg = "Invalid credentials. Please check your username and password.";

      if (rawMsg.includes("InvalidAccountId") || rawMsg.includes("Could not find account")) {
        friendlyMsg =
          "No account found with this username. Please Sign Up to initialize your autonomous inbox!";
        setIsNewAccountNeeded(true);
      } else if (rawMsg.includes("InvalidSecret") || rawMsg.includes("password")) {
        friendlyMsg = "Incorrect password. Please verify your password.";
      }

      setError(friendlyMsg);
      toast.error("Sign in failed", {
        description: friendlyMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 text-xs bg-red-50 border border-red-200/80 text-red-700 rounded-xl space-y-1.5 leading-relaxed">
          <p className="font-medium">{error}</p>
          {isNewAccountNeeded && onSwitchToSignUp && (
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-xs font-semibold text-red-900 underline hover:text-black block"
            >
              Go to Sign Up →
            </button>
          )}
        </div>
      )}

      <div className="space-y-3.5">
        {/* Email or Username */}
        <div className="w-full">
          <label
            htmlFor="signin-handle"
            className="block text-xs font-medium text-[#5a5a61] mb-1.5"
          >
            Email or Username
          </label>
          <div className="relative">
            <div className="flex items-center rounded-xl border border-black/10 bg-white hover:border-black/20 focus-within:!border-[#111114] focus-within:!ring-1 focus-within:!ring-[#111114] transition-all px-3 py-2 text-sm">
              <input
                id="signin-handle"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="name@example.com or handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full outline-none bg-transparent text-[#111114] placeholder-[#797981]"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="w-full">
          <label
            htmlFor="signin-password"
            className="block text-xs font-medium text-[#5a5a61] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <div className="flex items-center rounded-xl border border-black/10 bg-white hover:border-black/20 focus-within:!border-[#111114] focus-within:!ring-1 focus-within:!ring-[#111114] transition-all px-3 py-2 text-sm">
              <input
                id="signin-password"
                type="password"
                required
                placeholder="••••••••"
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
        <span>{loading ? "Signing in..." : "Log In"}</span>
      </button>
    </form>
  );
}
