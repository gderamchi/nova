import { NextRequest, NextResponse } from 'next/server';
import { getBridgeQuote } from '@/lib/bridge/across';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, amount, fromChainId, toChainId } = body;

    if (!token || !amount || !fromChainId || !toChainId) {
      return NextResponse.json(
        { success: false, error: 'token, amount, fromChainId, toChainId are required' },
        { status: 400 },
      );
    }

    const quote = await getBridgeQuote(token, amount, fromChainId, toChainId);

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge quote failed',
      },
      { status: 500 },
    );
  }
}
