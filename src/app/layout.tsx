import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nova - Zero-Click DeFi Agent',
  description: 'AI-powered DeFi agent in your Telegram. Just type what you want.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d0a17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-[100dvh] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
