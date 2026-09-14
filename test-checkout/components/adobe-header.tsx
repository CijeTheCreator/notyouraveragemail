'use client';

import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Bell, Grid } from 'lucide-react';

export function AdobeHeader() {
  const { user } = useSession();

  return (
    <header
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e1e1e1',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 32px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Official Logo + Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link
            href="/plans"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#000000',
            }}
          >
            <img
              src="https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg"
              alt="Adobe"
              style={{ height: '22px', width: 'auto', display: 'block' }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: '18px',
                color: '#000000',
                letterSpacing: '-0.01em',
              }}
            >
              Adobe Account
            </span>
          </Link>

          {/* Center Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              height: '64px',
            }}
          >
            <Link
              href="/plans"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#2c2c2c',
                textDecoration: 'none',
              }}
            >
              Overview
            </Link>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2c2c2c',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <span>Account and security</span>
              <svg viewBox="0 0 10 6" fill="none" stroke="#555" style={{ width: '9px', height: '9px', strokeWidth: 2 }}>
                <path d="M1 1L5 5L9 1" />
              </svg>
            </span>

            <Link
              href="/plans"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#000000',
                textDecoration: 'none',
                height: '64px',
                borderBottom: '3px solid #000000',
                boxSizing: 'border-box',
              }}
            >
              <span>Plans and payment</span>
              <svg viewBox="0 0 10 6" fill="none" stroke="#000" style={{ width: '9px', height: '9px', strokeWidth: 2 }}>
                <path d="M1 1L5 5L9 1" />
              </svg>
            </Link>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2c2c2c',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <span>Communication preferences</span>
              <svg viewBox="0 0 10 6" fill="none" stroke="#555" style={{ width: '9px', height: '9px', strokeWidth: 2 }}>
                <path d="M1 1L5 5L9 1" />
              </svg>
            </span>
          </nav>
        </div>

        {/* Right Actions: Notifications, 9-dot app grid, Cyan Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#4a4a4a',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Notifications"
          >
            <Bell style={{ width: '20px', height: '20px', strokeWidth: 1.8 }} />
          </button>

          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#4a4a4a',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Adobe Apps"
          >
            <Grid style={{ width: '20px', height: '20px', strokeWidth: 1.8 }} />
          </button>

          <Link
            href="/login"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#00A3E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              textDecoration: 'none',
            }}
            title={user ? `Signed in as ${user.email}` : 'Sign In'}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px', marginTop: '4px' }}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
