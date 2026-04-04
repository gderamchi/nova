import { NextRequest, NextResponse } from 'next/server';
import { getMemoryStore, setMemory } from '@/lib/openclaw/memory';

const DEFAULT_AGENT_ID = 'nova-agent';

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agentId') ?? DEFAULT_AGENT_ID;
    const store = getMemoryStore(agentId);
    const entries = Array.from(store.entries.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return NextResponse.json({
      success: true,
      agentId: store.agentId,
      count: entries.length,
      entries,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to retrieve memory' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, key, value, ttl } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: 'key and value are required' },
        { status: 400 },
      );
    }

    setMemory(agentId ?? DEFAULT_AGENT_ID, key, value, ttl);

    return NextResponse.json({ success: true, key, stored: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to store memory' },
      { status: 500 },
    );
  }
}
