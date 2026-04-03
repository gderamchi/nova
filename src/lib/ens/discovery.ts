import { resolveENSName, resolveENSAvatar, type AgentIdentity } from './identity';

export interface AgentRegistryEntry {
  name: string;
  address: `0x${string}`;
  skills: string[];
  reputation: number;
  lastSeen: number;
}

// In-memory agent registry for demo (production would use ENS subgraph)
const agentRegistry: Map<string, AgentRegistryEntry> = new Map();

export function registerAgent(identity: AgentIdentity): void {
  agentRegistry.set(identity.name, {
    name: identity.name,
    address: identity.address,
    skills: identity.skills ?? [],
    reputation: 100,
    lastSeen: Date.now(),
  });
}

export function discoverAgents(skill?: string): AgentRegistryEntry[] {
  const agents = Array.from(agentRegistry.values());

  if (!skill) return agents;

  return agents.filter(agent =>
    agent.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())),
  );
}

export function getAgent(name: string): AgentRegistryEntry | null {
  return agentRegistry.get(name) ?? null;
}

export async function resolveAgentByENS(ensName: string): Promise<AgentIdentity | null> {
  const address = await resolveENSName(ensName);
  if (!address) return null;

  const avatar = await resolveENSAvatar(ensName);

  return {
    name: ensName,
    address,
    avatar: avatar ?? undefined,
    description: `ENS Agent: ${ensName}`,
    skills: [],
  };
}

export function listRegisteredAgents(): AgentRegistryEntry[] {
  return Array.from(agentRegistry.values());
}
