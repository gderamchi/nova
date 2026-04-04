/**
 * Hedera Agent Kit Integration
 * Agent payment execution and management via Hedera Token Service
 */

export interface HederaAgentConfig {
  accountId: string;
  privateKey: string;
  network: 'testnet' | 'mainnet';
}

export interface HederaPayment {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  tokenId?: string;
  memo: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  transactionId?: string;
}

// In-memory agent registry for demo
const agentAccounts = new Map<string, HederaAgentConfig>();
const paymentHistory: HederaPayment[] = [];

export function getHederaConfig(): HederaAgentConfig {
  return {
    accountId: process.env.NEXT_PUBLIC_HEDERA_ACCOUNT_ID ?? 'PLACEHOLDER_REPLACE_ME',
    privateKey: process.env.NEXT_PUBLIC_HEDERA_PRIVATE_KEY ?? 'PLACEHOLDER_REPLACE_ME',
    network: 'testnet',
  };
}

export function registerAgentAccount(
  agentId: string,
  config: HederaAgentConfig,
): void {
  agentAccounts.set(agentId, config);
}

export async function createAgentPayment(
  from: string,
  to: string,
  amount: string,
  memo: string,
): Promise<HederaPayment> {
  const config = getHederaConfig();
  const paymentId = `hedera-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    // Dynamic import to avoid SSR issues with Hedera SDK
    if (config.accountId !== 'PLACEHOLDER_REPLACE_ME') {
      const { Client, TransferTransaction, Hbar, AccountId, PrivateKey } =
        await import('@hashgraph/sdk');

      const client =
        config.network === 'testnet'
          ? Client.forTestnet()
          : Client.forMainnet();

      client.setOperator(
        AccountId.fromString(config.accountId),
        PrivateKey.fromStringECDSA(config.privateKey),
      );

      const transaction = new TransferTransaction()
        .addHbarTransfer(config.accountId, new Hbar(-parseFloat(amount)))
        .addHbarTransfer(to, new Hbar(parseFloat(amount)))
        .setTransactionMemo(memo);

      const response = await transaction.execute(client);
      const receipt = await response.getReceipt(client);

      const payment: HederaPayment = {
        paymentId,
        from,
        to,
        amount,
        memo,
        timestamp: Date.now(),
        status: receipt.status.toString() === 'SUCCESS' ? 'success' : 'failed',
        transactionId: response.transactionId.toString(),
      };

      paymentHistory.push(payment);
      return payment;
    }

    // Simulated payment for demo
    const payment: HederaPayment = {
      paymentId,
      from,
      to,
      amount,
      memo,
      timestamp: Date.now(),
      status: 'success',
      transactionId: `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`,
    };

    paymentHistory.push(payment);
    return payment;
  } catch (error) {
    const payment: HederaPayment = {
      paymentId,
      from,
      to,
      amount,
      memo,
      timestamp: Date.now(),
      status: 'failed',
    };

    paymentHistory.push(payment);
    return payment;
  }
}

export function getPaymentHistory(agentId?: string): HederaPayment[] {
  if (!agentId) return paymentHistory.slice(-50);
  return paymentHistory
    .filter(p => p.from === agentId || p.to === agentId)
    .slice(-50);
}
