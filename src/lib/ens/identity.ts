import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// ENS public client on mainnet (ENS lives on L1)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

export interface AgentIdentity {
  name: string; // e.g. nova.eth or nova-agent.eth
  address: `0x${string}`;
  avatar?: string;
  description?: string;
  url?: string;
  agentType?: string;
  skills?: string[];
}

export async function resolveENSName(name: string): Promise<`0x${string}` | null> {
  try {
    const address = await ensClient.getEnsAddress({ name });
    return address;
  } catch {
    return null;
  }
}

export async function resolveENSAvatar(name: string): Promise<string | null> {
  try {
    const avatar = await ensClient.getEnsAvatar({ name });
    return avatar;
  } catch {
    return null;
  }
}

export async function lookupAddress(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({ address });
    return name;
  } catch {
    return null;
  }
}

export function createAgentIdentity(
  name: string,
  address: `0x${string}`,
  metadata?: Partial<AgentIdentity>,
): AgentIdentity {
  return {
    name,
    address,
    avatar: metadata?.avatar ?? `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
    description: metadata?.description ?? 'Nova DeFi Agent - Zero-click cross-chain operations',
    url: metadata?.url ?? 'https://nova-agent.vercel.app',
    agentType: metadata?.agentType ?? 'defi-agent',
    skills: metadata?.skills ?? ['swap', 'bridge', 'transfer', 'balance'],
  };
}

export function getAgentENSRecords(identity: AgentIdentity): Record<string, string> {
  return {
    'com.nova.agent-type': identity.agentType ?? 'defi-agent',
    'com.nova.skills': JSON.stringify(identity.skills ?? []),
    'com.nova.version': '1.0.0',
    description: identity.description ?? '',
    url: identity.url ?? '',
    avatar: identity.avatar ?? '',
  };
}

export function isENSName(input: string): boolean {
  return input.endsWith('.eth') || input.endsWith('.xyz') || input.includes('.');
}

export async function resolveRecipient(input: string): Promise<`0x${string}` | null> {
  if (input.startsWith('0x') && input.length === 42) {
    return input as `0x${string}`;
  }

  if (isENSName(input)) {
    return resolveENSName(input);
  }

  return null;
}
