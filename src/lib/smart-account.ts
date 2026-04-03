import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia } from './chains';

const STORAGE_KEY = 'nova_account_key';

export interface SmartAccountInfo {
  address: `0x${string}`;
  chainId: number;
  isDeployed: boolean;
}

function getOrCreatePrivateKey(): `0x${string}` {
  if (typeof window === 'undefined') return generatePrivateKey();

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored as `0x${string}`;

  const key = generatePrivateKey();
  localStorage.setItem(STORAGE_KEY, key);
  return key;
}

export function getEOAAccount(): Account {
  const privateKey = getOrCreatePrivateKey();
  return privateKeyToAccount(privateKey);
}

export function getPublicClient(chainId: number): PublicClient {
  const chain = chainId === 421614 ? arbitrumSepolia : baseSepolia;
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export function getWalletClient(chainId: number): WalletClient {
  const chain = chainId === 421614 ? arbitrumSepolia : baseSepolia;
  const account = getEOAAccount();
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

export async function getAccountInfo(chainId: number): Promise<SmartAccountInfo> {
  const account = getEOAAccount();
  const client = getPublicClient(chainId);
  const code = await client.getCode({ address: account.address });

  return {
    address: account.address,
    chainId,
    isDeployed: code !== undefined && code !== '0x',
  };
}

export async function getBalance(chainId: number): Promise<bigint> {
  const account = getEOAAccount();
  const client = getPublicClient(chainId);
  return client.getBalance({ address: account.address });
}

export function formatBalance(wei: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = wei / divisor;
  const remainder = wei % divisor;
  const decimal = remainder.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${decimal}`;
}
