import { NextRequest, NextResponse } from 'next/server';
import { formatEther } from 'viem';
import { getUserAccount, ensureUserFunded, getSmartAccountAddressForUser } from '@/lib/user-wallets';
import { getServerAccount, getServerPublicClient } from '@/lib/server-account';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  try {
    const account = userId
      ? getUserAccount(Number(userId))
      : getServerAccount();

    const address = account.address;

    // Auto-fund new users on first wallet check
    if (userId) {
      try {
        await ensureUserFunded(Number(userId), 84532);
      } catch { /* fund silently fails if treasury empty */ }
    }

    const [baseBal, arbBal] = await Promise.all([
      getServerPublicClient(84532)
        .getBalance({ address })
        .catch(() => BigInt(0)),
      getServerPublicClient(421614)
        .getBalance({ address })
        .catch(() => BigInt(0)),
    ]);

    // Compute smart account address (counterfactual — no deployment needed)
    let smartAccountAddress: string | null = null;
    if (userId) {
      try {
        smartAccountAddress = await getSmartAccountAddressForUser(Number(userId), 84532);
      } catch { /* smart account address computation failed, non-critical */ }
    }

    return NextResponse.json({
      address,
      smartAccountAddress,
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
