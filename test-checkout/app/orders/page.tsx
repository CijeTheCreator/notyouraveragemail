'use client';

import { AdobeSidebar } from '@/components/adobe-sidebar';

export default function OrdersPage() {
  return (
    <div className="app-container-body spectrum-Body4">
      <main className="global-layout-width">
        <div className="page-body-view">
          <AdobeSidebar />
          <div className="main-view">
            <div className="page-container plans">
              <h1 className="page-title">Orders and invoices</h1>
              <div className="plan-pod-card" style={{ maxWidth: '720px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontSize: '0.75rem', fontWeight: 700, color: '#8e8e8e', textTransform: 'uppercase' }}>
                  <span>Date</span>
                  <span>Description</span>
                  <span>Amount</span>
                  <span>Invoice</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6e6e6e' }}>Today</span>
                  <span style={{ fontWeight: 600 }}>Creative Cloud All Apps (Monthly)</span>
                  <span style={{ fontWeight: 700 }}>$59.99</span>
                  <button className="plan-link-action">Download PDF</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
