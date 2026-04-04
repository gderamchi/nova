import { NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/hedera/hcs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const log = getAuditLog(50);
    return NextResponse.json({
      success: true,
      topicId: log[0]?.topicId ?? '0.0.nova-audit',
      count: log.length,
      entries: log.map(entry => ({
        sequenceNumber: entry.sequenceNumber,
        message: (() => {
          try { return JSON.parse(entry.message); } catch { return entry.message; }
        })(),
        timestamp: entry.timestamp,
        consensusTimestamp: entry.consensusTimestamp,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to retrieve audit log' },
      { status: 500 },
    );
  }
}
