import type React from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { ToastContainer } from 'react-toastify';
import { AdobeHeader } from '@/components/adobe-header';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adobe Account | Plans',
  description: 'Manage your Adobe Creative Cloud plans, billing, and subscription settings',
  icons: {
    icon: 'https://www.adobe.com/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="stylesheet" href="/adobe-account.css" />
      </head>
      <body>
        <AdobeHeader />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Analytics />
      </body>
    </html>
  );
}
