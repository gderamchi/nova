'use client';

import { useState, useEffect, useCallback } from 'react';

interface WalletData {
  address: string;
  balances: {
    baseSepolia: string;
    arbitrumSepolia: string;
  };
}

interface WalletStatusProps {
  userId?: number;
  refreshKey?: number;
}

export function WalletStatus({ userId, refreshKey }: WalletStatusProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = userId !== undefined ? `?userId=${userId}` : '';
      const res = await fetch(`/api/wallet${params}`);
      const data = await res.json();
      if (data.address) {
        setWallet(data);
      }
    } catch {
      // silent fail — UI shows loading state
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet, refreshKey]);

  const balance = wallet
    ? parseFloat(wallet.balances.baseSepolia).toFixed(5)
    : '0.00000';

  const truncatedAddr = wallet
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : '';

  const copyAddress = useCallback(async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available in some TG webviews
    }
  }, [wallet]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: address + balance */}
        <div className="min-w-0">
          <button
            onClick={copyAddress}
            className="text-xs font-mono text-nova-text/80 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {isLoading ? 'Loading...' : truncatedAddr || 'No wallet'}
            {wallet && (
              <span className="text-[10px] text-nova-muted">
                {copied ? '✓' : '⧉'}
              </span>
            )}
          </button>
          <p className="text-[10px] text-nova-muted">
            {isLoading ? '...' : `${balance} ETH on Base Sepolia`}
          </p>
        </div>

        {/* Right: Deposit button */}
        <button
          onClick={() => setShowDeposit(true)}
          className="btn-gradient px-4 py-1.5 rounded-full text-xs"
        >
          Deposit
        </button>
      </div>

      {/* Deposit modal */}
      {showDeposit && wallet && (
        <DepositModal
          address={wallet.address}
          onClose={() => setShowDeposit(false)}
        />
      )}
    </>
  );
}

function DepositModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md rounded-t-2xl p-5 pb-8 animate-slide-up" style={{ background: 'rgba(20, 15, 35, 0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />

        <h3 className="text-sm font-bold text-nova-text mb-1">Deposit ETH</h3>
        <p className="text-[11px] text-nova-muted mb-4">
          Send ETH to this address on Base Sepolia
        </p>

        {/* Address box */}
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <p className="text-[11px] text-nova-muted mb-1">Your wallet address</p>
          <p className="text-xs font-mono text-nova-text break-all leading-relaxed">
            {address}
          </p>
        </div>

        {/* Copy button */}
        <button
          onClick={copyAddress}
          className="w-full py-2.5 rounded-full text-xs font-medium btn-gradient"
        >
          {copied ? 'Copied!' : 'Copy Address'}
        </button>

        {/* QR placeholder */}
        <div className="mt-4 flex flex-col items-center gap-2 py-4 rounded-xl border border-dashed" style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
          <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <span className="text-nova-muted text-lg">⬚</span>
          </div>
          <p className="text-[10px] text-nova-muted">Scan to deposit</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 rounded-full text-xs btn-outline"
        >
          Close
        </button>
      </div>
    </div>
  );
}
