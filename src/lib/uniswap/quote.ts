import { resolveToken, type Token } from './tokens';

const UNISWAP_API_KEY = process.env.NEXT_PUBLIC_UNISWAP_API_KEY ?? 'PLACEHOLDER_REPLACE_ME';
const UNISWAP_API_BASE = 'https://api.uniswap.org/v2';

export interface QuoteResult {
  quoteId: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  amountOutFormatted: string;
  priceImpact: string;
  gasEstimate: string;
  route: string;
  executionPrice: string;
}

export async function getSwapQuote(
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amount: string,
  chainId: number,
): Promise<QuoteResult> {
  const tokenIn = resolveToken(tokenInSymbol, chainId);
  const tokenOut = resolveToken(tokenOutSymbol, chainId);

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pair: ${tokenInSymbol}/${tokenOutSymbol} on chain ${chainId}`);
  }

  // Convert amount to smallest unit
  const amountInWei = BigInt(
    Math.floor(parseFloat(amount) * 10 ** tokenIn.decimals),
  ).toString();

  const response = await fetch(`${UNISWAP_API_BASE}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': UNISWAP_API_KEY,
    },
    body: JSON.stringify({
      tokenInChainId: chainId,
      tokenOutChainId: chainId,
      tokenIn: tokenIn.address === '0x0000000000000000000000000000000000000000'
        ? getWrappedNative(chainId)
        : tokenIn.address,
      tokenOut: tokenOut.address === '0x0000000000000000000000000000000000000000'
        ? getWrappedNative(chainId)
        : tokenOut.address,
      amount: amountInWei,
      type: 'EXACT_INPUT',
      configs: [{ routingType: 'CLASSIC', protocols: ['V3'] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'no body');
    console.log(`[Uniswap API] Quote failed (${response.status}): ${errorBody}`);
    // Fallback with simulated quote for demo
    return createSimulatedQuote(tokenIn, tokenOut, amount, chainId);
  }

  const data = await response.json();
  console.log(`[Uniswap API] Quote success for ${tokenIn.symbol}->${tokenOut.symbol}:`, JSON.stringify(data).slice(0, 500));
  const quote = data.quote;

  const amountOut = BigInt(quote.amount);
  const amountOutFormatted = (Number(amountOut) / 10 ** tokenOut.decimals).toFixed(4);

  return {
    quoteId: quote.quoteId ?? `nova-${Date.now()}`,
    tokenIn,
    tokenOut,
    amountIn: amount,
    amountOut: amountOut.toString(),
    amountOutFormatted,
    priceImpact: quote.priceImpact ?? '0.01',
    gasEstimate: quote.gasUseEstimate ?? '150000',
    route: `${tokenIn.symbol} → ${tokenOut.symbol} (Uniswap V3)`,
    executionPrice: (parseFloat(amountOutFormatted) / parseFloat(amount)).toFixed(6),
  };
}

function getWrappedNative(chainId: number): `0x${string}` {
  return chainId === 421614
    ? '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73'
    : '0x4200000000000000000000000000000000000006';
}

function createSimulatedQuote(
  tokenIn: Token,
  tokenOut: Token,
  amount: string,
  _chainId: number,
): QuoteResult {
  // Simulated prices for demo
  const prices: Record<string, number> = {
    'ETH-USDC': 2500,
    'USDC-ETH': 0.0004,
    'ETH-DAI': 2500,
    'DAI-ETH': 0.0004,
    'USDC-DAI': 1.0,
    'DAI-USDC': 1.0,
    'WETH-USDC': 2500,
    'USDC-WETH': 0.0004,
  };

  const pair = `${tokenIn.symbol}-${tokenOut.symbol}`;
  const price = prices[pair] ?? 1.0;
  const amountOut = (parseFloat(amount) * price).toFixed(tokenOut.decimals > 6 ? 6 : 2);

  return {
    quoteId: `nova-sim-${Date.now()}`,
    tokenIn,
    tokenOut,
    amountIn: amount,
    amountOut: BigInt(Math.floor(parseFloat(amountOut) * 10 ** tokenOut.decimals)).toString(),
    amountOutFormatted: amountOut,
    priceImpact: '0.05',
    gasEstimate: '150000',
    route: `${tokenIn.symbol} → ${tokenOut.symbol} (Uniswap V3 - Simulated)`,
    executionPrice: price.toFixed(6),
  };
}
