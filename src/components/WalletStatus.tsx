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
  const [activeChain, setActiveChain] = useState<'baseSepolia' | 'arbitrumSepolia'>('baseSepolia');
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
    ? parseFloat(wallet.balances[activeChain]).toFixed(5)
    : '0.00000';

  const truncatedAddr = wallet
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : '';

  const chainLabel = activeChain === 'baseSepolia' ? 'Base Sepolia' : 'Arbitrum Sepolia';

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
      <div className="px-3 py-2 bg-nova-surface/80 backdrop-blur-sm border-b border-nova-border">
        {/* Address + balance row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nova-accent to-nova-accent-light flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">
              {wallet ? wallet.address.slice(2, 4).toUpperCase() : '??'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={copyAddress}
              className="text-xs font-mono text-nova-text hover:text-nova-accent-light transition-colors flex items-center gap-1"
            >
              {isLoading ? 'Loading...' : truncatedAddr || 'No wallet'}
              {wallet && (
                <span className="text-[10px] text-nova-muted">
                  {copied ? '✓' : '⧉'}
                </span>
              )}
            </button>
            <p className="text-[10px] text-nova-muted">
              {isLoading ? '...' : `${balance} ETH on ${chainLabel}`}
            </p>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowDeposit(true)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-nova-accent/20 text-nova-accent-light border border-nova-accent/30 hover:bg-nova-accent/30 transition-all"
          >
            Deposit
          </button>
        </div>

        {/* Chain selector */}
        <div className="flex gap-1">
          <ChainTab
            name="Base"
            active={activeChain === 'baseSepolia'}
            onClick={() => setActiveChain('baseSepolia')}
          />
          <ChainTab
            name="Arb"
            active={activeChain === 'arbitrumSepolia'}
            onClick={() => setActiveChain('arbitrumSepolia')}
          />
        </div>
      </div>

      {/* Deposit modal */}
      {showDeposit && wallet && (
        <DepositModal
          address={wallet.address}
          chainLabel={chainLabel}
          onClose={() => setShowDeposit(false)}
        />
      )}
    </>
  );
}

function ChainTab({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
        active
          ? 'bg-nova-accent/20 text-nova-accent-light border border-nova-accent/30'
          : 'bg-nova-surface text-nova-muted border border-nova-border hover:border-nova-accent/20'
      }`}
    >
      {name}
    </button>
  );
}

function DepositModal({
  address,
  chainLabel,
  onClose,
}: {
  address: string;
  chainLabel: string;
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
      <div className="relative w-full max-w-md bg-nova-surface border-t border-nova-border rounded-t-2xl p-5 pb-8 animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-nova-border mx-auto mb-4" />

        <h3 className="text-sm font-bold text-nova-text mb-1">Deposit ETH</h3>
        <p className="text-[11px] text-nova-muted mb-4">
          Send ETH to this address on {chainLabel}
        </p>

        {/* Address box */}
        <div className="bg-nova-bg rounded-xl p-3 mb-3 border border-nova-border">
          <p className="text-[11px] text-nova-muted mb-1">Your wallet address</p>
          <p className="text-xs font-mono text-nova-text break-all leading-relaxed">
            {address}
          </p>
        </div>

        {/* Copy button */}
        <button
          onClick={copyAddress}
          className="w-full py-2.5 rounded-xl text-xs font-medium transition-all bg-nova-accent hover:bg-nova-accent/80 text-white active:scale-[0.98]"
        >
          {copied ? 'Copied!' : 'Copy Address'}
        </button>

        {/* QR placeholder */}
        <div className="mt-4 flex flex-col items-center gap-2 py-4 rounded-xl border border-dashed border-nova-border">
          <div className="w-16 h-16 rounded-lg bg-nova-bg border border-nova-border flex items-center justify-center">
            <span className="text-nova-muted text-lg">⬚</span>
          </div>
          <p className="text-[10px] text-nova-muted">Scan to deposit</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 rounded-xl text-xs text-nova-muted border border-nova-border hover:border-nova-accent/20 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
