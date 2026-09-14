'use client';

import { useState } from 'react';
import { Loader2, CreditCard, Calendar, Lock, User } from 'lucide-react';

interface CardCheckoutProps {
  amountCents: number;
  onSuccess?: (detail: any) => void;
  onError?: (detail: any) => void;
}

export function CardCheckout({ amountCents, onSuccess, onError }: CardCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pan: '',
    expiry: '',
    cvc: '',
  });

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === 'pan') value = formatCardNumber(value);
    if (name === 'expiry') value = formatExpiry(value);
    if (name === 'cvc') value = value.replace(/\D/g, '').substring(0, 4);

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pan: formData.pan.replace(/\s+/g, ''),
          amount: amountCents,
          descriptor: 'Simulated Checkout',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Simulation failed');
      }

      onSuccess?.(data);
    } catch (error: any) {
      onError?.({ message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Total Amount</h2>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatAmount(amountCents)}
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Complete your secure transaction</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cardholder Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <User size={18} />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="pl-10 flex h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
              placeholder="John Doe"
            />
          </div>
        </div>

        {/* Card Number Field */}
        <div className="space-y-1.5">
          <label htmlFor="pan" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Card Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <CreditCard size={18} />
            </div>
            <input
              id="pan"
              name="pan"
              type="text"
              required
              maxLength={19}
              value={formData.pan}
              onChange={handleChange}
              className="pl-10 flex h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-mono"
              placeholder="0000 0000 0000 0000"
            />
          </div>
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="expiry"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Expiry Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Calendar size={18} />
              </div>
              <input
                id="expiry"
                name="expiry"
                type="text"
                required
                maxLength={5}
                value={formData.expiry}
                onChange={handleChange}
                className="pl-10 flex h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-mono"
                placeholder="MM/YY"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cvc" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Security Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock size={18} />
              </div>
              <input
                id="cvc"
                name="cvc"
                type="password"
                required
                maxLength={4}
                value={formData.cvc}
                onChange={handleChange}
                className="pl-10 flex h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-mono"
                placeholder="CVC"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="relative overflow-hidden w-full h-12 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-md shadow-blue-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatAmount(amountCents)}`
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center justify-center gap-1">
            <Lock size={12} /> Secure transaction simulated via Lithic
          </p>
        </div>
      </form>
    </div>
  );
}
