import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Nova - DeFi Agent',
  description: 'Zero-click cross-chain DeFi agent in Telegram',
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-nova-bg">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </div>
  );
}
