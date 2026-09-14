'use client';

import { AdobeSidebar } from '@/components/adobe-sidebar';
import { CreditCard } from 'lucide-react';

export default function PaymentMethodsPage() {
  return (
    <div className="app-container-body spectrum-Body4">
      <main className="global-layout-width">
        <div className="page-body-view">
          <AdobeSidebar />
          <div className="main-view">
            <div className="page-container plans">
              <h1 className="page-title">Payment methods</h1>
              <div className="plan-pod-card" style={{ padding: '1.5rem', maxWidth: '640px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#f4f4f4', padding: '0.75rem', borderRadius: '6px' }}>
                      <CreditCard style={{ width: '24px', height: '24px', color: '#555' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Visa ending in 4242</div>
                      <div style={{ fontSize: '0.75rem', color: '#6e6e6e' }}>Expires 12/2028 • Default payment method</div>
                    </div>
                  </div>
                  <span className="plan-badge-status status-active">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
