export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

// Base Sepolia tokens
export const BASE_SEPOLIA_TOKENS: Record<string, Token> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 84532,
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    chainId: 84532,
  },
  USDC: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 84532,
  },
  DAI: {
    address: '0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: 84532,
  },
};

// Arbitrum Sepolia tokens
export const ARB_SEPOLIA_TOKENS: Record<string, Token> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 421614,
  },
  WETH: {
    address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    chainId: 421614,
  },
  USDC: {
    address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 421614,
  },
};

export function getTokensForChain(chainId: number): Record<string, Token> {
  return chainId === 421614 ? ARB_SEPOLIA_TOKENS : BASE_SEPOLIA_TOKENS;
}

export function resolveToken(symbol: string, chainId: number): Token | null {
  const tokens = getTokensForChain(chainId);
  return tokens[symbol.toUpperCase()] ?? null;
}

export function getTokenByAddress(address: string, chainId: number): Token | null {
  const tokens = getTokensForChain(chainId);
  const normalized = address.toLowerCase();
  return Object.values(tokens).find(t => t.address.toLowerCase() === normalized) ?? null;
}
