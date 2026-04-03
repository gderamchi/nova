import { NextRequest, NextResponse } from 'next/server';
import { parseIntent } from '@/lib/intent-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Message is required' },
        { status: 400 },
      );
    }

    const result = await parseIntent(message);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Internal error parsing intent',
        intent: null,
      },
      { status: 500 },
    );
  }
}
