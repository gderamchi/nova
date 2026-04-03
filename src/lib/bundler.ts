import { createPublicClient, http, type Hash } from 'viem';
import { baseSepolia, arbitrumSepolia } from './chains';

const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? 'PLACEHOLDER_REPLACE_ME';

function getPimlicoRpcUrl(chainId: number): string {
  const chainName = chainId === 421614 ? 'arbitrum-sepolia' : 'base-sepolia';
  return `https://api.pimlico.io/v2/${chainName}/rpc?apikey=${PIMLICO_API_KEY}`;
}

export function getBundlerClient(chainId: number) {
  const chain = chainId === 421614 ? arbitrumSepolia : baseSepolia;
  return createPublicClient({
    chain,
    transport: http(getPimlicoRpcUrl(chainId)),
  });
}

export interface UserOperation {
  sender: `0x${string}`;
  nonce: bigint;
  callData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  signature: `0x${string}`;
}

export async function sendUserOperation(
  chainId: number,
  userOp: UserOperation,
): Promise<Hash> {
  const client = getBundlerClient(chainId);

  // In production, this calls eth_sendUserOperation via Pimlico bundler
  // For hackathon demo, we use standard transactions as fallback
  const result = await client.request({
    method: 'eth_sendUserOperation' as never,
    params: [userOp, getEntryPoint()] as never,
  });

  return result as Hash;
}

export function getEntryPoint(): `0x${string}` {
  // EntryPoint v0.7
  return '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
}

export async function getUserOperationReceipt(chainId: number, hash: Hash) {
  const client = getBundlerClient(chainId);
  return client.request({
    method: 'eth_getUserOperationReceipt' as never,
    params: [hash] as never,
  });
}
