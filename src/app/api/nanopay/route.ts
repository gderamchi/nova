import { NextRequest, NextResponse } from 'next/server';
import { createNanopayment } from '@/lib/arc/nanopay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAgent, toAgent, amount, memo, chainId } = body;

    if (!fromAgent || !toAgent || !amount) {
      return NextResponse.json(
        { success: false, error: 'fromAgent, toAgent, and amount are required' },
        { status: 400 },
      );
    }

    const result = await createNanopayment({
      fromAgent,
      toAgent,
      amount,
      memo: memo ?? '',
      chainId: chainId ?? 84532,
    });

    return NextResponse.json({
      success: result.success,
      payment: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      },
      { status: 500 },
    );
  }
}
