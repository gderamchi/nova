/**
 * Nova Orchestrator - Ties all modules together
 * Intent → Plan → Execute → Report
 */

import type {
  ParsedIntent,
  IntentParseResult,
  TransactionStep,
  TransactionPlan,
} from './intent-types';
import { planRoute, type RoutePlan } from './bridge/router';
import { SUPPORTED_CHAINS } from './intent-types';

export interface ExecutionContext {
  sender: `0x${string}`;
  chainId: number;
  intent: ParsedIntent;
}

export interface OrchestratorResult {
  success: boolean;
  message: string;
  plan: TransactionPlan | null;
  txHashes: string[];
  error?: string;
}

export async function orchestrate(
  intentResult: IntentParseResult,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  if (!intentResult.success || !intentResult.intent) {
    return {
      success: false,
      message: intentResult.message,
      plan: null,
      txHashes: [],
      error: 'Could not parse intent',
    };
  }

  const intent = intentResult.intent;

  switch (intent.action) {
    case 'swap':
      return handleSwap(intent, sender);
    case 'bridge':
      return handleBridge(intent, sender);
    case 'transfer':
      return handleTransfer(intent, sender);
    case 'balance':
      return handleBalance(intent, sender);
    default:
      return {
        success: false,
        message: `Unsupported action: ${intent.action}`,
        plan: null,
        txHashes: [],
      };
  }
}

async function handleSwap(
  intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);

  const plan: TransactionPlan = {
    steps: [
      { label: 'Getting quote from Uniswap', status: 'active' },
      { label: 'Approving token spend', status: 'pending' },
      { label: 'Executing swap', status: 'pending' },
      { label: 'Confirming transaction', status: 'pending' },
    ],
    estimatedGas: '~150,000',
    estimatedTime: '~15 seconds',
    route: `${intent.tokenIn} → ${intent.tokenOut} via Uniswap V3`,
  };

  // Simulate execution for demo
  const simulatedHash = `0x${Date.now().toString(16)}${'0'.repeat(40)}`.slice(0, 66);

  return {
    success: true,
    message: `Swapping ${intent.amount} ${intent.tokenIn} → ${intent.tokenOut} on ${getChainName(chainId)}`,
    plan: {
      ...plan,
      steps: plan.steps.map(s => ({ ...s, status: 'complete' as const })),
    },
    txHashes: [simulatedHash],
  };
}

async function handleBridge(
  intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const fromChainId = getChainId(intent.chainFrom);
  const toChainId = getChainId(intent.chainTo);

  const routePlan = await planRoute(
    intent.tokenIn,
    intent.tokenOut,
    intent.amount,
    fromChainId,
    toChainId,
  );

  const steps: TransactionStep[] = routePlan.steps.map(step => ({
    label: step.description,
    status: 'complete' as const,
    chainId: step.chainId,
  }));

  const plan: TransactionPlan = {
    steps,
    estimatedGas: '~300,000',
    estimatedTime: routePlan.estimatedTime,
    route: routePlan.steps.map(s => s.description).join(' → '),
  };

  const simulatedHash = `0x${Date.now().toString(16)}${'0'.repeat(40)}`.slice(0, 66);

  return {
    success: true,
    message: `Bridging ${intent.amount} ${intent.tokenIn} from ${getChainName(fromChainId)} to ${getChainName(toChainId)}`,
    plan,
    txHashes: [simulatedHash],
  };
}

async function handleTransfer(
  intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);

  const plan: TransactionPlan = {
    steps: [
      { label: `Resolving recipient: ${intent.recipient ?? 'unknown'}`, status: 'complete' },
      { label: `Sending ${intent.amount} ${intent.tokenIn}`, status: 'complete' },
      { label: 'Confirming transaction', status: 'complete' },
    ],
    estimatedGas: '~21,000',
    estimatedTime: '~10 seconds',
    route: `Transfer ${intent.tokenIn} on ${getChainName(chainId)}`,
  };

  const simulatedHash = `0x${Date.now().toString(16)}${'0'.repeat(40)}`.slice(0, 66);

  return {
    success: true,
    message: `Sending ${intent.amount} ${intent.tokenIn} to ${intent.recipient ?? 'recipient'}`,
    plan,
    txHashes: [simulatedHash],
  };
}

async function handleBalance(
  intent: ParsedIntent,
  _sender: `0x${string}`,
): Promise<OrchestratorResult> {
  return {
    success: true,
    message: 'Fetching your balances across chains...',
    plan: {
      steps: [
        { label: 'Querying Base Sepolia', status: 'complete' },
        { label: 'Querying Arbitrum Sepolia', status: 'complete' },
      ],
      estimatedGas: '0',
      estimatedTime: '~3 seconds',
      route: 'Multi-chain balance check',
    },
    txHashes: [],
  };
}

function getChainId(chainName: string): number {
  return SUPPORTED_CHAINS[chainName]?.chainId ?? 84532;
}

function getChainName(chainId: number): string {
  return chainId === 421614 ? 'Arbitrum Sepolia' : 'Base Sepolia';
}
