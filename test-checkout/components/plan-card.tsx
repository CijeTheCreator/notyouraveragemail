'use client';

import { SubscriptionData } from '@/hooks/use-session';
import { AlertTriangle, Cloud, Sparkles, CreditCard, Calendar } from 'lucide-react';

interface PlanCardProps {
  subscription: SubscriptionData;
  onOpenCancel: () => void;
  onReactivate?: () => void;
}

export function PlanCard({ subscription, onOpenCancel, onReactivate }: PlanCardProps) {
  const isCancelled = subscription.status === 'cancelled';
  const planName = subscription.planName || 'Creative Cloud All Apps';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '36px 40px',
        border: '1px solid #e1e1e1',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
      data-testid="subscription-plan-card"
    >
      {/* Top Header inside card: "Your plan" + "⚠️ Billing issue" */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '28px',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: 0 }}>
          Your plan
        </h2>

        {isCancelled ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#f0f0f0',
              color: '#555555',
            }}
          >
            Cancelled
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#C9252C',
              color: '#ffffff',
            }}
          >
            <AlertTriangle style={{ width: '14px', height: '14px', fill: '#ffffff', color: '#C9252C' }} />
            <span>Billing issue</span>
          </span>
        )}
      </div>

      {/* 3-Column Content Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Column 1: Product Pod Card */}
        <div
          style={{
            maxWidth: '320px',
            width: '100%',
            border: '1px solid #e1e1e1',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Laptop Banner Image */}
          <div style={{ position: 'relative', width: '100%', height: '140px', overflow: 'hidden', backgroundColor: '#78B9DA' }}>
            <img
              src="/adobe-plan-banner.png"
              alt="Adobe Plan"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Overlapping App Icon */}
          <div style={{ position: 'relative', marginTop: '-24px', marginLeft: '20px', zIndex: 10 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: '#EB1000',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg"
                alt="Adobe"
                style={{ width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          </div>

          {/* Card Text & Action */}
          <div style={{ padding: '20px', paddingTop: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
              {planName}
            </h3>
            <p style={{ fontSize: '13px', color: '#4a4a4a', lineHeight: '1.4', marginTop: '8px', minHeight: '54px' }}>
              Full convert and edit capabilities, advanced protection, and powerful e-signature features.
            </p>

            <div style={{ paddingTop: '16px' }}>
              {isCancelled ? (
                <button
                  type="button"
                  onClick={onReactivate}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '9999px',
                    border: '2px solid #000000',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reactivate plan
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    id="cancel-plan-btn"
                    data-testid="cancel-plan-btn"
                    onClick={onOpenCancel}
                    style={{
                      padding: '8px 24px',
                      borderRadius: '9999px',
                      border: '2px solid #000000',
                      backgroundColor: 'transparent',
                      color: '#000000',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'block',
                    }}
                  >
                    Manage plan
                  </button>
                  <p style={{ fontSize: '11px', color: '#767676', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                    Go to <span style={{ fontWeight: 600, fontStyle: 'normal' }}>Manage plan</span> to cancel
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Included in your plan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
            Included in your plan
          </h3>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', fontWeight: 500, color: '#2c2c2c' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#EB1000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: 900 }}>Ac</span>
              </div>
              <span>Acrobat Pro</span>
            </li>

            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#00A3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: 900 }}>Sc</span>
              </div>
              <span>Adobe Scan</span>
            </li>

            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cloud style={{ width: '20px', height: '20px', color: '#4a4a4a', flexShrink: 0, strokeWidth: 1.8 }} />
              <span>Cloud storage 100GB</span>
            </li>

            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles style={{ width: '20px', height: '20px', color: '#4a4a4a', flexShrink: 0, strokeWidth: 1.8 }} />
              <span>Generative AI uses</span>
            </li>
          </ul>

          <div style={{ paddingTop: '4px' }}>
            <button
              style={{
                fontSize: '13px',
                color: '#0265DC',
                fontWeight: 600,
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              +20 view more
            </button>
          </div>

          <div style={{ paddingTop: '20px' }}>
            <button
              type="button"
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                border: '2px solid #000000',
                backgroundColor: 'transparent',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Access your apps and services
            </button>
          </div>
        </div>

        {/* Column 3: Billing and payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
            Billing and payment
          </h3>

          {/* Payment Card Info (Red Warning text matching screenshot) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, color: '#C9252C' }}>
            <CreditCard style={{ width: '16px', height: '16px', color: '#C9252C', flexShrink: 0 }} />
            <span>MasterCard ending ****4617</span>
          </div>

          <div>
            <button
              type="button"
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                backgroundColor: '#3B63FB',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Change payment
            </button>
          </div>

          {/* Pricing & Cadence */}
          <div style={{ paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: '#1e1e1e' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#555', flexShrink: 0 }} />
              <span>{subscription.costMonthly || 'US$59.99'}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#4a4a4a', marginLeft: '26px', marginTop: '2px' }}>
              Monthly plan
            </div>
          </div>

          <div>
            <button
              style={{
                fontSize: '13px',
                color: '#0265DC',
                fontWeight: 600,
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              View billing history
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
