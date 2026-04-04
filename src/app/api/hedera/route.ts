import { NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/hedera/hcs';
import { getNovaTokenInfo } from '@/lib/hedera/hts';

const TOPIC_ID = '0.0.8504799';

export async function GET() {
  try {
    const [tokenInfo, hcsMessages] = await Promise.all([
      getNovaTokenInfo(),
      Promise.resolve(getAuditLog(50)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        topicId: TOPIC_ID,
        tokenId: tokenInfo.tokenId,
        hcsMessages: hcsMessages.map(entry => {
          try {
            return { ...entry, parsed: JSON.parse(entry.message) };
          } catch {
            return entry;
          }
        }),
        tokenInfo: {
          tokenId: tokenInfo.tokenId,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          treasuryAccountId: tokenInfo.treasuryAccountId,
        },
        services: ['HCS (Hedera Consensus Service)', 'HTS (Hedera Token Service)'],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Hedera data',
      },
      { status: 500 },
    );
  }
}
