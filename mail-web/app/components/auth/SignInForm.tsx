"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";

export default function SignInForm() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isNewAccountNeeded, setIsNewAccountNeeded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsNewAccountNeeded(false);
    setLoading(true);

    try {
      // Normalize handle to full email
      const trimmed = handle.trim().toLowerCase();
      const email = trimmed.includes("@") ? trimmed : `${trimmed}@agentmail.to`;

      await signIn("password", {
        email,
        password,
        flow: "signIn",
      });

      toast.success("Welcome back! Signing you in...");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      const rawMsg: string = err?.message || "";
      let friendlyMsg = "Invalid credentials. Please check your username and password.";

      if (rawMsg.includes("InvalidAccountId") || rawMsg.includes("Could not find account")) {
        friendlyMsg =
          "No account found with this username. Since you connected to your new Convex Cloud database, please Sign Up to initialize your account!";
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
    <div className="min-h-screen flex items-center justify-center bg-[#FEFBEA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-purple-100 p-8 border-2 border-[#2c2a29] brutal-shadow-left">
        <div>
          <h2 className="heading-text-2 text-5xl font-anton text-center mb-2">
            SIGN IN
          </h2>
          <p className="text-center text-sm font-freeman text-[#2c2a29]">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-[#8544FA] font-bold underline hover:text-black transition-colors"
            >
              Create your @agentmail.to address
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-[#2c2a29] p-3.5 text-xs font-sans text-red-900 brutal-shadow-sm space-y-2">
            <p className="font-semibold">{error}</p>
            {isNewAccountNeeded && (
              <Link
                href="/auth/signup"
                className="brutal-btn inline-block bg-[#8544FA] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#702ff3]"
              >
                Go to Sign Up →
              </Link>
            )}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Username / Handle */}
          <div>
            <label className="font-freeman block text-xs font-bold uppercase tracking-wider mb-1 text-[#2c2a29]">
              Your Email or Username
            </label>
            <div className="flex border-2 border-[#2c2a29] bg-white brutal-shadow-center overflow-hidden">
              <input
                type="text"
                required
                placeholder="alex"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-sans focus:outline-none"
              />
              <span className="bg-[#FEFBEA] border-l-2 border-[#2c2a29] px-2.5 py-2 text-xs font-mono font-bold text-gray-600 flex items-center select-none">
                @agentmail.to
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="font-freeman block text-xs font-bold uppercase tracking-wider mb-1 text-[#2c2a29]">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
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
            {loading ? "AUTHENTICATING..." : "SIGN IN TO MAIL"}
          </button>
        </form>
      </div>
    </div>
  );
}
