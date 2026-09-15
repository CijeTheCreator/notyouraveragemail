'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoaded, isAuthenticated } = useSession();

  useEffect(() => {
    if (isLoaded) {
      if (isAuthenticated && user) {
        router.replace('/plans');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoaded, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0265DC] mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Loading Adobe Account...</p>
      </div>
    </div>
  );
}
