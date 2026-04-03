import { getSwapQuote, type QuoteResult } from './quote';
import { executeSwap, type SwapResult } from './swap';
import { resolveToken } from './tokens';

export interface UniswapClient {
  quote: (tokenIn: string, tokenOut: string, amount: string, chainId: number) => Promise<QuoteResult>;
  swap: (quote: QuoteResult, chainId: number, sender: `0x${string}`) => Promise<SwapResult>;
  isTokenSupported: (symbol: string, chainId: number) => boolean;
}

export function createUniswapClient(): UniswapClient {
  return {
    async quote(tokenIn, tokenOut, amount, chainId) {
      return getSwapQuote(tokenIn, tokenOut, amount, chainId);
    },

    async swap(quote, chainId, sender) {
      return executeSwap(quote, chainId, sender);
    },

    isTokenSupported(symbol, chainId) {
      return resolveToken(symbol, chainId) !== null;
    },
  };
}

export { type QuoteResult } from './quote';
export { type SwapResult } from './swap';
