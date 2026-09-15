'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Loader2, CheckCircle2 } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [targetEmail, setTargetEmail] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (email) {
      setTargetEmail(email);
      login(email);
      setStatus('success');
      const timer = setTimeout(() => {
        router.push('/plans');
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setStatus('error');
    }
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center space-y-6">
        <div className="w-12 h-12 bg-[#EB1000] rounded-xl flex items-center justify-center font-black text-white text-2xl mx-auto shadow-md">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path d="M13.96 4h4.74L23 20h-4.32l-2.07-5.45H12.4L13.96 4zm-1.8 11.23h3.58l-1.79-5.18-1.79 5.18zM5.3 4H10l-4.7 16H1L5.3 4zm5.03 0h3.71L9.34 20H5.63L10.33 4z" />
          </svg>
        </div>

        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0265DC] mx-auto" />
            <h2 className="text-lg font-bold text-gray-900">Verifying magic link...</h2>
            <p className="text-xs text-gray-500">Signing in to Adobe Account</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Welcome back!</h2>
            <p className="text-xs text-gray-500">
              Signed in as <strong className="text-gray-900">{targetEmail}</strong>. Redirecting to your plans...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-red-600">Invalid Link</h2>
            <p className="text-xs text-gray-500">
              The sign-in link is missing required parameters or has expired.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[#0265DC] text-white"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
