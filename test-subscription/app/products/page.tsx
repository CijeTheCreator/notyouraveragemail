'use client';

import { AdobeSidebar } from '@/components/adobe-sidebar';

const PRODUCTS = [
  { name: 'Photoshop', tag: 'Ps', bg: '#001E36', fg: '#31A8FF', desc: 'Create beautiful graphics, photos, and art' },
  { name: 'Illustrator', tag: 'Ai', bg: '#330000', fg: '#FF9A00', desc: 'Vector graphics and illustration' },
  { name: 'Premiere Pro', tag: 'Pr', bg: '#00005B', fg: '#9999FF', desc: 'Industry-standard video editing' },
  { name: 'After Effects', tag: 'Ae', bg: '#00005B', fg: '#9999FF', desc: 'Cinematic visual effects & motion' },
  { name: 'InDesign', tag: 'Id', bg: '#49021F', fg: '#FF3366', desc: 'Page design and layout for print & digital' },
  { name: 'Acrobat Pro', tag: 'Dc', bg: '#EB1000', fg: '#FFFFFF', desc: 'Complete PDF and electronic signature solution' },
];

export default function ProductsPage() {
  return (
    <div className="app-container-body spectrum-Body4">
      <main className="global-layout-width">
        <div className="page-body-view">
          <AdobeSidebar />
          <div className="main-view">
            <div className="page-container plans">
              <h1 className="page-title">Products</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {PRODUCTS.map((prod) => (
                  <div key={prod.name} className="plan-pod-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div
                        style={{ backgroundColor: prod.bg, color: prod.fg, width: '36px', height: '36px', borderRadius: '8px', fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {prod.tag}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{prod.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#0d6832', fontWeight: 600 }}>Included in plan</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#6e6e6e', margin: 0 }}>{prod.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
