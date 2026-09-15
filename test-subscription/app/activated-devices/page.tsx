'use client';

import { AdobeSidebar } from '@/components/adobe-sidebar';
import { Laptop, Smartphone } from 'lucide-react';

export default function ActivatedDevicesPage() {
  return (
    <div className="app-container-body spectrum-Body4">
      <main className="global-layout-width">
        <div className="page-body-view">
          <AdobeSidebar />
          <div className="main-view">
            <div className="page-container plans">
              <h1 className="page-title">Activated devices</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', maxWidth: '720px' }}>
                <div className="plan-pod-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#f4f4f4', padding: '0.5rem', borderRadius: '6px' }}>
                      <Laptop style={{ width: '20px', height: '20px', color: '#555' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>MacBook Pro 16"</div>
                      <div style={{ fontSize: '0.75rem', color: '#6e6e6e', margin: '0.25rem 0' }}>macOS Sequoia • Active now</div>
                      <span className="plan-badge-status status-active" style={{ fontSize: '0.625rem' }}>This device</span>
                    </div>
                  </div>
                </div>

                <div className="plan-pod-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#f4f4f4', padding: '0.5rem', borderRadius: '6px' }}>
                      <Smartphone style={{ width: '20px', height: '20px', color: '#555' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>iPad Pro 13"</div>
                      <div style={{ fontSize: '0.75rem', color: '#6e6e6e', margin: '0.25rem 0' }}>iPadOS • Fresco & Photoshop</div>
                      <button className="plan-link-action plan-link-danger" style={{ fontSize: '0.75rem' }}>Deactivate</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
