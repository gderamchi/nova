import { DEFI_SKILLS, getSkill, formatSkillsForLLM, type Skill } from './skills';
import type { AgentIdentity } from '../ens/identity';

export interface OpenClawAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  skills: Skill[];
  identity: AgentIdentity | null;
  memory: AgentMemoryState;
}

export interface AgentMemoryState {
  conversationHistory: ConversationEntry[];
  executionHistory: ExecutionEntry[];
  preferences: Record<string, string>;
}

export interface ConversationEntry {
  timestamp: number;
  role: 'user' | 'agent';
  content: string;
}

export interface ExecutionEntry {
  timestamp: number;
  skill: string;
  params: Record<string, unknown>;
  result: 'success' | 'failure';
  txHash?: string;
}

export function createNovaAgent(identity?: AgentIdentity): OpenClawAgent {
  return {
    id: `nova-${Date.now()}`,
    name: 'Nova',
    version: '1.0.0',
    description: 'Zero-click cross-chain DeFi agent. Parses natural language, plans routes, and executes DeFi operations via account abstraction.',
    skills: DEFI_SKILLS,
    identity: identity ?? null,
    memory: {
      conversationHistory: [],
      executionHistory: [],
      preferences: {
        defaultChain: 'base-sepolia',
        defaultSlippage: '0.5',
        gasPreference: 'standard',
      },
    },
  };
}

export function getAgentManifest(agent: OpenClawAgent): Record<string, unknown> {
  return {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    description: agent.description,
    skills: agent.skills.map(s => ({
      name: s.name,
      description: s.description,
      parameters: s.parameters,
    })),
    identity: agent.identity
      ? {
          ensName: agent.identity.name,
          address: agent.identity.address,
        }
      : null,
    capabilities: {
      chains: [84532, 421614],
      protocols: ['uniswap-v3', 'across', 'ens'],
      features: ['natural-language', 'account-abstraction', 'cross-chain', 'gas-sponsorship'],
    },
    metadata: {
      created: new Date().toISOString(),
      runtime: 'nextjs',
      llm: 'claude-sonnet-4',
    },
  };
}

export function recordConversation(
  agent: OpenClawAgent,
  role: 'user' | 'agent',
  content: string,
): OpenClawAgent {
  return {
    ...agent,
    memory: {
      ...agent.memory,
      conversationHistory: [
        ...agent.memory.conversationHistory,
        { timestamp: Date.now(), role, content },
      ].slice(-50), // keep last 50 entries
    },
  };
}

export function recordExecution(
  agent: OpenClawAgent,
  skill: string,
  params: Record<string, unknown>,
  result: 'success' | 'failure',
  txHash?: string,
): OpenClawAgent {
  return {
    ...agent,
    memory: {
      ...agent.memory,
      executionHistory: [
        ...agent.memory.executionHistory,
        { timestamp: Date.now(), skill, params, result, txHash },
      ].slice(-100),
    },
  };
}
