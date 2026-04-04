'use client';

import { useState, useCallback } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { WalletStatus } from '@/components/WalletStatus';

import { AgentIdentityCard } from '@/components/AgentIdentity';
import { useTelegram } from '@/hooks/useTelegram';
import type { ChatMessage, TransactionPlan } from '@/lib/intent-types';

export default function MiniAppPage() {
  const { user, isReady, isGuest } = useTelegram();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePlan, setActivePlan] = useState<TransactionPlan | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const [showAgent, setShowAgent] = useState(false);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);

  const refreshWallet = useCallback(() => {
    setWalletRefreshKey(k => k + 1);
  }, []);

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
        body: JSON.stringify({ intentResult: parseResult, userId: user?.id }),
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

      let resultMsg = execResult.message || `${intent.action} completed.`;
      if (execResult.explorerUrls?.length) {
        resultMsg += '\n\n' + execResult.explorerUrls.map((url: string) => `🔗 ${url}`).join('\n');
      }
      addMessage('assistant', resultMsg);

      // Refresh wallet after successful operation
      refreshWallet();
    } catch {
      addMessage('assistant', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage, user?.id, refreshWallet]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-nova-accent/50 animate-pulse icon-glow">
            <img src="/nova-logo.png" alt="Nova" className="w-full h-full object-cover" style={{ mixBlendMode: 'lighten' }} />
          </div>
          <p className="text-sm text-nova-muted">Initializing Nova...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Web mode banner */}
      {isGuest && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-xs text-nova-muted" style={{ background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
          <span>🌐 Web Mode — Open in Telegram for the full experience</span>
          <a
            href="https://t.me/novahackathon_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline"
          >
            Open →
          </a>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo with glow */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-nova-accent/60 icon-glow">
              <img src="/nova-logo.png" alt="Nova" className="w-full h-full object-cover" style={{ mixBlendMode: 'lighten' }} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-nova-text">Nova</h1>
              <p className="text-[10px] text-nova-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nova-success inline-block" />
                Connected
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAgent(!showAgent)}
            className="btn-outline px-3.5 py-1.5 rounded-full text-xs"
          >
            Agent Info
          </button>
        </div>

        {/* Wallet bar with top border */}
        <div className="border-t border-white/5">
          <WalletStatus userId={user?.id} refreshKey={walletRefreshKey} />
        </div>
      </div>

      {/* Agent info panel */}
      {showAgent && (
        <div className="px-4 py-2 glass-panel">
          <AgentIdentityCard identity={{
            name: 'nova-agent.eth',
            address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            description: 'Zero-click cross-chain DeFi agent',
            skills: ['swap', 'bridge', 'transfer', 'balance', 'nanopay', 'audit', 'memory'],
          }} />
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

    </>
  );
}
