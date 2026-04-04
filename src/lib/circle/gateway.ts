/**
 * Circle Gateway (Nanopayments) — contract-level integration.
 * Deposits USDC into the Gateway unified balance on Base Sepolia.
 *
 * Contracts (same address on all EVM testnets):
 *   Gateway Wallet: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9
 *   Gateway Minter: 0x0022222ABE238Cc2C7Bb1f21003F0a260052475B
 *
 * USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e (6 decimals)
 */

import {
  encodeFunctionData,
  erc20Abi,
  parseUnits,
  formatUnits,
  type WalletClient,
  type PublicClient,
} from 'viem';

// --------------- Addresses ---------------

export const GATEWAY_WALLET: `0x${string}` = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
export const GATEWAY_MINTER: `0x${string}` = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B';
export const USDC_BASE_SEPOLIA: `0x${string}` = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Base Sepolia domain ID for Circle Gateway
export const BASE_SEPOLIA_DOMAIN_ID = 6;
export const ARBITRUM_SEPOLIA_DOMAIN_ID = 3;

// --------------- ABIs ---------------

const GATEWAY_DEPOSIT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'token', type: 'address' },
    ],
    outputs: [],
  },
] as const;

// --------------- Functions ---------------

/**
 * Approve the Gateway Wallet to spend USDC on behalf of the sender.
 * Standard ERC-20 approve.
 */
export async function approveGateway(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: string,
  gasOverrides: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint },
  nonce: number,
  account: ReturnType<typeof import('viem/accounts').privateKeyToAccount>,
): Promise<`0x${string}`> {
  const amountWei = parseUnits(amount, 6);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [GATEWAY_WALLET, amountWei],
  });

  const txHash = await walletClient.sendTransaction({
    ...gasOverrides,
    nonce,
    to: USDC_BASE_SEPOLIA,
    data,
    chain: walletClient.chain,
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/**
 * Deposit USDC into the Circle Gateway unified balance.
 * Caller must have approved GATEWAY_WALLET first.
 */
export async function depositToGateway(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: string,
  gasOverrides: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint },
  nonce: number,
  account: ReturnType<typeof import('viem/accounts').privateKeyToAccount>,
): Promise<`0x${string}`> {
  const amountWei = parseUnits(amount, 6);

  const data = encodeFunctionData({
    abi: GATEWAY_DEPOSIT_ABI,
    functionName: 'deposit',
    args: [amountWei, USDC_BASE_SEPOLIA],
  });

  const txHash = await walletClient.sendTransaction({
    ...gasOverrides,
    nonce,
    to: GATEWAY_WALLET,
    data,
    chain: walletClient.chain,
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/**
 * Read the USDC balance for an address on Base Sepolia (on-chain ERC-20 balanceOf).
 */
export async function getUSDCBalance(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<{ raw: bigint; formatted: string }> {
  const balance = await publicClient.readContract({
    address: USDC_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return {
    raw: balance,
    formatted: formatUnits(balance, 6),
  };
}
