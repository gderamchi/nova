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

type DepositScreen = 'main' | 'card' | 'exchange' | 'applepay';

function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" fill="currentColor" width="16" height="16">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function CardFlow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<'form' | 'loading' | 'done'>('form');
  const [amount, setAmount] = useState('50');

  const handlePay = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(onClose, 2000);
    }, 1500);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-nova-muted">Processing payment...</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-2xl">✅</p>
        <p className="text-sm text-nova-text font-medium text-center">Payment processing!</p>
        <p className="text-xs text-nova-muted text-center">Funds will arrive in ~2 minutes</p>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="text-xs text-nova-muted mb-3 flex items-center gap-1 hover:text-nova-text transition-colors">
        ← Back
      </button>
      <h3 className="text-base font-bold text-nova-text mb-4">Buy with Card</h3>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-nova-muted mb-1 block">Amount in USD</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-nova-text bg-white/5 border border-white/10 outline-none focus:border-purple-500/50"
            placeholder="$50"
          />
        </div>
        <div>
          <label className="text-[11px] text-nova-muted mb-1 block">Card number</label>
          <input
            type="text"
            readOnly
            value="4242 •••• •••• ••••"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-nova-muted bg-white/5 border border-white/10 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-nova-muted mb-1 block">MM/YY</label>
            <input
              type="text"
              readOnly
              value="12/28"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-nova-muted bg-white/5 border border-white/10 outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-nova-muted mb-1 block">CVC</label>
            <input
              type="text"
              readOnly
              value="•••"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-nova-muted bg-white/5 border border-white/10 outline-none"
            />
          </div>
        </div>
        <button
          onClick={handlePay}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white btn-gradient"
        >
          Pay ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
        </button>
        <p className="text-[10px] text-nova-muted text-center">Powered by MoonPay</p>
      </div>
    </>
  );
}

function ExchangeFlow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<'pick' | 'loading' | 'done'>('pick');
  const [selected, setSelected] = useState('');

  const exchanges = [
    { name: 'Binance', icon: '🟡' },
    { name: 'Coinbase', icon: '🔵' },
    { name: 'Kraken', icon: '🟣' },
  ];

  const handleSelect = (name: string) => {
    setSelected(name);
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(onClose, 2000);
    }, 1500);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-nova-muted">Connecting to {selected}...</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-2xl">✅</p>
        <p className="text-sm text-nova-text font-medium text-center">Withdrawal initiated!</p>
        <p className="text-xs text-nova-muted text-center">ETA ~5 minutes</p>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="text-xs text-nova-muted mb-3 flex items-center gap-1 hover:text-nova-text transition-colors">
        ← Back
      </button>
      <h3 className="text-base font-bold text-nova-text mb-4">Withdraw from Exchange</h3>
      <div className="space-y-2">
        {exchanges.map((ex) => (
          <button
            key={ex.name}
            onClick={() => handleSelect(ex.name)}
            className="w-full py-3 rounded-xl text-sm font-medium btn-outline flex items-center gap-3 px-4 hover:bg-white/5 transition-colors"
          >
            <span className="text-lg">{ex.icon}</span>
            {ex.name}
          </button>
        ))}
      </div>
    </>
  );
}

function ApplePayFlow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<'confirm' | 'loading' | 'done'>('confirm');

  const handlePay = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(onClose, 2000);
    }, 1500);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-nova-muted">Authorizing...</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-2xl">✅</p>
        <p className="text-sm text-nova-text font-medium text-center">Payment confirmed!</p>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="text-xs text-nova-muted mb-3 flex items-center gap-1 hover:text-nova-text transition-colors">
        ← Back
      </button>
      <div className="flex flex-col items-center py-4 gap-4">
        <p className="text-3xl font-bold text-nova-text">$50.00</p>
        <button
          onClick={handlePay}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: '#000', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <AppleLogo /> Pay
        </button>
      </div>
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
  const [screen, setScreen] = useState<DepositScreen>('main');

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const goBack = () => setScreen('main');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'rgba(20, 15, 35, 0.98)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px 16px 0 0',
          overflowY: 'auto',
          padding: '20px',
          paddingBottom: '40px',
          maxHeight: '70dvh',
          flexShrink: 0,
        }}
      >
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

        {screen === 'card' && <CardFlow onBack={goBack} onClose={onClose} />}
        {screen === 'exchange' && <ExchangeFlow onBack={goBack} onClose={onClose} />}
        {screen === 'applepay' && <ApplePayFlow onBack={goBack} onClose={onClose} />}

        {screen === 'main' && (
          <>
            <h3 className="text-base font-bold text-nova-text mb-1">Add Funds</h3>
            <p className="text-[11px] text-nova-muted mb-5">
              Deposit ETH to your Nova wallet on Base Sepolia
            </p>

            {/* Deposit method buttons */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setScreen('card')}
                className="w-full py-2.5 rounded-xl text-sm font-medium btn-gradient flex items-center justify-center gap-2"
              >
                💳 Buy with Card
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScreen('exchange')}
                  className="py-2.5 rounded-xl text-xs font-medium btn-outline flex items-center justify-center gap-1"
                >
                  🏦 Exchange
                </button>
                <button
                  onClick={() => setScreen('applepay')}
                  className="py-2.5 rounded-xl text-xs font-medium btn-outline flex items-center justify-center gap-1 text-white"
                >
                  <AppleLogo /> Pay
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
          </>
        )}
      </div>
    </div>
  );
}
