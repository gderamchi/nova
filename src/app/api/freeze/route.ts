import { NextRequest, NextResponse } from 'next/server';
import {
  freezeWallet,
  unfreezeWallet,
  isWalletFrozen,
  getSpendingInfo,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const { action, address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: 'address is required' },
        { status: 400 },
      );
    }

    if (action === 'freeze') {
      freezeWallet(address);
      return NextResponse.json({ success: true, frozen: true });
    }

    if (action === 'unfreeze') {
      unfreezeWallet(address);
      return NextResponse.json({ success: true, frozen: false });
    }

    return NextResponse.json(
      { success: false, error: 'action must be "freeze" or "unfreeze"' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { success: false, error: 'address query param required' },
      { status: 400 },
    );
  }

  const info = getSpendingInfo(address);

  return NextResponse.json({
    success: true,
    frozen: isWalletFrozen(address),
    dailySpentETH: info.dailySpentETH,
    dailySpentUSDC: info.dailySpentUSDC,
    limitETH: info.limitETH,
    limitUSDC: info.limitUSDC,
  });
}
