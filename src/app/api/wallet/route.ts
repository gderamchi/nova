import { NextRequest, NextResponse } from 'next/server';
import { formatEther } from 'viem';
import { getUserAccount } from '@/lib/user-wallets';
import { getServerAccount, getServerPublicClient } from '@/lib/server-account';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  try {
    const account = userId
      ? getUserAccount(Number(userId))
      : getServerAccount();

    const address = account.address;

    const [baseBal, arbBal] = await Promise.all([
      getServerPublicClient(84532)
        .getBalance({ address })
        .catch(() => BigInt(0)),
      getServerPublicClient(421614)
        .getBalance({ address })
        .catch(() => BigInt(0)),
    ]);

    return NextResponse.json({
      address,
      balances: {
        baseSepolia: formatEther(baseBal),
        arbitrumSepolia: formatEther(arbBal),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch wallet' },
      { status: 500 },
    );
  }
}
