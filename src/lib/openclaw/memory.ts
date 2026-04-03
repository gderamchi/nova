/**
 * Agent memory/state via 0G Storage
 * Uses 0G decentralized storage for persistent agent memory
 */

const ZG_API_KEY = process.env.NEXT_PUBLIC_0G_API_KEY ?? 'PLACEHOLDER_REPLACE_ME';
const ZG_STORAGE_ENDPOINT = 'https://indexer-storage-testnet-turbo.0g.ai';

export interface MemoryEntry {
  key: string;
  value: string;
  timestamp: number;
  ttl?: number; // seconds
}

export interface AgentMemoryStore {
  agentId: string;
  entries: Map<string, MemoryEntry>;
}

// In-memory cache with 0G persistence
const memoryCache = new Map<string, AgentMemoryStore>();

export function createMemoryStore(agentId: string): AgentMemoryStore {
  const store: AgentMemoryStore = {
    agentId,
    entries: new Map(),
  };
  memoryCache.set(agentId, store);
  return store;
}

export function getMemoryStore(agentId: string): AgentMemoryStore {
  return memoryCache.get(agentId) ?? createMemoryStore(agentId);
}

export function setMemory(agentId: string, key: string, value: string, ttl?: number): void {
  const store = getMemoryStore(agentId);
  store.entries.set(key, {
    key,
    value,
    timestamp: Date.now(),
    ttl,
  });

  // Async persist to 0G Storage (fire and forget)
  persistTo0G(agentId, key, value).catch(() => {
    // Silently fail - local memory is primary
  });
}

export function getMemory(agentId: string, key: string): string | null {
  const store = getMemoryStore(agentId);
  const entry = store.entries.get(key);

  if (!entry) return null;

  // Check TTL
  if (entry.ttl) {
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > entry.ttl) {
      store.entries.delete(key);
      return null;
    }
  }

  return entry.value;
}

export function listMemoryKeys(agentId: string): string[] {
  const store = getMemoryStore(agentId);
  return Array.from(store.entries.keys());
}

export function clearMemory(agentId: string): void {
  const store = getMemoryStore(agentId);
  store.entries.clear();
}

async function persistTo0G(agentId: string, key: string, value: string): Promise<void> {
  if (ZG_API_KEY === 'PLACEHOLDER_REPLACE_ME') return;

  const payload = {
    agentId,
    key,
    value,
    timestamp: Date.now(),
  };

  await fetch(`${ZG_STORAGE_ENDPOINT}/api/v1/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ZG_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function loadFrom0G(agentId: string): Promise<Record<string, string>> {
  if (ZG_API_KEY === 'PLACEHOLDER_REPLACE_ME') return {};

  try {
    const response = await fetch(
      `${ZG_STORAGE_ENDPOINT}/api/v1/query?agentId=${agentId}`,
      {
        headers: { Authorization: `Bearer ${ZG_API_KEY}` },
      },
    );

    if (!response.ok) return {};

    const data = await response.json();
    const store = getMemoryStore(agentId);

    for (const entry of data.entries ?? []) {
      store.entries.set(entry.key, {
        key: entry.key,
        value: entry.value,
        timestamp: entry.timestamp,
      });
    }

    const result: Record<string, string> = {};
    store.entries.forEach((entry, key) => {
      result[key] = entry.value;
    });
    return result;
  } catch {
    return {};
  }
}
