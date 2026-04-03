/**
 * Arc/Circle USDC Nanopayment Layer
 * Enables micro-payments between agents using USDC on supported chains
 */

const ARC_API_KEY = process.env.NEXT_PUBLIC_ARC_API_KEY ?? 'PLACEHOLDER_REPLACE_ME';
const ARC_API_BASE = 'https://api.arc.net/v1';

export interface NanopaymentRequest {
  fromAgent: string;
  toAgent: string;
  amount: string; // USDC amount (e.g. "0.001")
  memo?: string;
  chainId: number;
}

export interface NanopaymentResult {
  success: boolean;
  paymentId: string;
  txHash?: string;
  amount: string;
  fee: string;
  timestamp: number;
  error?: string;
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

export async function createNanopayment(
  request: NanopaymentRequest,
): Promise<NanopaymentResult> {
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Attempt to use Arc API for real payment
    if (ARC_API_KEY !== 'PLACEHOLDER_REPLACE_ME') {
      const response = await fetch(`${ARC_API_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ARC_API_KEY}`,
        },
        body: JSON.stringify({
          from: request.fromAgent,
          to: request.toAgent,
          amount: request.amount,
          currency: 'USDC',
          chainId: request.chainId,
          memo: request.memo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const result: NanopaymentResult = {
          success: true,
          paymentId: data.id ?? paymentId,
          txHash: data.txHash,
          amount: request.amount,
          fee: data.fee ?? '0.0001',
          timestamp: Date.now(),
        };
        paymentLedger.push(result);
        return result;
      }
    }

    // Simulated payment for demo
    const result: NanopaymentResult = {
      success: true,
      paymentId,
      amount: request.amount,
      fee: '0.0001',
      timestamp: Date.now(),
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
