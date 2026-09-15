'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@convex-dev/auth/react';
import { useSession } from '@/hooks/use-session';
import { Mail, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoaded } = useSession();
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect straight to /plans
  useEffect(() => {
    if (isLoaded && isAuthenticated && user) {
      router.replace('/plans');
    }
  }, [isLoaded, isAuthenticated, user, router]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.set('email', email.trim().toLowerCase());
      formData.set('redirectTo', '/plans');

      await signIn('resend', formData);
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setErrorMessage(err?.message || 'Failed to send magic link. Check Resend configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-lg p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#EB1000] rounded-xl flex items-center justify-center font-black text-white text-2xl mx-auto shadow-md">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M13.96 4h4.74L23 20h-4.32l-2.07-5.45H12.4L13.96 4zm-1.8 11.23h3.58l-1.79-5.18-1.79 5.18zM5.3 4H10l-4.7 16H1L5.3 4zm5.03 0h3.71L9.34 20H5.63L10.33 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to Adobe</h1>
          <p className="text-xs text-gray-500">
            Password-free authentication powered by Magic Links & Modern Mail
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
            {errorMessage}
          </div>
        )}

        {magicLinkSent ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Check your inbox</h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                We sent a secure magic sign-in link to <strong className="text-gray-900">{email}</strong>.
              </p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Click the button in your email to sign in directly to your Adobe Account.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="w-full py-2.5 rounded-full text-xs font-semibold border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@agentmail.to"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0265DC] focus:border-transparent"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Use your Modern Mail inbox address to receive the magic link.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full text-sm font-bold bg-[#0265DC] hover:bg-blue-700 text-white transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Magic Link...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Send Magic Link</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <Link href="/checkout" className="hover:text-gray-900 font-medium">
            ← Need to subscribe?
          </Link>
          <Link href="/plans" className="hover:text-gray-900 font-medium">
            View Plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
