'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  e2e: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Plans', href: '/plans', e2e: 'plans-list' },
  { title: 'Payment methods', href: '/payment', e2e: 'payment' },
  { title: 'Orders and invoices', href: '/orders', e2e: 'orders-and-invoices' },
  { title: 'Activated devices', href: '/activated-devices', e2e: 'activated-devices' },
  { title: 'Products', href: '/products', e2e: 'plans-products' },
];

export function AdobeSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '210px',
        flexShrink: 0,
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <ul
        data-e2e="plans-submenu"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href} style={{ margin: 0, padding: 0 }}>
              <Link
                href={item.href}
                data-e2e={item.e2e}
                style={{
                  display: 'block',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  textDecoration: 'none',
                  color: isActive ? '#000000' : '#4a4a4a',
                  fontWeight: isActive ? 700 : 500,
                  borderLeft: isActive ? '3px solid #000000' : '3px solid transparent',
                  paddingLeft: '12px',
                  boxSizing: 'border-box',
                }}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
