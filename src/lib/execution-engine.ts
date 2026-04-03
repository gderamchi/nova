/**
 * Execution Engine - Intent → Plan → Execute Pipeline
 * Central pipeline that processes parsed intents and coordinates execution
 */

import type { ParsedIntent, TransactionPlan, TransactionStep } from './intent-types';
import { orchestrate, type OrchestratorResult } from './orchestrator';
import { createNanopayment } from './arc/nanopay';
import { logToHCS } from './hedera/hcs';

export type ExecutionPhase = 'idle' | 'parsing' | 'planning' | 'executing' | 'complete' | 'error';

export interface ExecutionState {
  phase: ExecutionPhase;
  intent: ParsedIntent | null;
  plan: TransactionPlan | null;
  result: OrchestratorResult | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export function createInitialState(): ExecutionState {
  return {
    phase: 'idle',
    intent: null,
    plan: null,
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
  };
}

export async function executeIntent(
  intent: ParsedIntent,
  sender: `0x${string}`,
  onPhaseChange: (phase: ExecutionPhase, detail?: string) => void,
): Promise<OrchestratorResult> {
  try {
    // Phase 1: Planning
    onPhaseChange('planning', `Planning ${intent.action} operation...`);

    // Phase 2: Execute
    onPhaseChange('executing', `Executing ${intent.action}...`);
    const result = await orchestrate(
      { success: true, intent, message: '' },
      sender,
    );

    if (!result.success) {
      onPhaseChange('error', result.error);
      return result;
    }

    // Phase 3: Post-execution logging
    await Promise.allSettled([
      // Log to Hedera Consensus Service
      logToHCS({
        type: `agent-${intent.action}`,
        from: sender,
        to: intent.recipient ?? 'self',
        amount: intent.amount,
        service: intent.action,
        status: 'success',
        timestamp: Date.now(),
      }),
      // Record nanopayment fee if applicable
      intent.action !== 'balance'
        ? createNanopayment({
            fromAgent: sender,
            toAgent: 'nova-protocol',
            amount: '0.001',
            memo: `Fee: ${intent.action}`,
            chainId: 84532,
          })
        : Promise.resolve(),
    ]);

    onPhaseChange('complete', result.message);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Execution failed';
    onPhaseChange('error', errorMessage);
    return {
      success: false,
      message: errorMessage,
      plan: null,
      txHashes: [],
      error: errorMessage,
    };
  }
}

export function formatExecutionSummary(result: OrchestratorResult): string {
  if (!result.success) {
    return `Failed: ${result.error ?? result.message}`;
  }

  const lines = [result.message];

  if (result.plan) {
    lines.push(`Route: ${result.plan.route}`);
    lines.push(`Est. time: ${result.plan.estimatedTime}`);
  }

  if (result.txHashes.length > 0) {
    lines.push(`Tx: ${result.txHashes[0].slice(0, 10)}...${result.txHashes[0].slice(-6)}`);
  }

  if (result.explorerUrls && result.explorerUrls.length > 0) {
    lines.push(`Explorer: ${result.explorerUrls[result.explorerUrls.length - 1]}`);
  }

  return lines.join('\n');
}
