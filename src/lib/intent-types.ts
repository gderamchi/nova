export type IntentAction = 'swap' | 'bridge' | 'transfer' | 'balance' | 'approve' | 'wrap' | 'audit' | 'nanopay' | 'memory' | 'unknown';

export interface ParsedIntent {
  action: IntentAction;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  chainFrom: string;
  chainTo: string;
  recipient?: string;
  slippage?: number;
  protocol?: string;
  raw: string;
  confidence: number;
}

export interface IntentParseResult {
  success: boolean;
  intent: ParsedIntent | null;
  message: string;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: ParsedIntent;
  txStatus?: TransactionStatus;
}

export type TransactionStatus =
  | 'parsing'
  | 'planning'
  | 'simulating'
  | 'confirming'
  | 'executing'
  | 'bridging'
  | 'success'
  | 'error';

export interface TransactionStep {
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  txHash?: string;
  chainId?: number;
  detail?: string;
}

export interface TransactionPlan {
  steps: TransactionStep[];
  estimatedGas: string;
  estimatedTime: string;
  route: string;
}

export const SUPPORTED_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  ETH: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  LINK: { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  UNI: { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
};

export const SUPPORTED_CHAINS: Record<string, { name: string; chainId: number; shortName: string }> = {
  'base-sepolia': { name: 'Base Sepolia', chainId: 84532, shortName: 'base' },
  'arbitrum-sepolia': { name: 'Arbitrum Sepolia', chainId: 421614, shortName: 'arb' },
};
