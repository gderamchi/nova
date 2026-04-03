'use client';

import { useState, useCallback } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { WalletStatus } from '@/components/WalletStatus';
import { DemoMode } from '@/components/DemoMode';
import { AgentIdentityCard } from '@/components/AgentIdentity';
import { useTelegram } from '@/hooks/useTelegram';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import type { ChatMessage, TransactionPlan } from '@/lib/intent-types';
import { createAgentIdentity } from '@/lib/ens/identity';

export default function MiniAppPage() {
  const { user, isReady } = useTelegram();
  const { account } = useSmartAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePlan, setActivePlan] = useState<TransactionPlan | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [showAgent, setShowAgent] = useState(false);

  const agentIdentity = createAgentIdentity(
    'nova-agent.eth',
    (account?.address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
    {
      description: 'Zero-click cross-chain DeFi agent',
      skills: ['swap', 'bridge', 'transfer', 'balance', 'nanopay'],
    },
  );

  const addMessage = useCallback((role: ChatMessage['role'], content: string, extra?: Partial<ChatMessage>) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    addMessage('user', content);
    setIsProcessing(true);
    setActivePlan(null);
    setTxHashes([]);

    try {
      // Step 1: Parse intent via API
      const parseRes = await fetch('/api/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      const parseResult = await parseRes.json();

      if (!parseResult.success) {
        addMessage('assistant', parseResult.message);
        if (parseResult.suggestions?.length) {
          addMessage('system', `Try: ${parseResult.suggestions.join(' | ')}`);
        }
        setIsProcessing(false);
        return;
      }

      const intent = parseResult.intent;
      addMessage('assistant', parseResult.message);

      // Step 2: Show execution plan (loading state)
      const plan: TransactionPlan = {
        steps: [
          { label: `Parsing: ${intent.action} ${intent.amount} ${intent.tokenIn}`, status: 'complete' },
          { label: 'Planning route...', status: 'active' },
          { label: 'Executing transaction', status: 'pending' },
          { label: 'Confirming on-chain', status: 'pending' },
        ],
        estimatedGas: '~150,000',
        estimatedTime: '~15 seconds',
        route: `${intent.tokenIn} → ${intent.tokenOut || intent.tokenIn} (${intent.action})`,
      };

      setActivePlan(plan);

      // Step 3: Call real backend orchestrator
      setActivePlan({
        ...plan,
        steps: plan.steps.map((s, i) => ({
          ...s,
          status: i <= 1 ? 'complete' : i === 2 ? 'active' : 'pending',
        })),
      });

      const execRes = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentResult: parseResult }),
      });

      const execResult = await execRes.json();

      if (execResult.success && execResult.plan) {
        setActivePlan(execResult.plan);
      } else {
        setActivePlan({
          ...plan,
          steps: plan.steps.map(s => ({ ...s, status: execResult.success ? 'complete' : 'error' })),
        });
      }

      if (execResult.txHashes?.length) {
        setTxHashes(execResult.txHashes);
      }

      // Show real result message with explorer links
      let resultMsg = execResult.message || `${intent.action} completed.`;
      if (execResult.explorerUrls?.length) {
        resultMsg += '\n\n' + execResult.explorerUrls.map((url: string) => `🔗 ${url}`).join('\n');
      }
      addMessage('assistant', resultMsg);
    } catch (error) {
      addMessage('assistant', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-nova-accent/20 flex items-center justify-center animate-pulse">
            <span className="text-xl">&#9733;</span>
          </div>
          <p className="text-sm text-nova-muted">Initializing Nova...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-nova-surface/60 backdrop-blur-sm border-b border-nova-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-nova-accent to-nova-accent-light flex items-center justify-center">
            <span className="text-sm font-bold text-white">N</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-nova-text">Nova</h1>
            <p className="text-[10px] text-nova-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-nova-success inline-block" />
              Online
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAgent(!showAgent)}
          className="px-2 py-1 rounded-lg text-[10px] text-nova-muted border border-nova-border hover:border-nova-accent/30 transition-all"
        >
          Agent Info
        </button>
      </div>

      {/* Wallet status bar */}
      <WalletStatus />

      {/* Agent info panel */}
      {showAgent && (
        <div className="px-4 py-2 border-b border-nova-border">
          <AgentIdentityCard identity={agentIdentity} />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          onSendMessage={handleSendMessage}
          messages={messages}
          isProcessing={isProcessing}
          activePlan={activePlan}
          txHashes={txHashes}
        />
      </div>

      {/* Demo mode */}
      <DemoMode
        onRunCommand={handleSendMessage}
        isActive={showDemo}
        onToggle={() => setShowDemo(!showDemo)}
      />
    </>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
