import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '@/lib/orchestrator';
import type { IntentParseResult } from '@/lib/intent-types';
import { getServerAccount } from '@/lib/server-account';
import { getAccountForUser, ensureUserFunded } from '@/lib/user-wallets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intentResult, userId } = body;

    if (!intentResult) {
      return NextResponse.json(
        { success: false, error: 'intentResult is required' },
        { status: 400 },
      );
    }

    let sender: `0x${string}`;

    if (userId !== undefined) {
      // Per-user wallet: fund if needed, then use their derived address
      const chainId = (intentResult as IntentParseResult).intent?.chainFrom
        ? 84532 // default to Base Sepolia for funding
        : 84532;
      await ensureUserFunded(userId, chainId);
      sender = getAccountForUser(userId).address;
    } else {
      sender = getServerAccount().address;
    }

    const result = await orchestrate(intentResult as IntentParseResult, sender, userId);

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
