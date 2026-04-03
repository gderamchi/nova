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
