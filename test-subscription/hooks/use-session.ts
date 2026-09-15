'use client';

import { useCallback, useMemo } from 'react';
import { useConvexAuth, useAuthActions } from '@convex-dev/auth/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';

export interface UserSession {
  email: string;
  name: string;
}

export interface SubscriptionData {
  planName: string;
  status: 'active' | 'cancelled';
  costMonthly: string;
  renewalDate: string;
  subscribedAt: number;
}

export function useSession() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  // Query viewer profile
  const viewer = useQuery(api.testCheckout.viewer);

  // If user is authenticated and we have their email, query live subscription
  const liveSubscription = useQuery(
    api.testCheckout.getUserSubscription,
    viewer?.email ? { email: viewer.email } : "skip"
  );

  const saveSubMutation = useMutation(api.testCheckout.saveUserSubscription);
  const cancelSubMutation = useMutation(api.testCheckout.cancelUserSubscription);

  const isLoaded = !isLoading && (!isAuthenticated || viewer !== undefined);

  const user: UserSession | null = useMemo(() => {
    if (!isAuthenticated || !viewer) return null;
    return {
      email: viewer.email || '',
      name: viewer.name || viewer.email?.split('@')[0] || 'Adobe User',
    };
  }, [isAuthenticated, viewer]);

  const subscription: SubscriptionData | null = useMemo(() => {
    if (!liveSubscription) return null;
    return {
      planName: liveSubscription.planName,
      status: liveSubscription.status,
      costMonthly: liveSubscription.costMonthly,
      renewalDate: liveSubscription.renewalDate,
      subscribedAt: liveSubscription.subscribedAt,
    };
  }, [liveSubscription]);

  const login = useCallback((email: string, name?: string) => {
    // Kept for backward compatibility
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const subscribe = useCallback(
    async (planName = 'Creative Cloud All Apps', costMonthly = '$59.99/mo') => {
      const email = user?.email;
      if (!email) return;

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const renewalDate = nextMonth.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const portalUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/plans`
        : 'http://localhost:3001/plans';

      await saveSubMutation({
        email,
        name: user.name,
        planName,
        costMonthly,
        renewalDate,
        portalUrl,
      });
    },
    [user, saveSubMutation]
  );

  const cancelSubscription = useCallback(async () => {
    const email = user?.email;
    if (!email) return;
    await cancelSubMutation({ email });
  }, [user, cancelSubMutation]);

  const resetSubscription = useCallback(async () => {
    const email = user?.email;
    if (!email) return;
    await subscribe();
  }, [user, subscribe]);

  return {
    user,
    subscription,
    isLoaded,
    isAuthenticated,
    login,
    logout,
    subscribe,
    cancelSubscription,
    resetSubscription,
  };
}
