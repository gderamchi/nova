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
import { getServerPublicClient, getGasOverrides } from './server-account';
import { getAccountForUser, getWalletClientForUser, getNonceForAccount } from './user-wallets';
import { getExplorerTxUrl, getTokenAddress } from './chains';
import { getSwapQuote } from './uniswap/quote';
import { resolveToken } from './uniswap/tokens';
import { getBridgeQuote } from './bridge/across';
import { logToHCS, getAuditLog } from './hedera/hcs';
import type { HCSMessage } from './hedera/hcs';
import { createNanopayment, getPaymentHistory } from './arc/nanopay';
import { setMemory, getMemoryStore } from './openclaw/memory';

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
  userId?: number,
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
    let result: OrchestratorResult;

    switch (intent.action) {
      case 'swap':
        result = await handleSwap(intent, sender, userId);
        break;
      case 'bridge':
        result = await handleBridge(intent, sender, userId);
        break;
      case 'transfer':
        result = await handleTransfer(intent, sender, userId);
        break;
      case 'balance':
        result = await handleBalance(intent, sender, userId);
        break;
      case 'audit':
        result = await handleAudit(intent, sender);
        break;
      case 'nanopay':
        result = await handleNanopay(intent, sender);
        break;
      case 'memory':
        result = await handleMemory(intent, sender);
        break;
      default:
        return {
          success: false,
          message: `Unsupported action: ${intent.action}`,
          plan: null,
          txHashes: [],
        };
    }

    // Log successful on-chain operations to HCS audit trail and 0G memory
    if (result.success && ['swap', 'bridge', 'transfer', 'balance'].includes(intent.action)) {
      const details = `${intent.amount} ${intent.tokenIn}${intent.tokenOut ? ' -> ' + intent.tokenOut : ''}`;
      logOperationToHCS(intent.action, sender, details, result.txHashes[0]);
      storeOperationMemory(sender, intent.action, `${details} (${result.txHashes[0] ?? 'no-tx'})`);
    }

    return result;
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
  userId?: number,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);
  const walletClient = getWalletClientForUser(userId, chainId);
  const publicClient = getServerPublicClient(chainId);
  const account = getAccountForUser(userId);

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
    const nonce = await getNonceForAccount(chainId, account.address);
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
    let nonce = await getNonceForAccount(chainId, account.address);
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

    nonce = await getNonceForAccount(chainId, account.address);
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
  userId?: number,
): Promise<OrchestratorResult> {
  const fromChainId = getChainId(intent.chainFrom);
  const toChainId = getChainId(intent.chainTo);
  const walletClient = getWalletClientForUser(userId, fromChainId);
  const publicClient = getServerPublicClient(fromChainId);
  const account = getAccountForUser(userId);

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
  const bridgeNonce = await getNonceForAccount(fromChainId, account.address);
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
  userId?: number,
): Promise<OrchestratorResult> {
  const chainId = getChainId(intent.chainFrom);
  const walletClient = getWalletClientForUser(userId, chainId);
  const publicClient = getServerPublicClient(chainId);
  const account = getAccountForUser(userId);

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
  const transferNonce = await getNonceForAccount(chainId, account.address);
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
  userId?: number,
): Promise<OrchestratorResult> {
  const account = getAccountForUser(userId);
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

// --------------- AUDIT LOG (HCS) ---------------

async function handleAudit(
  _intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const log = getAuditLog(20);
  const entries = log.map(entry => {
    try {
      const msg = JSON.parse(entry.message);
      return `[${new Date(entry.timestamp).toLocaleTimeString()}] ${msg.type}: ${msg.amount ?? ''} ${msg.service ?? msg.type} - ${msg.status}`;
    } catch {
      return `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`;
    }
  });

  const message = log.length === 0
    ? 'No operations recorded yet. Your audit trail will appear here after you execute swaps, transfers, or other operations.'
    : `Audit Trail (${log.length} entries, Hedera HCS topic ${log[0].topicId}):\n\n${entries.join('\n')}`;

  return {
    success: true,
    message,
    plan: {
      steps: [{ label: `Retrieved ${log.length} audit entries`, status: 'complete' }],
      estimatedGas: '0',
      estimatedTime: '~1 second',
      route: 'Hedera Consensus Service audit log',
    },
    txHashes: [],
  };
}

// --------------- NANOPAY (Arc/Circle) ---------------

async function handleNanopay(
  intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const recipient = intent.recipient ?? 'unknown-agent';
  const amount = intent.amount && intent.amount !== '0' ? intent.amount : '0.01';

  const result = await createNanopayment({
    fromAgent: sender,
    toAgent: recipient,
    amount,
    memo: `Nanopayment via Nova: ${intent.raw}`,
    chainId: 84532,
  });

  // Log to HCS audit trail
  await logToHCS({
    type: 'nanopay',
    from: sender,
    to: recipient,
    amount,
    service: 'Arc/Circle',
    status: result.success ? 'success' : 'failed',
    paymentId: result.paymentId,
    timestamp: Date.now(),
  });

  // Store in agent memory
  storeOperationMemory(sender, 'nanopay', `Paid ${amount} USDC to ${recipient} (${result.paymentId})`);

  if (!result.success) {
    return {
      success: false,
      message: `Nanopayment failed: ${result.error}`,
      plan: null,
      txHashes: [],
      error: result.error,
    };
  }

  return {
    success: true,
    message: `Nanopayment sent: ${amount} USDC to ${recipient}\nPayment ID: ${result.paymentId}\nFee: ${result.fee} USDC`,
    plan: {
      steps: [
        { label: `Created nanopayment channel`, status: 'complete' },
        { label: `Sent ${amount} USDC to ${recipient}`, status: 'complete' },
      ],
      estimatedGas: '0',
      estimatedTime: '~1 second',
      route: `Nanopayment via Arc/Circle`,
    },
    txHashes: result.txHash ? [result.txHash] : [],
  };
}

// --------------- MEMORY (0G Storage) ---------------

async function handleMemory(
  _intent: ParsedIntent,
  sender: `0x${string}`,
): Promise<OrchestratorResult> {
  const store = getMemoryStore(sender);
  const entries = Array.from(store.entries.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  const message = entries.length === 0
    ? 'No operation history yet. Your history will appear here after you execute swaps, transfers, or payments.'
    : `Operation History (${entries.length} entries, 0G Storage):\n\n${entries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.value}`).join('\n')}`;

  return {
    success: true,
    message,
    plan: {
      steps: [{ label: `Retrieved ${entries.length} memory entries`, status: 'complete' }],
      estimatedGas: '0',
      estimatedTime: '~1 second',
      route: '0G decentralized storage',
    },
    txHashes: [],
  };
}

// --------------- Post-operation logging ---------------

function logOperationToHCS(action: string, sender: string, details: string, txHash?: string): void {
  logToHCS({
    type: action,
    from: sender,
    to: 'protocol',
    amount: details,
    service: action === 'swap' ? 'Uniswap V3' : action === 'bridge' ? 'Across' : 'Nova',
    status: 'success',
    transactionId: txHash,
    timestamp: Date.now(),
  }).catch(() => { /* fire and forget */ });
}

function storeOperationMemory(sender: string, action: string, details: string): void {
  const key = `op-${Date.now()}`;
  setMemory(sender, key, `[${action}] ${details}`);
}

// --------------- Helpers ---------------

function getChainId(chainName: string): number {
  return SUPPORTED_CHAINS[chainName]?.chainId ?? 84532;
}

function getChainName(chainId: number): string {
  return chainId === 421614 ? 'Arbitrum Sepolia' : 'Base Sepolia';
}
