'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAccountInfo,
  getBalance,
  formatBalance,
  type SmartAccountInfo,
} from '@/lib/smart-account';

interface UseSmartAccountReturn {
  account: SmartAccountInfo | null;
  balance: string;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  switchChain: (chainId: number) => void;
  activeChainId: number;
}

export function useSmartAccount(): UseSmartAccountReturn {
  const [account, setAccount] = useState<SmartAccountInfo | null>(null);
  const [balance, setBalance] = useState('0.0000');
  const [balanceWei, setBalanceWei] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState(84532); // Base Sepolia default

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const info = await getAccountInfo(activeChainId);
      setAccount(info);

      const bal = await getBalance(activeChainId);
      setBalanceWei(bal);
      setBalance(formatBalance(bal));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setIsLoading(false);
    }
  }, [activeChainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchChain = useCallback((chainId: number) => {
    setActiveChainId(chainId);
  }, []);

  return {
    account,
    balance,
    balanceWei,
    isLoading,
    error,
    refresh,
    switchChain,
    activeChainId,
  };
}
