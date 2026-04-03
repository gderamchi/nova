import type { AgentIdentity } from './identity';

export interface ENSTextRecord {
  key: string;
  value: string;
}

export function encodeAgentRecords(identity: AgentIdentity): ENSTextRecord[] {
  const records: ENSTextRecord[] = [
    { key: 'description', value: identity.description ?? 'Nova DeFi Agent' },
    { key: 'url', value: identity.url ?? '' },
    { key: 'avatar', value: identity.avatar ?? '' },
    { key: 'com.nova.agent-type', value: identity.agentType ?? 'defi-agent' },
    { key: 'com.nova.skills', value: JSON.stringify(identity.skills ?? []) },
    { key: 'com.nova.address', value: identity.address },
    { key: 'com.nova.version', value: '1.0.0' },
    { key: 'com.nova.created', value: new Date().toISOString() },
  ];

  return records;
}

export function decodeAgentRecords(records: ENSTextRecord[]): Partial<AgentIdentity> {
  const map = new Map(records.map(r => [r.key, r.value]));

  return {
    description: map.get('description') ?? undefined,
    url: map.get('url') ?? undefined,
    avatar: map.get('avatar') ?? undefined,
    agentType: map.get('com.nova.agent-type') ?? undefined,
    skills: map.has('com.nova.skills')
      ? JSON.parse(map.get('com.nova.skills')!)
      : undefined,
  };
}

export function formatAgentCard(identity: AgentIdentity): string {
  return [
    `🤖 ${identity.name}`,
    `📍 ${identity.address.slice(0, 6)}...${identity.address.slice(-4)}`,
    `🔧 Skills: ${identity.skills?.join(', ') ?? 'none'}`,
    `📝 ${identity.description ?? 'No description'}`,
  ].join('\n');
}
