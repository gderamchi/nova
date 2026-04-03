'use client';

import type { TransactionPlan, TransactionStep } from '@/lib/intent-types';

interface TransactionCardProps {
  plan: TransactionPlan;
  txHashes?: string[];
  chainId?: number;
}

export function TransactionCard({ plan, txHashes, chainId }: TransactionCardProps) {
  return (
    <div className="nova-card space-y-3 max-w-sm">
      {/* Route header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-nova-accent/20 flex items-center justify-center">
          <RouteIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-nova-text truncate">{plan.route}</p>
          <p className="text-xs text-nova-muted">{plan.estimatedTime} &middot; Gas: {plan.estimatedGas}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {plan.steps.map((step, i) => (
          <StepRow key={i} step={step} isLast={i === plan.steps.length - 1} />
        ))}
      </div>

      {/* Tx hashes */}
      {txHashes && txHashes.length > 0 && (
        <div className="pt-2 border-t border-nova-border">
          {txHashes.map((hash, i) => (
            <a
              key={i}
              href={getExplorerUrl(hash, chainId ?? 84532)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-nova-accent-light hover:underline block truncate"
            >
              {hash.slice(0, 10)}...{hash.slice(-6)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function StepRow({ step, isLast }: { step: TransactionStep; isLast: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center">
        <StepIcon status={step.status} />
        {!isLast && <div className="w-px h-4 bg-nova-border" />}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <p className={`text-xs ${step.status === 'complete' ? 'text-nova-success' : step.status === 'error' ? 'text-nova-error' : step.status === 'active' ? 'text-nova-text' : 'text-nova-muted'}`}>
          {step.label}
        </p>
        {step.detail && (
          <p className="text-[10px] text-nova-muted mt-0.5">{step.detail}</p>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === 'complete') {
    return (
      <div className="w-4 h-4 rounded-full bg-nova-success/20 flex items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 4L3 6L7 2" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-4 h-4 rounded-full bg-nova-accent/30 flex items-center justify-center animate-pulse">
        <div className="w-2 h-2 rounded-full bg-nova-accent" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-4 h-4 rounded-full bg-nova-error/20 flex items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 2L6 6M6 2L2 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-4 h-4 rounded-full bg-nova-border flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-nova-muted" />
    </div>
  );
}

function RouteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8H14M10 4L14 8L10 12" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getExplorerUrl(hash: string, chainId: number): string {
  const base = chainId === 421614
    ? 'https://sepolia.arbiscan.io'
    : 'https://sepolia.basescan.org';
  return `${base}/tx/${hash}`;
}
