import Anthropic from '@anthropic-ai/sdk';
import { INTENT_PARSER_SYSTEM_PROMPT } from './prompts';
import type { ParsedIntent, IntentParseResult } from './intent-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function parseIntent(userMessage: string): Promise<IntentParseResult> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: INTENT_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const intent: ParsedIntent = {
      action: parsed.action ?? 'unknown',
      tokenIn: parsed.tokenIn ?? '',
      tokenOut: parsed.tokenOut ?? '',
      amount: parsed.amount ?? '0',
      chainFrom: parsed.chainFrom ?? 'base-sepolia',
      chainTo: parsed.chainTo ?? parsed.chainFrom ?? 'base-sepolia',
      recipient: parsed.recipient ?? undefined,
      slippage: parsed.slippage ?? 0.5,
      confidence: parsed.confidence ?? 0,
      raw: userMessage,
    };

    if (intent.action === 'unknown' || intent.confidence < 0.3) {
      return {
        success: false,
        intent,
        message: parsed.message ?? "I couldn't understand that. Try something like 'swap 0.1 ETH to USDC'.",
        suggestions: [
          'Swap 0.1 ETH to USDC',
          'Bridge 100 USDC from Base to Arbitrum',
          'Check my balance',
        ],
      };
    }

    return {
      success: true,
      intent,
      message: parsed.message ?? `Got it: ${intent.action} ${intent.amount} ${intent.tokenIn}`,
    };
  } catch (error) {
    return {
      success: false,
      intent: null,
      message: 'Failed to parse your request. Try again with something like "swap 0.1 ETH to USDC".',
      suggestions: [
        'Swap 0.1 ETH to USDC',
        'Check my balance on Base',
        'Bridge USDC to Arbitrum',
      ],
    };
  }
}
