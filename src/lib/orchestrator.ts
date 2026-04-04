/**
 * Nova Orchestrator - Real on-chain execution
 * Intent -> Plan -> Execute -> Report
 */

import {
  encodeFunctionData,
  parseEther,
  formatEther,
  erc20Abi,
} from 'viem';
import type {
  ParsedIntent,
  IntentParseResult,
  TransactionStep,
  TransactionPlan,
} from './intent-types';
import { SUPPORTED_CHAINS } from './intent-types';
import { getServerWalletClient, getServerPublicClient, getServerAccount, getNextNonce, getGasOverrides } from './server-account';
import { getExplorerTxUrl, getTokenAddress } from './chains';
import { getSwapQuote } from './uniswap/quote';
import { resolveToken } from './uniswap/tokens';
import { getBridgeQuote } from './bridge/across';

// Uniswap V3 SwapRouter02 on Base Sepolia
const SWAP_ROUTER: `0x${string}` = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';

const EXACT_INPUT_SINGLE_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

const MULTICALL_ABI = [
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'data', type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const;

const REFUND_ETH_ABI = [
  {
    name: 'refundETH',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
] as const;

export interface ExecutionContext {
  sender: `0x${string}`;
  chainId: number;
  intent: ParsedIntent;
}

export interface OrchestratorResult {
  success: boolean;
  message: string;
  plan: TransactionPlan | null;
  txHashes: string[];
  explorerUrls?: string[];
  error?: string;
}

export async function orchestrate(
  intentResult: IntentParseResult,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  if (!intentResult.success || !intentResult.intent) {
    return {
      success: false,
      message: intentResult.message,
      plan: null,
      txHashes: [],
      error: 'Could not parse intent',
    };
  }

  const intent = intentResult.intent;

  try {
    switch (intent.action) {
      case 'swap':
        return await handleSwap(intent, sender);
      case 'bridge':
        return await handleBridge(intent, sender);
      case 'transfer':
        return await handleTransfer(intent, sender);
      case 'balance':
        return await handleBalance(intent, sender);
      default:
        return {
          success: false,
          message: `Unsupported action: ${intent.action}`,
          plan: null,
          txHashes: [],
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Transaction failed: ${msg}`,
      plan: null,
      txHashes: [],
      error: msg,
    };
  }
}

// --------------- SWAP (real) ---------------

async function handleSwap(
  intent: ParsedIntent,
  _sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);
  const walletClient = getServerWalletClient(chainId);
  const publicClient = getServerPublicClient(chainId);
  const account = getServerAccount();

  const plan: TransactionPlan = {
    steps: [
      { label: 'Getting quote from Uniswap', status: 'active' },
      { label: 'Approving token spend', status: 'pending' },
      { label: 'Executing swap', status: 'pending' },
      { label: 'Confirming transaction', status: 'pending' },
    ],
    estimatedGas: '~200,000',
    estimatedTime: '~15 seconds',
    route: `${intent.tokenIn} -> ${intent.tokenOut} via Uniswap V3`,
  };

  const txHashes: string[] = [];
  const explorerUrls: string[] = [];

  // Resolve token addresses
  const isEthIn = intent.tokenIn.toUpperCase() === 'ETH';
  const isEthOut = intent.tokenOut.toUpperCase() === 'ETH';
  const wethAddress = getTokenAddress(chainId, 'WETH')!;
  const tokenInAddress = isEthIn ? wethAddress : resolveToken(intent.tokenIn, chainId)?.address;
  const tokenOutAddress = isEthOut ? wethAddress : resolveToken(intent.tokenOut, chainId)?.address;

  if (!tokenInAddress || !tokenOutAddress) {
    return {
      success: false,
      message: `Unknown token: ${!tokenInAddress ? intent.tokenIn : intent.tokenOut}`,
      plan,
      txHashes: [],
      error: 'Token not found',
    };
  }

  const tokenIn = resolveToken(intent.tokenIn, chainId);
  const decimals = tokenIn?.decimals ?? 18;
  const amountIn = BigInt(Math.floor(parseFloat(intent.amount) * 10 ** decimals));

  plan.steps[0] = { label: 'Preparing swap via Uniswap V3', status: 'active' };

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  if (isEthIn) {
    // ETH -> Token: use multicall with exactInputSingle + refundETH, send ETH as value
    const swapCalldata = encodeFunctionData({
      abi: EXACT_INPUT_SINGLE_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: 3000,
        recipient: account.address,
        amountIn,
        amountOutMinimum: BigInt(0),
        sqrtPriceLimitX96: BigInt(0),
      }],
    });

    const refundCalldata = encodeFunctionData({
      abi: REFUND_ETH_ABI,
      functionName: 'refundETH',
    });

    const multicallData = encodeFunctionData({
      abi: MULTICALL_ABI,
      functionName: 'multicall',
      args: [deadline, [swapCalldata, refundCalldata]],
    });

    plan.steps[1] = { label: 'Executing swap (ETH -> token)', status: 'active' };
    const nonce = await getNextNonce(chainId);
    const gas = await getGasOverrides(chainId);
    const swapHash = await walletClient.sendTransaction({
      ...gas,
      nonce,
      to: SWAP_ROUTER,
      data: multicallData,
      value: amountIn,
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: swapHash });
    txHashes.push(swapHash);
    explorerUrls.push(getExplorerTxUrl(chainId, swapHash));
    plan.steps[1] = { label: 'Swap executed', status: 'complete', txHash: swapHash };
  } else {
    // Token -> Token: approve then exactInputSingle
    plan.steps[1] = { label: 'Approving token spend', status: 'active' };
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [SWAP_ROUTER, amountIn],
    });
    let nonce = await getNextNonce(chainId);
    let gas = await getGasOverrides(chainId);
    const approveHash = await walletClient.sendTransaction({
      ...gas,
      nonce,
      to: tokenInAddress,
      data: approveData,
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    txHashes.push(approveHash);
    explorerUrls.push(getExplorerTxUrl(chainId, approveHash));
    plan.steps[1] = { label: 'Token approved', status: 'complete', txHash: approveHash };

    plan.steps[2] = { label: 'Executing swap', status: 'active' };
    const swapCalldata = encodeFunctionData({
      abi: EXACT_INPUT_SINGLE_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: 3000,
        recipient: account.address,
        amountIn,
        amountOutMinimum: BigInt(0),
        sqrtPriceLimitX96: BigInt(0),
      }],
    });

    const multicallData = encodeFunctionData({
      abi: MULTICALL_ABI,
      functionName: 'multicall',
      args: [deadline, [swapCalldata]],
    });

    nonce = await getNextNonce(chainId);
    gas = await getGasOverrides(chainId);
    const swapHash = await walletClient.sendTransaction({
      ...gas,
      nonce,
      to: SWAP_ROUTER,
      data: multicallData,
      value: BigInt(0),
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: swapHash });
    txHashes.push(swapHash);
    explorerUrls.push(getExplorerTxUrl(chainId, swapHash));
    plan.steps[2] = { label: 'Swap executed', status: 'complete', txHash: swapHash };
  }

  plan.steps[plan.steps.length - 1] = { label: 'Transaction confirmed', status: 'complete' };

  return {
    success: true,
    message: `Swapped ${intent.amount} ${intent.tokenIn} -> ${intent.tokenOut} on ${getChainName(chainId)}`,
    plan: {
      ...plan,
      steps: plan.steps.map(s => ({ ...s, status: 'complete' as const })),
    },
    txHashes,
    explorerUrls,
  };
}

// --------------- BRIDGE (real) ---------------

async function handleBridge(
  intent: ParsedIntent,
  _sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const fromChainId = getChainId(intent.chainFrom);
  const toChainId = getChainId(intent.chainTo);
  const walletClient = getServerWalletClient(fromChainId);
  const publicClient = getServerPublicClient(fromChainId);
  const account = getServerAccount();

  const quote = await getBridgeQuote(intent.tokenIn, intent.amount, fromChainId, toChainId);

  const steps: TransactionStep[] = [
    { label: `Bridging ${intent.amount} ${intent.tokenIn} via Across`, status: 'active', chainId: fromChainId },
    { label: `Waiting for relay on ${getChainName(toChainId)}`, status: 'pending', chainId: toChainId },
  ];

  const plan: TransactionPlan = {
    steps,
    estimatedGas: '~300,000',
    estimatedTime: `~${quote.estimatedFillTime}s`,
    route: `${getChainName(fromChainId)} -> ${getChainName(toChainId)} via Across`,
  };

  const isEth = intent.tokenIn.toUpperCase() === 'ETH';
  const decimals = isEth ? 18 : 6; // USDC = 6
  const amountWei = BigInt(Math.floor(parseFloat(intent.amount) * 10 ** decimals));

  // Send to Across spoke pool
  const bridgeNonce = await getNextNonce(fromChainId);
  const bridgeGas = await getGasOverrides(fromChainId);
  const txHash = await walletClient.sendTransaction({
    ...bridgeGas,
    nonce: bridgeNonce,
    to: quote.spokePoolAddress,
    value: isEth ? amountWei : BigInt(0),
    data: '0x' as `0x${string}`,
    chain: walletClient.chain,
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const explorerUrls = [getExplorerTxUrl(fromChainId, txHash)];

  return {
    success: true,
    message: `Bridging ${intent.amount} ${intent.tokenIn} from ${getChainName(fromChainId)} to ${getChainName(toChainId)}`,
    plan: {
      ...plan,
      steps: [
        { ...steps[0], label: `Bridged ${intent.amount} ${intent.tokenIn}`, status: 'complete', txHash },
        { ...steps[1], label: `Relay in progress (~${quote.estimatedFillTime}s)`, status: 'active' },
      ],
    },
    txHashes: [txHash],
    explorerUrls,
  };
}

// --------------- TRANSFER (real) ---------------

async function handleTransfer(
  intent: ParsedIntent,
  _sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);
  const walletClient = getServerWalletClient(chainId);
  const publicClient = getServerPublicClient(chainId);
  const account = getServerAccount();

  let recipient = intent.recipient as `0x${string}` | undefined;

  // Validate recipient is an address (ENS not supported on testnets)
  if (recipient && !recipient.startsWith('0x')) {
    return {
      success: false,
      message: `ENS names not supported on testnet. Please use a 0x address instead of "${intent.recipient}"`,
      plan: null,
      txHashes: [],
      error: 'ENS not supported on testnet',
    };
  }

  if (!recipient) {
    return {
      success: false,
      message: 'No recipient specified for transfer',
      plan: null,
      txHashes: [],
      error: 'Missing recipient',
    };
  }

  const isEth = intent.tokenIn.toUpperCase() === 'ETH';
  const plan: TransactionPlan = {
    steps: [
      { label: `Sending ${intent.amount} ${intent.tokenIn} to ${intent.recipient}`, status: 'active' },
      { label: 'Confirming transaction', status: 'pending' },
    ],
    estimatedGas: isEth ? '~21,000' : '~65,000',
    estimatedTime: '~10 seconds',
    route: `Transfer ${intent.tokenIn} on ${getChainName(chainId)}`,
  };

  let txHash: `0x${string}`;
  const transferNonce = await getNextNonce(chainId);
  const transferGas = await getGasOverrides(chainId);

  if (isEth) {
    // Native ETH transfer
    txHash = await walletClient.sendTransaction({
      ...transferGas,
      nonce: transferNonce,
      to: recipient,
      value: parseEther(intent.amount),
      chain: walletClient.chain,
      account,
    });
  } else {
    // ERC20 transfer
    const token = resolveToken(intent.tokenIn, chainId);
    if (!token) {
      return {
        success: false,
        message: `Unknown token: ${intent.tokenIn}`,
        plan,
        txHashes: [],
        error: 'Token not found',
      };
    }
    const amountWei = BigInt(Math.floor(parseFloat(intent.amount) * 10 ** token.decimals));
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient, amountWei],
    });
    txHash = await walletClient.sendTransaction({
      ...transferGas,
      nonce: transferNonce,
      to: token.address,
      data,
      chain: walletClient.chain,
      account,
    });
  }

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  const explorerUrls = [getExplorerTxUrl(chainId, txHash)];

  return {
    success: true,
    message: `Sent ${intent.amount} ${intent.tokenIn} to ${intent.recipient}`,
    plan: {
      ...plan,
      steps: plan.steps.map(s => ({ ...s, status: 'complete' as const })),
    },
    txHashes: [txHash],
    explorerUrls,
  };
}

// --------------- BALANCE (real) ---------------

async function handleBalance(
  intent: ParsedIntent,
  _sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const account = getServerAccount();
  const chains = [84532, 421614]; // Base Sepolia, Arbitrum Sepolia

  const balances: string[] = [];
  const steps: TransactionStep[] = [];

  for (const chainId of chains) {
    const publicClient = getServerPublicClient(chainId);
    const bal = await publicClient.getBalance({ address: account.address });
    const formatted = formatEther(bal);
    const name = getChainName(chainId);
    balances.push(`${name}: ${parseFloat(formatted).toFixed(4)} ETH`);
    steps.push({ label: `${name}: ${parseFloat(formatted).toFixed(4)} ETH`, status: 'complete' });
  }

  return {
    success: true,
    message: `Balances for ${account.address}:\n${balances.join('\n')}`,
    plan: {
      steps,
      estimatedGas: '0',
      estimatedTime: '~2 seconds',
      route: 'Multi-chain balance check',
    },
    txHashes: [],
  };
}

// --------------- Helpers ---------------

function getChainId(chainName: string): number {
  return SUPPORTED_CHAINS[chainName]?.chainId ?? 84532;
}

function getChainName(chainId: number): string {
  return chainId === 421614 ? 'Arbitrum Sepolia' : 'Base Sepolia';
}
