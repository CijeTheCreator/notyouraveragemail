'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Bell, Grid, LogOut } from 'lucide-react';

export function AdobeHeader() {
  const router = useRouter();
  const { user, isLoaded, logout } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    router.push('/login');
  };

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

        {/* Right Actions: If logged in, show notifications, apps, user button with logout dropdown. If not, show black Login button. */}
        {isLoaded && (
          user ? (
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

              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#00A3E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  title={`Signed in as ${user.email} (Click for options)`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px', marginTop: '4px' }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </button>

                {isMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '42px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      border: '1px solid #e1e1e1',
                      padding: '16px',
                      minWidth: '220px',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>
                        {user.name || 'Adobe User'}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '190px',
                        }}
                        title={user.email}
                      >
                        {user.email}
                      </div>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0 12px' }} />
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        border: '2px solid #000000',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <LogOut style={{ width: '14px', height: '14px' }} />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                border: '2px solid #000000',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
                cursor: 'pointer',
              }}
            >
              Log in
            </Link>
          )
        )}
      </div>
    </header>
  );
}
