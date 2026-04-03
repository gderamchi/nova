'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mini-app');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-nova-accent/20 flex items-center justify-center animate-pulse-glow">
          <span className="text-3xl">&#9733;</span>
        </div>
        <h1 className="text-2xl font-bold nova-gradient-text">Nova</h1>
        <p className="text-nova-muted text-sm">Loading your DeFi agent...</p>
      </div>
    </main>
  );
}
