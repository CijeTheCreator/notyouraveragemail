'use client';

import { useState, useEffect, useCallback } from 'react';

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

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  planName: 'Creative Cloud All Apps',
  status: 'active',
  costMonthly: '$59.99/mo',
  renewalDate: 'Oct 11, 2026',
  subscribedAt: Date.now(),
};

export function useSession() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('adobe_user');
      const savedSub = localStorage.getItem('adobe_subscription');

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // Default demo user if none exists
        const defaultUser = { email: 'alex@agentmail.to', name: 'Alex' };
        setUser(defaultUser);
        localStorage.setItem('adobe_user', JSON.stringify(defaultUser));
      }

      if (savedSub) {
        setSubscription(JSON.parse(savedSub));
      } else {
        // Set default active subscription so the plans page is immediately interactive
        setSubscription(DEFAULT_SUBSCRIPTION);
        localStorage.setItem('adobe_subscription', JSON.stringify(DEFAULT_SUBSCRIPTION));
      }
    } catch {
      // Fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const login = useCallback((email: string, name?: string) => {
    const sessionUser = { email, name: name || email.split('@')[0] };
    setUser(sessionUser);
    localStorage.setItem('adobe_user', JSON.stringify(sessionUser));
    document.cookie = `adobe_user=${encodeURIComponent(JSON.stringify(sessionUser))}; path=/; max-age=86400`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('adobe_user');
    document.cookie = 'adobe_user=; path=/; max-age=0';
  }, []);

  const subscribe = useCallback((planName = 'Creative Cloud All Apps', costMonthly = '$59.99/mo') => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const renewalDate = nextMonth.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const newSub: SubscriptionData = {
      planName,
      status: 'active',
      costMonthly,
      renewalDate,
      subscribedAt: Date.now(),
    };

    setSubscription(newSub);
    localStorage.setItem('adobe_subscription', JSON.stringify(newSub));
  }, []);

  const cancelSubscription = useCallback(() => {
    if (!subscription) return;
    const updated: SubscriptionData = {
      ...subscription,
      status: 'cancelled',
    };
    setSubscription(updated);
    localStorage.setItem('adobe_subscription', JSON.stringify(updated));
  }, [subscription]);

  const resetSubscription = useCallback(() => {
    setSubscription(DEFAULT_SUBSCRIPTION);
    localStorage.setItem('adobe_subscription', JSON.stringify(DEFAULT_SUBSCRIPTION));
  }, []);

  return {
    user,
    subscription,
    isLoaded,
    login,
    logout,
    subscribe,
    cancelSubscription,
    resetSubscription,
  };
}
