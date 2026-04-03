/**
 * Server-side account helper for real on-chain transactions.
 * Reads NOVA_PRIVATE_KEY from env, or generates one (log it so we can fund it).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia, CHAIN_ID_MAP } from './chains';

let cachedKey: `0x${string}` | null = null;

function getPrivateKey(): `0x${string}` {
  if (cachedKey) return cachedKey;

  const envKey = process.env.NOVA_PRIVATE_KEY;
  if (envKey) {
    cachedKey = (envKey.startsWith('0x') ? envKey : `0x${envKey}`) as `0x${string}`;
    return cachedKey;
  }

  // Generate ephemeral key for demo - log so we can fund it
  const generated = generatePrivateKey();
  const account = privateKeyToAccount(generated);
  console.warn(`[nova] No NOVA_PRIVATE_KEY set. Generated ephemeral key.`);
  console.warn(`[nova] Fund this address: ${account.address}`);
  cachedKey = generated;
  return generated;
}

export function getServerAccount() {
  return privateKeyToAccount(getPrivateKey());
}

export function getServerWalletClient(chainId: number): WalletClient {
  const chain = CHAIN_ID_MAP[chainId] ?? baseSepolia;
  const account = getServerAccount();
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

export function getServerPublicClient(chainId: number): PublicClient {
  const chain = CHAIN_ID_MAP[chainId] ?? baseSepolia;
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export async function getNextNonce(chainId: number): Promise<number> {
  const publicClient = getServerPublicClient(chainId);
  const account = getServerAccount();
  return publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
}

export async function getGasOverrides(chainId: number) {
  const publicClient = getServerPublicClient(chainId);
  const gasPrice = await publicClient.getGasPrice();
  // Use 3x current gas price to avoid underpriced errors
  const maxFee = gasPrice * BigInt(3) > BigInt(1000000000) ? gasPrice * BigInt(3) : BigInt(1000000000);
  return {
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: maxFee / BigInt(2),
  };
}
