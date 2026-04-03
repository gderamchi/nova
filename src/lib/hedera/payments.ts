/**
 * Hedera agent-to-agent payment orchestration
 */

import { createAgentPayment, type HederaPayment } from './agent-kit';
import { logToHCS, type HCSLogEntry } from './hcs';

export interface PaymentRequest {
  fromAgent: string;
  toAgent: string;
  amount: string;
  service: string;
  description: string;
}

export interface PaymentReceipt {
  payment: HederaPayment;
  auditLog: HCSLogEntry;
  totalCost: string;
}

export async function executeAgentPayment(
  request: PaymentRequest,
): Promise<PaymentReceipt> {
  // Execute the payment
  const payment = await createAgentPayment(
    request.fromAgent,
    request.toAgent,
    request.amount,
    `Nova Agent Payment: ${request.service} - ${request.description}`,
  );

  // Log to Hedera Consensus Service for audit trail
  const auditLog = await logToHCS({
    type: 'agent-payment',
    from: request.fromAgent,
    to: request.toAgent,
    amount: request.amount,
    service: request.service,
    status: payment.status,
    paymentId: payment.paymentId,
    transactionId: payment.transactionId,
    timestamp: Date.now(),
  });

  return {
    payment,
    auditLog,
    totalCost: request.amount,
  };
}

export async function batchPayments(
  requests: PaymentRequest[],
): Promise<PaymentReceipt[]> {
  const results: PaymentReceipt[] = [];

  for (const request of requests) {
    const receipt = await executeAgentPayment(request);
    results.push(receipt);
  }

  return results;
}
