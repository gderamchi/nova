/**
 * Hedera Consensus Service (HCS) - Audit Trail
 * Logs all agent operations to HCS for immutable audit trail
 */

export interface HCSLogEntry {
  topicId: string;
  sequenceNumber: number;
  message: string;
  timestamp: number;
  consensusTimestamp?: string;
}

export interface HCSMessage {
  type: string;
  from: string;
  to: string;
  amount?: string;
  service?: string;
  status: string;
  paymentId?: string;
  transactionId?: string;
  timestamp: number;
}

// In-memory HCS log for demo
const hcsLog: HCSLogEntry[] = [];
let sequenceCounter = 0;

const DEMO_TOPIC_ID = '0.0.nova-audit';

export async function logToHCS(message: HCSMessage): Promise<HCSLogEntry> {
  const config = {
    accountId: process.env.NEXT_PUBLIC_HEDERA_ACCOUNT_ID ?? 'PLACEHOLDER_REPLACE_ME',
    privateKey: process.env.NEXT_PUBLIC_HEDERA_PRIVATE_KEY ?? 'PLACEHOLDER_REPLACE_ME',
  };

  const messageStr = JSON.stringify(message);

  try {
    if (config.accountId !== 'PLACEHOLDER_REPLACE_ME') {
      const { Client, TopicMessageSubmitTransaction, AccountId, PrivateKey } =
        await import('@hashgraph/sdk');

      const client = Client.forTestnet();
      client.setOperator(
        AccountId.fromString(config.accountId),
        PrivateKey.fromStringED25519(config.privateKey),
      );

      const response = await new TopicMessageSubmitTransaction()
        .setTopicId(DEMO_TOPIC_ID)
        .setMessage(messageStr)
        .execute(client);

      const receipt = await response.getReceipt(client);

      const entry: HCSLogEntry = {
        topicId: DEMO_TOPIC_ID,
        sequenceNumber: Number(receipt.topicSequenceNumber ?? ++sequenceCounter),
        message: messageStr,
        timestamp: Date.now(),
        consensusTimestamp: response.transactionId.toString(),
      };

      hcsLog.push(entry);
      return entry;
    }

    // Simulated HCS entry for demo
    const entry: HCSLogEntry = {
      topicId: DEMO_TOPIC_ID,
      sequenceNumber: ++sequenceCounter,
      message: messageStr,
      timestamp: Date.now(),
      consensusTimestamp: `${Math.floor(Date.now() / 1000)}.000000000`,
    };

    hcsLog.push(entry);
    return entry;
  } catch {
    const entry: HCSLogEntry = {
      topicId: DEMO_TOPIC_ID,
      sequenceNumber: ++sequenceCounter,
      message: messageStr,
      timestamp: Date.now(),
    };

    hcsLog.push(entry);
    return entry;
  }
}

export function getAuditLog(limit: number = 50): HCSLogEntry[] {
  return hcsLog.slice(-limit);
}

export function getAuditLogForAgent(agentId: string): HCSLogEntry[] {
  return hcsLog.filter(entry => {
    try {
      const msg = JSON.parse(entry.message);
      return msg.from === agentId || msg.to === agentId;
    } catch {
      return false;
    }
  });
}
