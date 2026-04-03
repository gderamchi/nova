'use client';

import { useState } from 'react';

interface DemoStep {
  title: string;
  description: string;
  command: string;
  expectedAction: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    title: '1. Swap Tokens',
    description: 'Swap ETH for USDC via Uniswap V3 on Base Sepolia',
    command: 'Swap 0.1 ETH to USDC on Base',
    expectedAction: 'swap',
  },
  {
    title: '2. Cross-Chain Bridge',
    description: 'Bridge USDC from Base Sepolia to Arbitrum Sepolia via Across',
    command: 'Bridge 50 USDC from Base to Arbitrum',
    expectedAction: 'bridge',
  },
  {
    title: '3. Check Balance',
    description: 'Query multi-chain balances across all supported chains',
    command: 'What are my balances on all chains?',
    expectedAction: 'balance',
  },
  {
    title: '4. ENS Transfer',
    description: 'Send tokens to an ENS name — Nova resolves it automatically',
    command: 'Send 10 USDC to vitalik.eth',
    expectedAction: 'transfer',
  },
];

interface DemoModeProps {
  onRunCommand: (command: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function DemoMode({ onRunCommand, isActive, onToggle }: DemoModeProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-50 px-3 py-2 rounded-xl bg-nova-accent/20 border border-nova-accent/30 text-xs text-nova-accent-light hover:bg-nova-accent/30 transition-all"
      >
        Demo Mode
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 left-4 z-50 nova-card shadow-2xl shadow-nova-accent/10 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium nova-gradient-text">Demo Walkthrough</h3>
        <button onClick={onToggle} className="text-nova-muted hover:text-nova-text text-xs">
          Close
        </button>
      </div>

      <div className="space-y-2">
        {DEMO_STEPS.map((step, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentStep(i);
              onRunCommand(step.command);
            }}
            className={`w-full text-left p-2 rounded-lg transition-all ${
              i === currentStep
                ? 'bg-nova-accent/10 border border-nova-accent/30'
                : 'bg-nova-bg/50 border border-nova-border hover:border-nova-accent/20'
            }`}
          >
            <p className="text-xs font-medium text-nova-text">{step.title}</p>
            <p className="text-[10px] text-nova-muted mt-0.5">{step.description}</p>
            <p className="text-[10px] text-nova-accent-light mt-1 font-mono">
              &ldquo;{step.command}&rdquo;
            </p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 h-1 rounded-full bg-nova-border overflow-hidden">
          <div
            className="h-full bg-nova-accent rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / DEMO_STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-nova-muted">
          {currentStep + 1}/{DEMO_STEPS.length}
        </span>
      </div>
    </div>
  );
}
