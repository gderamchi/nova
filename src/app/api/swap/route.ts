import { NextRequest, NextResponse } from 'next/server';
import { getSwapQuote } from '@/lib/uniswap/quote';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenIn, tokenOut, amount, chainId } = body;

    if (!tokenIn || !tokenOut || !amount) {
      return NextResponse.json(
        { success: false, error: 'tokenIn, tokenOut, and amount are required' },
        { status: 400 },
      );
    }

    const quote = await getSwapQuote(
      tokenIn,
      tokenOut,
      amount,
      chainId ?? 84532,
    );

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Swap quote failed',
      },
      { status: 500 },
    );
  }
}
