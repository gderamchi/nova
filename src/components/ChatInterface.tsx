'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, TransactionPlan } from '@/lib/intent-types';
import { TransactionCard } from './TransactionCard';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: ChatMessage[];
  isProcessing: boolean;
  activePlan: TransactionPlan | null;
  txHashes: string[];
}

export function ChatInterface({
  onSendMessage,
  messages,
  isProcessing,
  activePlan,
  txHashes,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    setInput('');
    await onSendMessage(trimmed);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && <WelcomeMessage />}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Active transaction plan */}
        {activePlan && (
          <div className="flex justify-start">
            <TransactionCard plan={activePlan} txHashes={txHashes} />
          </div>
        )}

        {/* Typing indicator */}
        {isProcessing && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => {
                setInput(action.command);
                inputRef.current?.focus();
              }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-nova-surface border border-nova-border text-[11px] text-nova-muted hover:text-nova-text hover:border-nova-accent/30 transition-all"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a DeFi command..."
            className="nova-input flex-1 text-sm"
            disabled={isProcessing}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="nova-button px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-nova-accent text-white rounded-br-sm'
            : message.role === 'system'
              ? 'bg-nova-warning/10 border border-nova-warning/20 text-nova-warning rounded-bl-sm'
              : 'bg-nova-surface border border-nova-border text-nova-text rounded-bl-sm'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60' : 'text-nova-muted'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-nova-surface border border-nova-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-nova-muted animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-nova-muted animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-nova-muted animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-nova-accent/20 flex items-center justify-center animate-pulse-glow">
        <span className="text-3xl">&#9733;</span>
      </div>
      <div>
        <h2 className="text-lg font-bold nova-gradient-text">Welcome to Nova</h2>
        <p className="text-sm text-nova-muted mt-1">
          Your zero-click DeFi agent. Just type what you want.
        </p>
      </div>
      <div className="space-y-1 text-xs text-nova-muted">
        <p>&ldquo;Swap 0.1 ETH to USDC&rdquo;</p>
        <p>&ldquo;Bridge 100 USDC from Base to Arbitrum&rdquo;</p>
        <p>&ldquo;Check my balance&rdquo;</p>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const QUICK_ACTIONS = [
  { label: 'Swap ETH → USDC', command: 'Swap 0.1 ETH to USDC' },
  { label: 'Bridge to Arb', command: 'Bridge 0.05 ETH from Base to Arbitrum' },
  { label: 'My Balance', command: 'Check my balance' },
  { label: 'Send USDC', command: 'Send 10 USDC to vitalik.eth' },
];
