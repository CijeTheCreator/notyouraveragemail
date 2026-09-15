'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useConfetti } from '@/hooks/use-confetti';
import { convexClient, api } from '@/lib/convex';
import { AdobeSidebar } from '@/components/adobe-sidebar';
import { CheckCircle2, Loader2, Sparkles, Mail, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useSession();
  const { fire: fireConfetti } = useConfetti();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const planName = 'Creative Cloud All Apps';
  const price = '$59.99/mo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setErrorMessage('Please enter both your name and email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const portalUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/plans`
        : 'http://localhost:3001/plans';

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const renewalDate = nextMonth.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      await convexClient.mutation(api.testCheckout.saveUserSubscription, {
        email: email.trim(),
        name: name.trim(),
        planName,
        costMonthly: price,
        renewalDate,
        portalUrl,
      });

      setIsSuccess(true);
      fireConfetti();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err?.message || 'Failed to complete subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container-body spectrum-Body4">
      <main className="global-layout-width">
        <div className="page-body-view">
          <AdobeSidebar />

          <div className="main-view">
            <div className="page-container plans">
              <h1 className="page-title">
                Subscribe to Creative Cloud
              </h1>

              <div style={{ maxWidth: '640px' }}>
                {isSuccess ? (
                  <div className="plan-pod-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e6f6ec', color: '#0d6832', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <CheckCircle2 style={{ width: '32px', height: '32px' }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                      Subscription Confirmed!
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#6e6e6e', margin: '0 0 1.5rem' }}>
                      You are now subscribed to <strong>{planName}</strong> at <strong>{price}</strong>.
                    </p>

                    <div style={{ background: '#f0f6ff', border: '1px solid #cce0ff', borderRadius: '8px', padding: '1rem', fontSize: '0.8125rem', color: '#0054b6', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Mail style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                      <span>
                        A receipt email with an autonomous <strong>Action Card</strong> has been delivered to <strong>{email}</strong> in Modern Mail!
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => router.push('/plans')}
                        className="spectrum-btn-primary"
                      >
                        <span>Go to Manage Plan</span>
                        <ArrowRight style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button
                        onClick={() => setIsSuccess(false)}
                        style={{
                          background: 'none',
                          border: '1px solid #ccc',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Subscribe Another User
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="plan-pod-card" style={{ padding: '2rem' }}>
                    {/* Plan summary badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src="https://www.adobe.com/content/dam/cc/icons/cc-all-apps-96.svg"
                          alt="Creative Cloud"
                          style={{ width: '40px', height: '40px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{planName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>Annual plan, paid monthly</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>{price}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#888' }}>Cancel anytime</div>
                      </div>
                    </div>

                    {errorMessage && (
                      <div style={{ background: '#fee7e7', color: '#c90000', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                        {errorMessage}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: '0.35rem' }}>
                          Subscriber Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex"
                          style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: '0.35rem' }}>
                          Email Address (Modern Mail Inbox)
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. alex@agentmail.to"
                          style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        />
                        <p style={{ fontSize: '0.6875rem', color: '#888', margin: '0.25rem 0 0' }}>
                          Receipt email with One-Click Cancellation ActionCard will be delivered to this address.
                        </p>
                      </div>

                      <div style={{ paddingTop: '0.5rem' }}>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="spectrum-btn-primary"
                          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                              <span>Activating Subscription...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles style={{ width: '16px', height: '16px' }} />
                              <span>Complete Subscription ({price})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
