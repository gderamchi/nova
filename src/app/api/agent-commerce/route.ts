import { NextResponse } from 'next/server';
import { simulateAgentCommerce, getCommerceHistory } from '@/lib/arc/agent-commerce';

export async function POST() {
  try {
    const result = await simulateAgentCommerce();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Commerce simulation failed',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const history = getCommerceHistory();

    return NextResponse.json({
      success: true,
      data: {
        totalFlows: history.length,
        history,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch commerce history',
      },
      { status: 500 },
    );
  }
}
