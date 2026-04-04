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
    <div className="z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'flex-end' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      {/* Sheet */}
      <div style={{ position: 'relative', width: '100%', background: 'rgba(20, 15, 35, 0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px 16px 0 0', maxHeight: '70vh', overflowY: 'auto', padding: '20px', paddingBottom: '32px' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-nova-muted hover:text-nova-text transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          ✕
        </button>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />

        <h3 className="text-base font-bold text-nova-text mb-1">Add Funds</h3>
        <p className="text-[11px] text-nova-muted mb-5">
          Deposit ETH to your Nova wallet on Base Sepolia
        </p>

        {/* Deposit method buttons */}
        <div className="space-y-2 mb-4">
          <button className="w-full py-2.5 rounded-xl text-sm font-medium btn-gradient flex items-center justify-center gap-2">
            💳 Buy with Card
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="py-2.5 rounded-xl text-xs font-medium btn-outline flex items-center justify-center gap-1">
              🏦 Exchange
            </button>
            <button className="py-2.5 rounded-xl text-xs font-medium btn-outline flex items-center justify-center gap-1">
               Apple Pay
            </button>
          </div>
          <button
            onClick={copyAddress}
            className="w-full py-3 rounded-xl text-sm font-medium btn-outline flex items-center justify-center gap-2"
          >
            <span>📋</span> {copied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-nova-muted uppercase tracking-wider">Or send directly</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Address box */}
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <p className="text-[11px] text-nova-muted mb-1">Your wallet address</p>
          <p className="text-xs font-mono text-nova-text break-all leading-relaxed select-all">
            {address}
          </p>
        </div>

        <p className="text-[10px] text-nova-muted text-center mt-2">Send ETH on Base Sepolia to this address</p>
      </div>
    </div>
  );
}
