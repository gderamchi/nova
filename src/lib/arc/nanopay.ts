/**
 * Arc/Circle USDC Nanopayment Layer
 * Enables micro-payments between agents using USDC on supported chains.
 *
 * Real mode: approve + deposit USDC into Circle Gateway on Base Sepolia.
 * Demo fallback: in-memory ledger when no USDC balance or no wallet provided.
 */

import type { WalletClient, PublicClient } from 'viem';
import {
  approveGateway,
  depositToGateway,
  getUSDCBalance,
} from '../circle/gateway';
import { getGasOverrides } from '../server-account';
import { getNonceForAccount } from '../user-wallets';

export interface NanopaymentRequest {
  fromAgent: string;
  toAgent: string;
  amount: string; // USDC amount (e.g. "0.001")
  memo?: string;
  chainId: number;
}

/** Extended request that carries wallet/public clients for real on-chain deposits. */
export interface NanopaymentOnChainRequest extends NanopaymentRequest {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: ReturnType<typeof import('viem/accounts').privateKeyToAccount>;
}

export interface NanopaymentResult {
  success: boolean;
  paymentId: string;
  txHash?: string;
  approveTxHash?: string;
  amount: string;
  fee: string;
  timestamp: number;
  error?: string;
  mode: 'gateway' | 'ledger';
}

export interface PaymentChannel {
  channelId: string;
  fromAgent: string;
  toAgent: string;
  balance: string;
  totalSent: string;
  totalReceived: string;
  isOpen: boolean;
}

// In-memory payment ledger for demo
const paymentLedger: NanopaymentResult[] = [];
const channelBalances = new Map<string, number>();

/**
 * Create a USDC nanopayment.
 *
 * If an `onChain` parameter is provided with wallet/public clients AND the
 * sender has enough USDC, this performs a real Circle Gateway deposit
 * (approve + deposit). Otherwise falls back to the demo ledger.
 */
export async function createNanopayment(
  request: NanopaymentRequest,
  onChain?: {
    walletClient: WalletClient;
    publicClient: PublicClient;
    account: ReturnType<typeof import('viem/accounts').privateKeyToAccount>;
  },
): Promise<NanopaymentResult> {
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // ── Real on-chain path: Circle Gateway approve + deposit ──
    if (onChain) {
      const { walletClient, publicClient, account } = onChain;
      const usdcBalance = await getUSDCBalance(publicClient, account.address);
      const requestedRaw = BigInt(Math.floor(parseFloat(request.amount) * 1e6));

      if (usdcBalance.raw >= requestedRaw && requestedRaw > BigInt(0)) {
        const gas = await getGasOverrides(request.chainId);

        // 1. Approve Gateway Wallet to spend USDC
        const approveNonce = await getNonceForAccount(request.chainId, account.address);
        const approveTxHash = await approveGateway(
          walletClient, publicClient, request.amount, gas, approveNonce, account,
        );

        // 2. Deposit USDC into Gateway unified balance
        const depositNonce = await getNonceForAccount(request.chainId, account.address);
        const depositTxHash = await depositToGateway(
          walletClient, publicClient, request.amount, gas, depositNonce, account,
        );

        const result: NanopaymentResult = {
          success: true,
          paymentId,
          txHash: depositTxHash,
          approveTxHash,
          amount: request.amount,
          fee: '0',
          timestamp: Date.now(),
          mode: 'gateway',
        };
        paymentLedger.push(result);

        // Update channel balance
        const channelKey = `${request.fromAgent}-${request.toAgent}`;
        const currentBalance = channelBalances.get(channelKey) ?? 0;
        channelBalances.set(channelKey, currentBalance + parseFloat(request.amount));

        return result;
      }
      // If insufficient USDC, fall through to demo mode
    }

    // ── Demo fallback: in-memory simulated payment ──
    const result: NanopaymentResult = {
      success: true,
      paymentId,
      amount: request.amount,
      fee: '0.0001',
      timestamp: Date.now(),
      mode: 'ledger',
    };

    // Update channel balance
    const channelKey = `${request.fromAgent}-${request.toAgent}`;
    const currentBalance = channelBalances.get(channelKey) ?? 0;
    channelBalances.set(channelKey, currentBalance + parseFloat(request.amount));

    paymentLedger.push(result);
    return result;
  } catch (error) {
    return {
      success: false,
      paymentId,
      amount: request.amount,
      fee: '0',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Payment failed',
      mode: 'ledger',
    };
  }
}

export function getPaymentHistory(agentId?: string): NanopaymentResult[] {
  return paymentLedger.slice(-50);
}

export function getChannelBalance(fromAgent: string, toAgent: string): number {
  return channelBalances.get(`${fromAgent}-${toAgent}`) ?? 0;
}

export async function openPaymentChannel(
  fromAgent: string,
  toAgent: string,
  initialDeposit: string,
): Promise<PaymentChannel> {
  const channelId = `ch-${Date.now()}`;
  channelBalances.set(`${fromAgent}-${toAgent}`, parseFloat(initialDeposit));

  return {
    channelId,
    fromAgent,
    toAgent,
    balance: initialDeposit,
    totalSent: '0',
    totalReceived: '0',
    isOpen: true,
  };
}
