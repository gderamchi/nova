import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '@/lib/orchestrator';
import type { IntentParseResult } from '@/lib/intent-types';
import { getServerAccount } from '@/lib/server-account';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intentResult } = body;

    if (!intentResult) {
      return NextResponse.json(
        { success: false, error: 'intentResult is required' },
        { status: 400 },
      );
    }

    const account = getServerAccount();
    const result = await orchestrate(intentResult as IntentParseResult, account.address);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Execution failed',
        plan: null,
        txHashes: [],
      },
      { status: 500 },
    );
  }
}
