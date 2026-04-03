import { encodeFunctionData, type Hash } from 'viem';
import { getWalletClient, getPublicClient } from '../smart-account';
import { type QuoteResult } from './quote';

const UNISWAP_ROUTER_V3 = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as const; // Sepolia Universal Router

// Simplified ERC20 approve ABI
const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Simplified swap ABI (Universal Router execute)
const SWAP_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export interface SwapResult {
  success: boolean;
  txHash: Hash | null;
  amountOut: string;
  error?: string;
}

export async function executeSwap(
  quote: QuoteResult,
  chainId: number,
  sender: `0x${string}`,
): Promise<SwapResult> {
  try {
    const walletClient = getWalletClient(chainId);
    const publicClient = getPublicClient(chainId);

    // Step 1: Approve token if not native ETH
    if (quote.tokenIn.address !== '0x0000000000000000000000000000000000000000') {
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [UNISWAP_ROUTER_V3, BigInt(quote.amountOut) * BigInt(2)],
      });

      const approveTx = await walletClient.sendTransaction({
        to: quote.tokenIn.address,
        data: approveData,
        chain: walletClient.chain,
        account: walletClient.account!,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    // Step 2: Execute swap via Universal Router
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 min deadline

    const swapData = encodeFunctionData({
      abi: SWAP_ABI,
      functionName: 'execute',
      args: [
        '0x00' as `0x${string}`, // V3_SWAP_EXACT_IN command
        [
          encodeFunctionData({
            abi: [
              {
                name: 'encode',
                type: 'function',
                inputs: [
                  { name: 'recipient', type: 'address' },
                  { name: 'amountIn', type: 'uint256' },
                  { name: 'amountOutMin', type: 'uint256' },
                  { name: 'path', type: 'bytes' },
                  { name: 'payerIsUser', type: 'bool' },
                ],
                outputs: [],
              },
            ] as const,
            functionName: 'encode',
            args: [
              sender,
              BigInt(Math.floor(parseFloat(quote.amountIn) * 10 ** quote.tokenIn.decimals)),
              BigInt(quote.amountOut) * BigInt(95) / BigInt(100), // 5% slippage
              '0x' as `0x${string}`, // encoded path
              true,
            ],
          }),
        ],
        deadline,
      ],
    });

    const value = quote.tokenIn.symbol === 'ETH'
      ? BigInt(Math.floor(parseFloat(quote.amountIn) * 10 ** 18))
      : BigInt(0);

    const txHash = await walletClient.sendTransaction({
      to: UNISWAP_ROUTER_V3,
      data: swapData,
      value,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      success: true,
      txHash,
      amountOut: quote.amountOutFormatted,
    };
  } catch (error) {
    return {
      success: false,
      txHash: null,
      amountOut: '0',
      error: error instanceof Error ? error.message : 'Swap failed',
    };
  }
}
