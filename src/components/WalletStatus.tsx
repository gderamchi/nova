'use client';

import { useSmartAccount } from '@/hooks/useSmartAccount';

export function WalletStatus() {
  const { account, balance, isLoading, activeChainId, switchChain } = useSmartAccount();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-nova-surface/80 backdrop-blur-sm border-b border-nova-border">
      {/* Account info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nova-accent to-nova-accent-light flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">
            {account?.address ? account.address.slice(2, 4).toUpperCase() : '??'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-mono text-nova-text truncate">
            {isLoading ? 'Loading...' : account?.address
              ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
              : 'No account'}
          </p>
          <p className="text-[10px] text-nova-muted">
            {isLoading ? '...' : `${balance} ETH`}
          </p>
        </div>
      </div>

      {/* Chain selector */}
      <div className="flex gap-1">
        <ChainButton
          name="Base"
          chainId={84532}
          active={activeChainId === 84532}
          onClick={() => switchChain(84532)}
        />
        <ChainButton
          name="Arb"
          chainId={421614}
          active={activeChainId === 421614}
          onClick={() => switchChain(421614)}
        />
      </div>
    </div>
  );
}

function ChainButton({
  name,
  chainId,
  active,
  onClick,
}: {
  name: string;
  chainId: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
        active
          ? 'bg-nova-accent/20 text-nova-accent-light border border-nova-accent/30'
          : 'bg-nova-surface text-nova-muted border border-nova-border hover:border-nova-accent/20'
      }`}
    >
      {name}
    </button>
  );
}
