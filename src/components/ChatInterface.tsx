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

      {/* Footer with gradient fade */}
      <div className="sticky bottom-0" style={{ background: 'linear-gradient(to bottom, transparent, #0d0a17 30%)' }}>
        {/* Quick actions */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  setInput(action.command);
                  inputRef.current?.focus();
                }}
                className="flex-shrink-0 btn-outline px-3.5 py-1.5 rounded-full text-[11px]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a DeFi command..."
              className="input-glass w-full rounded-2xl px-4 py-3 pr-12 text-sm"
              disabled={isProcessing}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-1.5 btn-gradient w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  // Detect transaction result messages (assistant messages with explorer URLs + success keywords)
  const txCard = !isUser && message.role === 'assistant' ? parseTransactionResult(message.content) : null;

  if (txCard) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          {/* Text portion (if any) */}
          {txCard.textBefore && (
            <div
              className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-nova-text"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{txCard.textBefore}</p>
            </div>
          )}
          {/* Transaction card */}
          <div
            className="rounded-2xl rounded-bl-sm px-4 py-3.5"
            style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
          >
            <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
              ✅ {txCard.headline}
            </p>
            {txCard.detail && (
              <p className="text-xs text-nova-muted mt-1">{txCard.detail}</p>
            )}
            <a
              href={txCard.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              🔗 View on BaseScan →
            </a>
            <p className="text-[11px] text-nova-muted/70 mt-2">Your tokens are in your Nova wallet</p>
          </div>
          <p className="text-[10px] text-nova-muted">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? 'btn-gradient rounded-br-sm'
            : message.role === 'system'
              ? 'rounded-bl-sm text-nova-warning'
              : 'rounded-bl-sm text-nova-text'
        }`}
        style={
          isUser
            ? undefined
            : message.role === 'system'
              ? { background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }
              : { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }
        }
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {isUser ? message.content : <LinkifiedText text={message.content} />}
        </p>
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
      <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {/* Decorative star icon with glow rings */}
      <div className="relative">
        {/* Outer ring */}
        <div className="absolute inset-0 w-24 h-24 -m-4 rounded-full border border-purple-500/10 animate-ring-pulse" />
        {/* Middle ring */}
        <div className="absolute inset-0 w-20 h-20 -m-2 rounded-full border border-purple-500/20 animate-ring-pulse [animation-delay:1s]" />
        {/* Icon circle */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-nova-accent/50 icon-glow">
          <img src="/nova-logo.png" alt="Nova" className="w-full h-full object-cover" style={{ mixBlendMode: 'lighten' }} />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-nova-text text-glow">Welcome to Nova</h2>
        <p className="text-sm text-nova-muted mt-2">
          Your zero-click DeFi agent. Just type what you want.
        </p>
      </div>

      <div className="space-y-2 text-xs text-nova-muted/60">
        <p>&ldquo;Swap 0.1 ETH to USDC&rdquo;</p>
        <p>&ldquo;Bridge 100 USDC from Base to Arbitrum&rdquo;</p>
        <p>&ldquo;Check my balance&rdquo;</p>
      </div>
    </div>
  );
}

interface TransactionResultCard {
  headline: string;
  detail: string;
  url: string;
  textBefore: string;
}

function parseTransactionResult(content: string): TransactionResultCard | null {
  // Match explorer URLs (basescan, etherscan, arbiscan, etc.)
  const urlMatch = content.match(/(https?:\/\/[^\s]*(?:scan|explorer)[^\s]*)/i);
  if (!urlMatch) return null;

  // Must also contain a success-related keyword
  const successPattern = /swapped|swap completed|sent|bridging|bridge completed|transfer completed|confirmed/i;
  if (!successPattern.test(content)) return null;

  const url = urlMatch[1];

  // Extract a headline from the message
  const headlineMatch = content.match(/(swapped\s+.+?(?:for|to|→)\s+\S+|sent\s+.+?to\s+\S+|bridging\s+.+?(?:to|→)\s+\S+)/i);
  const headline = headlineMatch ? headlineMatch[1] : 'Transaction Confirmed';

  // Text before the first 🔗 or URL
  const textBefore = content
    .split(/🔗|https?:\/\//)[0]
    .replace(successPattern, '')
    .trim()
    .replace(/\n+$/, '');

  return { headline, detail: '', url, textBefore };
}

function LinkifiedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
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
