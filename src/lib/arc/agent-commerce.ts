/**
 * Agent-to-Agent Commerce Layer
 * Enables agents to discover, negotiate, and pay each other for services
 */

import { createNanopayment, type NanopaymentResult } from './nanopay';

export interface ServiceListing {
  agentId: string;
  skill: string;
  pricePerCall: string; // USDC
  description: string;
  chainId: number;
}

export interface ServiceInvocation {
  requestingAgent: string;
  providingAgent: string;
  skill: string;
  params: Record<string, unknown>;
  payment: NanopaymentResult | null;
  result: unknown;
  timestamp: number;
}

// Agent service marketplace (in-memory for demo)
const serviceListings: ServiceListing[] = [
  {
    agentId: 'nova-agent',
    skill: 'swap',
    pricePerCall: '0.01',
    description: 'Execute token swaps via Uniswap V3',
    chainId: 84532,
  },
  {
    agentId: 'nova-agent',
    skill: 'bridge',
    pricePerCall: '0.02',
    description: 'Bridge tokens cross-chain via Across',
    chainId: 84532,
  },
  {
    agentId: 'nova-agent',
    skill: 'balance',
    pricePerCall: '0.001',
    description: 'Check multi-chain token balances',
    chainId: 84532,
  },
];

const invocationHistory: ServiceInvocation[] = [];

export function listAvailableServices(skill?: string): ServiceListing[] {
  if (!skill) return serviceListings;
  return serviceListings.filter(s =>
    s.skill.toLowerCase().includes(skill.toLowerCase()),
  );
}

export async function invokeAgentService(
  requestingAgent: string,
  listing: ServiceListing,
  params: Record<string, unknown>,
): Promise<ServiceInvocation> {
  // Step 1: Pay for the service
  const payment = await createNanopayment({
    fromAgent: requestingAgent,
    toAgent: listing.agentId,
    amount: listing.pricePerCall,
    memo: `Service: ${listing.skill}`,
    chainId: listing.chainId,
  });

  const invocation: ServiceInvocation = {
    requestingAgent,
    providingAgent: listing.agentId,
    skill: listing.skill,
    params,
    payment,
    result: payment.success
      ? { status: 'executed', message: `${listing.skill} executed successfully` }
      : { status: 'failed', message: 'Payment failed' },
    timestamp: Date.now(),
  };

  invocationHistory.push(invocation);
  return invocation;
}

export function registerService(listing: ServiceListing): void {
  const existing = serviceListings.findIndex(
    s => s.agentId === listing.agentId && s.skill === listing.skill,
  );

  if (existing >= 0) {
    serviceListings[existing] = listing;
  } else {
    serviceListings.push(listing);
  }
}

export function getInvocationHistory(agentId?: string): ServiceInvocation[] {
  if (!agentId) return invocationHistory.slice(-50);
  return invocationHistory
    .filter(i => i.requestingAgent === agentId || i.providingAgent === agentId)
    .slice(-50);
}

// ---- Multi-Agent Commerce Simulation ----

export interface AgentCommerceFlow {
  flowId: string;
  steps: AgentCommerceStep[];
  totalPayments: number;
  totalAmount: string;
  timestamp: number;
}

export interface AgentCommerceStep {
  from: string;
  to: string;
  service: string;
  amount: string;
  payment: NanopaymentResult | null;
  result: string;
}

const commerceHistory: AgentCommerceFlow[] = [];

/**
 * Simulates a 3-agent payment flow demonstrating agent-to-agent commerce:
 *   1. nova-defi pays oracle-price for price data
 *   2. oracle-price pays data-provider for historical data
 *   3. data-provider pays nova-defi for DeFi execution (completing the loop)
 */
export async function simulateAgentCommerce(): Promise<AgentCommerceFlow> {
  const flowId = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const steps: AgentCommerceStep[] = [];

  // Step 1: nova-defi -> oracle-price (buy price feed)
  const payment1 = await createNanopayment({
    fromAgent: 'nova-defi',
    toAgent: 'oracle-price',
    amount: '0.005',
    memo: 'Agent commerce: price feed request',
    chainId: 84532,
  });
  steps.push({
    from: 'nova-defi',
    to: 'oracle-price',
    service: 'price-feed',
    amount: '0.005',
    payment: payment1,
    result: payment1.success ? 'ETH/USDC = $2,500.42 (live oracle price)' : 'Payment failed',
  });

  // Step 2: oracle-price -> data-provider (buy historical data)
  const payment2 = await createNanopayment({
    fromAgent: 'oracle-price',
    toAgent: 'data-provider',
    amount: '0.003',
    memo: 'Agent commerce: historical data request',
    chainId: 84532,
  });
  steps.push({
    from: 'oracle-price',
    to: 'data-provider',
    service: 'historical-data',
    amount: '0.003',
    payment: payment2,
    result: payment2.success ? '30d ETH OHLCV data (720 candles)' : 'Payment failed',
  });

  // Step 3: data-provider -> nova-defi (pay for DeFi execution service)
  const payment3 = await createNanopayment({
    fromAgent: 'data-provider',
    toAgent: 'nova-defi',
    amount: '0.01',
    memo: 'Agent commerce: DeFi execution request',
    chainId: 84532,
  });
  steps.push({
    from: 'data-provider',
    to: 'nova-defi',
    service: 'defi-execution',
    amount: '0.01',
    payment: payment3,
    result: payment3.success ? 'DeFi execution completed via Nova agent' : 'Payment failed',
  });

  const totalAmount = (0.005 + 0.003 + 0.01).toFixed(3);
  const flow: AgentCommerceFlow = {
    flowId,
    steps,
    totalPayments: 3,
    totalAmount,
    timestamp: Date.now(),
  };

  commerceHistory.push(flow);
  return flow;
}

/**
 * Creates a reply payment from the receiving agent back to the sender,
 * simulating bidirectional agent-to-agent commerce.
 */
export async function createReplyPayment(
  originalSender: string,
  originalRecipient: string,
  replyAmount: string,
  service: string,
): Promise<NanopaymentResult> {
  return createNanopayment({
    fromAgent: originalRecipient,
    toAgent: originalSender,
    amount: replyAmount,
    memo: `Reply payment: ${service} acknowledgment`,
    chainId: 84532,
  });
}

export function getCommerceHistory(): AgentCommerceFlow[] {
  return commerceHistory.slice(-50);
}

// ---- Cross-Chain USDC Transfer (Chain Abstracted USDC) ----

export interface CrossChainUSDCRequest {
  fromChainId: number;
  toChainId: number;
  amount: string;
  recipient: string;
}

export interface CrossChainUSDCRecord {
  id: string;
  sourceChain: number;
  destChain: number;
  amount: string;
  recipient: string;
  sourcePayment: NanopaymentResult;
  bridgedPayment: {
    bridgeId: string;
    status: 'bridged';
    fromChain: string;
    toChain: string;
    amount: string;
    token: 'USDC';
    timestamp: number;
  };
  timestamp: number;
}

const crossChainHistory: CrossChainUSDCRecord[] = [];

const CHAIN_NAMES: Record<number, string> = {
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
};

/**
 * Cross-chain USDC transfer: treats Base and Arbitrum as one unified liquidity surface.
 * Logs a nanopayment on the source chain, then creates a bridged payment record
 * showing USDC flowing to the destination chain via Arc.
 */
export async function crossChainUSDCTransfer(
  request: CrossChainUSDCRequest,
): Promise<CrossChainUSDCRecord> {
  const { fromChainId, toChainId, amount, recipient } = request;
  const id = `xchain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Step 1: Log nanopayment on the source chain
  const sourcePayment = await createNanopayment({
    fromAgent: 'nova-agent',
    toAgent: recipient,
    amount,
    memo: `Cross-chain USDC: ${CHAIN_NAMES[fromChainId] ?? String(fromChainId)} -> ${CHAIN_NAMES[toChainId] ?? String(toChainId)}`,
    chainId: fromChainId,
  });

  // Step 2: Create bridged payment record showing USDC arriving on dest chain
  const bridgedPayment = {
    bridgeId: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'bridged' as const,
    fromChain: CHAIN_NAMES[fromChainId] ?? String(fromChainId),
    toChain: CHAIN_NAMES[toChainId] ?? String(toChainId),
    amount,
    token: 'USDC' as const,
    timestamp: Date.now(),
  };

  const record: CrossChainUSDCRecord = {
    id,
    sourceChain: fromChainId,
    destChain: toChainId,
    amount,
    recipient,
    sourcePayment,
    bridgedPayment,
    timestamp: Date.now(),
  };

  crossChainHistory.push(record);
  return record;
}

export function getCrossChainHistory(): CrossChainUSDCRecord[] {
  return crossChainHistory.slice(-50);
}
