'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { AdobeSidebar } from '@/components/adobe-sidebar';
import { PlanCard } from '@/components/plan-card';
import { CancelPlanModal } from '@/components/cancel-plan-modal';
import Link from 'next/link';

export default function PlansPage() {
  const { subscription, cancelSubscription, subscribe, isLoaded } = useSession();
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5', color: '#000000' }}>
      <main
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '48px',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '40px 32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Sidebar matching Screenshot 1:1 */}
        <AdobeSidebar />

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Main Title: "Plans" */}
          <h1
            data-e2e="plans-title"
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#000000',
              margin: '0 0 24px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Plans
          </h1>

          {/* Active Plan Card Pod */}
          <section data-e2e="plans-section">
            {isLoaded && subscription ? (
              <PlanCard
                subscription={subscription}
                onOpenCancel={() => setIsCancelOpen(true)}
                onReactivate={() => subscribe(subscription.planName, subscription.costMonthly)}
              />
            ) : (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '48px',
                  textAlign: 'center',
                  border: '1px solid #e1e1e1',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: '0 0 8px' }}>
                  No active plans found
                </h3>
                <p style={{ fontSize: '14px', color: '#6e6e6e', margin: '0 0 20px' }}>
                  Subscribe to test the Adobe autonomous cancellation flow.
                </p>
                <Link
                  href="/checkout"
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    borderRadius: '9999px',
                    backgroundColor: '#0265DC',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Go to Checkout
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Cancellation Dialog matching Image 2 */}
      {subscription && (
        <CancelPlanModal
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
          onConfirm={cancelSubscription}
          planName={subscription.planName}
        />
      )}
    </div>
  );
}
