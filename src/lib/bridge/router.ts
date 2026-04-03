import { getBridgeQuote, executeBridge, type BridgeQuote, type BridgeResult } from './across';
import { getSwapQuote, type QuoteResult as SwapQuote } from '../uniswap/quote';

export type RouteType = 'same-chain-swap' | 'bridge-only' | 'bridge-and-swap';

export interface RoutePlan {
  type: RouteType;
  steps: RouteStep[];
  estimatedOutput: string;
  estimatedTime: string;
  totalFees: string;
}

export interface RouteStep {
  action: 'swap' | 'bridge';
  description: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amount: string;
}

export async function planRoute(
  tokenIn: string,
  tokenOut: string,
  amount: string,
  chainFrom: number,
  chainTo: number,
): Promise<RoutePlan> {
  // Case 1: Same chain swap
  if (chainFrom === chainTo) {
    const quote = await getSwapQuote(tokenIn, tokenOut, amount, chainFrom);
    return {
      type: 'same-chain-swap',
      steps: [
        {
          action: 'swap',
          description: `Swap ${amount} ${tokenIn} → ${tokenOut} on ${getChainName(chainFrom)}`,
          chainId: chainFrom,
          tokenIn,
          tokenOut,
          amount,
        },
      ],
      estimatedOutput: quote.amountOutFormatted,
      estimatedTime: '~15 seconds',
      totalFees: `~${quote.gasEstimate} gas`,
    };
  }

  // Case 2: Bridge same token
  if (tokenIn === tokenOut) {
    return {
      type: 'bridge-only',
      steps: [
        {
          action: 'bridge',
          description: `Bridge ${amount} ${tokenIn} from ${getChainName(chainFrom)} → ${getChainName(chainTo)}`,
          chainId: chainFrom,
          tokenIn,
          tokenOut,
          amount,
        },
      ],
      estimatedOutput: (parseFloat(amount) * 0.999).toFixed(4),
      estimatedTime: '~2 minutes',
      totalFees: '~0.1% relay fee',
    };
  }

  // Case 3: Bridge + swap on destination
  return {
    type: 'bridge-and-swap',
    steps: [
      {
        action: 'bridge',
        description: `Bridge ${amount} ${tokenIn} from ${getChainName(chainFrom)} → ${getChainName(chainTo)}`,
        chainId: chainFrom,
        tokenIn,
        tokenOut: tokenIn,
        amount,
      },
      {
        action: 'swap',
        description: `Swap ${tokenIn} → ${tokenOut} on ${getChainName(chainTo)}`,
        chainId: chainTo,
        tokenIn,
        tokenOut,
        amount,
      },
    ],
    estimatedOutput: 'Calculating...',
    estimatedTime: '~3 minutes',
    totalFees: '~0.1% relay + swap fees',
  };
}

export async function executeRoute(
  plan: RoutePlan,
  sender: `0x${string}`,
  onStepUpdate: (stepIndex: number, status: string) => void,
): Promise<{ success: boolean; txHashes: string[]; error?: string }> {
  const txHashes: string[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    onStepUpdate(i, 'executing');

    try {
      if (step.action === 'bridge') {
        const quote = await getBridgeQuote(
          step.tokenIn,
          step.amount,
          step.chainId,
          plan.steps[i + 1]?.chainId ?? step.chainId,
        );
        const result = await executeBridge(quote, sender);
        if (!result.success) throw new Error(result.error);
        if (result.txHash) txHashes.push(result.txHash);
      }

      onStepUpdate(i, 'complete');
    } catch (error) {
      onStepUpdate(i, 'error');
      return {
        success: false,
        txHashes,
        error: error instanceof Error ? error.message : 'Route execution failed',
      };
    }
  }

  return { success: true, txHashes };
}

function getChainName(chainId: number): string {
  return chainId === 421614 ? 'Arbitrum Sepolia' : 'Base Sepolia';
}
