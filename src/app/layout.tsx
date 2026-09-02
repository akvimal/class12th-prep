import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { BottomNav } from '@/components/bottom-nav';
import { RegisterSW } from '@/components/register-sw';
import { AppFrame } from '@/components/ui';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
});
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
});

export const metadata: Metadata = {
  title: 'Board Prep',
  description: 'Date-driven CBSE Class XII board-exam preparation tracker',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Board Prep', statusBarStyle: 'default' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#fdfcfa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-sink text-ink">
        <AppFrame>
          {children}
          <BottomNav />
        </AppFrame>
        <RegisterSW />
      </body>
    </html>
  );
}
