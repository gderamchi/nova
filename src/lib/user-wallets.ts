/**
 * Per-user wallet derivation from a master key.
 * Each Telegram user gets a deterministic wallet derived via keccak256.
 * Treasury (NOVA_PRIVATE_KEY) auto-funds new users with ETH for gas.
 */

import {
  keccak256,
  toHex,
  parseEther,
  createWalletClient,
  http,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  getServerAccount,
  getServerWalletClient,
  getServerPublicClient,
  getGasOverrides,
} from './server-account';
import { CHAIN_ID_MAP, baseSepolia } from './chains';
import {
  getSmartAccountClient as createAAClient,
  getSmartAccountAddress as computeAAAddress,
} from './smart-account-aa';

function derivePrivateKey(userId: number): `0x${string}` {
  const masterKey = process.env.NOVA_PRIVATE_KEY ?? '';
  return keccak256(toHex(`${masterKey}nova-user-${userId}`));
}

export function getUserAccount(userId: number) {
  return privateKeyToAccount(derivePrivateKey(userId));
}

export function getUserWalletClient(userId: number, chainId: number): WalletClient {
  const chain = CHAIN_ID_MAP[chainId] ?? baseSepolia;
  const account = getUserAccount(userId);
  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

export function getUserPublicClient(chainId: number) {
  return getServerPublicClient(chainId);
}

export function getTreasuryAccount() {
  return getServerAccount();
}

/** Returns user account if userId provided, otherwise server (demo) account */
export function getAccountForUser(userId: number | undefined) {
  return userId !== undefined ? getUserAccount(userId) : getServerAccount();
}

/** Returns user wallet client if userId provided, otherwise server wallet client */
export function getWalletClientForUser(userId: number | undefined, chainId: number) {
  return userId !== undefined ? getUserWalletClient(userId, chainId) : getServerWalletClient(chainId);
}

/** Get pending nonce for any account address */
export async function getNonceForAccount(chainId: number, address: `0x${string}`): Promise<number> {
  const publicClient = getServerPublicClient(chainId);
  return publicClient.getTransactionCount({ address, blockTag: 'pending' });
}

const MIN_BALANCE = parseEther('0.0005');
const FUND_AMOUNT = parseEther('0.001');
const SA_FUND_AMOUNT = parseEther('0.003'); // More ETH for Smart Account (needs value for swaps)

/** Fund user wallet from treasury if balance is below threshold */
export async function ensureUserFunded(userId: number, chainId: number): Promise<void> {
  const userAccount = getUserAccount(userId);
  const publicClient = getServerPublicClient(chainId);

  const balance = await publicClient.getBalance({ address: userAccount.address });

  if (balance >= MIN_BALANCE) return;

  const treasury = getTreasuryAccount();
  const treasuryWallet = getServerWalletClient(chainId);
  // Use lower gas for simple ETH funding transfer
  const gas = { maxFeePerGas: BigInt(1000000000), maxPriorityFeePerGas: BigInt(1000000000) }; // 1 gwei
  const nonce = await getNonceForAccount(chainId, treasury.address);

  const txHash = await treasuryWallet.sendTransaction({
    ...gas,
    nonce,
    to: userAccount.address,
    value: FUND_AMOUNT,
    chain: treasuryWallet.chain,
    account: treasury,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[nova] Funded user ${userId} wallet ${userAccount.address} with 0.001 ETH`);

  // Also fund the smart account address for gasless Pimlico txs
  try {
    const saAddr = await computeAAAddress(derivePrivateKey(userId), chainId);
    const saBal = await publicClient.getBalance({ address: saAddr });
    if (saBal < MIN_BALANCE) {
      const nonce2 = await getNonceForAccount(chainId, treasury.address);
      const txHash2 = await treasuryWallet.sendTransaction({
        ...gas, nonce: nonce2,
        to: saAddr, value: SA_FUND_AMOUNT,
        chain: treasuryWallet.chain, account: treasury,
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash2 });
      console.log(`[nova] Funded user ${userId} smart account ${saAddr} with 0.003 ETH`);
    }

    // Also send USDC to EOA for nanopayments
    const { erc20Abi, encodeFunctionData } = require('viem');
    const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const userUsdcBal = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [userAccount.address] });
    if ((userUsdcBal as bigint) < BigInt(50000)) { // < 0.05 USDC
      const treasuryUsdcBal = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [treasury.address] });
      if ((treasuryUsdcBal as bigint) > BigInt(100000)) { // treasury has > 0.1 USDC
        const nonce3 = await getNonceForAccount(chainId, treasury.address);
        const transferData = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [userAccount.address, BigInt(50000)] }); // 0.05 USDC
        const txHash3 = await treasuryWallet.sendTransaction({
          ...gas, nonce: nonce3,
          to: USDC, data: transferData,
          chain: treasuryWallet.chain, account: treasury,
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash3 });
        console.log(`[nova] Sent 0.05 USDC to user ${userId} for nanopayments`);
      }
    }
  } catch (e) { console.error('[nova] Smart account/USDC funding error:', e instanceof Error ? e.message.slice(0,100) : e); }
}

/** Get a Pimlico-sponsored smart account client for a user (gasless txs) */
export async function getSmartAccountClientForUser(userId: number, chainId: number) {
  const pk = derivePrivateKey(userId);
  return createAAClient(pk, chainId);
}

/** Get the counterfactual smart account address for a user */
export async function getSmartAccountAddressForUser(userId: number, chainId: number): Promise<`0x${string}`> {
  const pk = derivePrivateKey(userId);
  return computeAAAddress(pk, chainId);
}
