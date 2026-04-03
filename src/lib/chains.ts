import { type Chain } from 'viem';

export const baseSepolia: Chain = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

export const arbitrumSepolia: Chain = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ?? 'https://sepolia-rollup.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
  testnet: true,
};

export const CHAIN_MAP: Record<string, Chain> = {
  'base-sepolia': baseSepolia,
  'arbitrum-sepolia': arbitrumSepolia,
};

export const CHAIN_ID_MAP: Record<number, Chain> = {
  84532: baseSepolia,
  421614: arbitrumSepolia,
};

export function getChain(chainIdOrName: string | number): Chain {
  if (typeof chainIdOrName === 'number') {
    return CHAIN_ID_MAP[chainIdOrName] ?? baseSepolia;
  }
  return CHAIN_MAP[chainIdOrName] ?? baseSepolia;
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const chain = CHAIN_ID_MAP[chainId];
  const base = chain?.blockExplorers?.default?.url ?? 'https://sepolia.basescan.org';
  return `${base}/tx/${txHash}`;
}

// Token addresses per chain (testnet)
export const TOKEN_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
  84532: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    DAI: '0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9',
  },
  421614: {
    WETH: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    DAI: '0xc5Fa5669E326DA8B2C35540257cD48811f40a36B',
  },
};

export function getTokenAddress(chainId: number, symbol: string): `0x${string}` | null {
  return TOKEN_ADDRESSES[chainId]?.[symbol] ?? null;
}
