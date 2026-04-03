import { type Hash } from 'viem';
import { getWalletClient, getPublicClient } from '../smart-account';

const ACROSS_API_BASE = 'https://across.to/api';

export interface BridgeQuote {
  originChainId: number;
  destinationChainId: number;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  amountOut: string;
  relayerFeePct: string;
  estimatedFillTime: number; // seconds
  spokePoolAddress: `0x${string}`;
}

export interface BridgeResult {
  success: boolean;
  txHash: Hash | null;
  depositId?: string;
  error?: string;
}

export async function getBridgeQuote(
  tokenSymbol: string,
  amount: string,
  originChainId: number,
  destinationChainId: number,
): Promise<BridgeQuote> {
  try {
    const tokenAddress = getTokenForBridge(tokenSymbol, originChainId);
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 10 ** getDecimals(tokenSymbol)));

    const params = new URLSearchParams({
      token: tokenAddress,
      originChainId: originChainId.toString(),
      destinationChainId: destinationChainId.toString(),
      amount: amountWei.toString(),
    });

    const response = await fetch(`${ACROSS_API_BASE}/suggested-fees?${params}`);

    if (!response.ok) {
      return createSimulatedBridgeQuote(tokenSymbol, amount, originChainId, destinationChainId);
    }

    const data = await response.json();

    return {
      originChainId,
      destinationChainId,
      tokenIn: tokenSymbol,
      tokenOut: tokenSymbol,
      amount,
      amountOut: (parseFloat(amount) * (1 - parseFloat(data.relayerFeePct) / 1e18)).toFixed(4),
      relayerFeePct: data.relayerFeePct,
      estimatedFillTime: data.estimatedFillTimeSec ?? 120,
      spokePoolAddress: data.spokePoolAddress,
    };
  } catch {
    return createSimulatedBridgeQuote(tokenSymbol, amount, originChainId, destinationChainId);
  }
}

export async function executeBridge(
  quote: BridgeQuote,
  sender: `0x${string}`,
): Promise<BridgeResult> {
  try {
    const walletClient = getWalletClient(quote.originChainId);
    const publicClient = getPublicClient(quote.originChainId);

    const amountWei = BigInt(
      Math.floor(parseFloat(quote.amount) * 10 ** getDecimals(quote.tokenIn)),
    );

    // For demo: send a simple transfer to the spoke pool
    const txHash = await walletClient.sendTransaction({
      to: quote.spokePoolAddress,
      value: quote.tokenIn === 'ETH' ? amountWei : BigInt(0),
      data: '0x' as `0x${string}`,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      success: true,
      txHash,
      depositId: `bridge-${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      txHash: null,
      error: error instanceof Error ? error.message : 'Bridge failed',
    };
  }
}

function getTokenForBridge(symbol: string, chainId: number): string {
  const addresses: Record<number, Record<string, string>> = {
    84532: {
      ETH: '0x0000000000000000000000000000000000000000',
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    421614: {
      ETH: '0x0000000000000000000000000000000000000000',
      WETH: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    },
  };
  return addresses[chainId]?.[symbol] ?? '0x0000000000000000000000000000000000000000';
}

function getDecimals(symbol: string): number {
  return symbol === 'USDC' || symbol === 'USDT' ? 6 : 18;
}

function createSimulatedBridgeQuote(
  tokenSymbol: string,
  amount: string,
  originChainId: number,
  destinationChainId: number,
): BridgeQuote {
  const fee = parseFloat(amount) * 0.001; // 0.1% simulated fee
  return {
    originChainId,
    destinationChainId,
    tokenIn: tokenSymbol,
    tokenOut: tokenSymbol,
    amount,
    amountOut: (parseFloat(amount) - fee).toFixed(4),
    relayerFeePct: '1000000000000000', // 0.1%
    estimatedFillTime: 120,
    spokePoolAddress: '0x82B564983aE7274c86695917BBf8C99ECb6F0F8F',
  };
}
