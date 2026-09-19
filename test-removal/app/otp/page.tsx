"use client";

import React, { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/lib/convex";

export default function OtpTestPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "confirmed">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtpAction = useAction(api.testOtp.sendOtp);
  const verifyOtpMutation = useMutation(api.testOtp.verifyOtp);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendOtpAction({ email: email.trim().toLowerCase() });
      setStep("otp");
    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      setError(err?.message || "Failed to send verification code. Check Resend configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify ?? otp).trim();
    if (targetCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyOtpMutation({
        email: email.trim().toLowerCase(),
        code: targetCode,
      });

      if (res.success) {
        setStep("confirmed");
      } else {
        setError(res.error || "Invalid verification code");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when 6 digits are typed or auto-filled
  useEffect(() => {
    if (step === "otp" && otp.trim().length === 6 && !isLoading) {
      handleVerifyOtp(otp.trim());
    }
  }, [otp, step]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-white text-black font-sans antialiased">
      <div className="w-full max-w-sm space-y-6">
        {step === "confirmed" ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-xl font-medium tracking-tight text-neutral-900">confirmed</p>
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setStep("email");
                setError(null);
              }}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
            >
              start over
            </button>
          </div>
        ) : step === "otp" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="otp-input"
                className="block text-xs uppercase tracking-wider text-neutral-500 font-medium"
              >
                Verification Code
              </label>
              <input
                id="otp-input"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter 6-digit code"
                autoFocus
                className="w-full px-3 py-2 text-base font-mono tracking-widest border border-neutral-300 rounded focus:outline-none focus:border-black transition-colors"
              />
              <p className="text-[11px] text-neutral-400">
                Code sent to <span className="font-mono text-neutral-600">{email}</span>
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-normal">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.trim().length === 0}
              className="w-full py-2 px-4 bg-black text-white text-xs font-medium rounded hover:bg-neutral-800 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>

            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  handleSendOtp();
                }}
                disabled={isLoading}
                className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer disabled:opacity-40"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setOtp("");
                  setStep("email");
                }}
                className="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
              >
                Change email
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="email-input"
                className="block text-xs uppercase tracking-wider text-neutral-500 font-medium"
              >
                Email
              </label>
              <input
                id="email-input"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-normal">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-2 px-4 bg-black text-white text-xs font-medium rounded hover:bg-neutral-800 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
