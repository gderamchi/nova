/**
 * Nova Security Module - Spending limits & wallet freeze
 * Server-side enforcement (cannot be bypassed by client)
 */

// In-memory store (per serverless invocation, but shows the pattern)
const frozenWallets = new Set<string>();
const dailySpending = new Map<string, { total: number; date: string }>();

const LIMITS = {
  maxPerTransaction: 5,          // max 5 ETH per tx
  maxPerTransactionUSDC: 10000,  // max 10,000 USDC per tx
  maxDailyETH: 10,               // max 10 ETH per day
  maxDailyUSDC: 25000,           // max 25,000 USDC per day
  requireConfirmationAbove: 1,   // require confirmation above 1 ETH
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isWalletFrozen(address: string): boolean {
  return frozenWallets.has(normalizeAddress(address));
}

export function freezeWallet(address: string): void {
  frozenWallets.add(normalizeAddress(address));
}

export function unfreezeWallet(address: string): void {
  frozenWallets.delete(normalizeAddress(address));
}

export function checkSpendingLimit(
  address: string,
  amount: number,
  token: string,
): { allowed: boolean; reason?: string; requiresConfirmation?: boolean } {
  const norm = normalizeAddress(address);
  const upper = token.toUpperCase();
  const today = todayKey();

  // Per-transaction limits
  if (upper === 'ETH' && amount > LIMITS.maxPerTransaction) {
    return { allowed: false, reason: `Per-transaction limit: max ${LIMITS.maxPerTransaction} ETH.` };
  }
  if (['USDC', 'USDT', 'DAI'].includes(upper) && amount > LIMITS.maxPerTransactionUSDC) {
    return { allowed: false, reason: `Per-transaction limit: max ${LIMITS.maxPerTransactionUSDC.toLocaleString()} ${upper}.` };
  }

  // Daily limits
  const key = `${norm}:${upper}`;
  const record = dailySpending.get(key);
  const spentToday = record && record.date === today ? record.total : 0;

  if (upper === 'ETH' && spentToday + amount > LIMITS.maxDailyETH) {
    return {
      allowed: false,
      reason: `Daily limit exceeded: ${spentToday.toFixed(4)} / ${LIMITS.maxDailyETH} ETH spent today.`,
    };
  }
  if (['USDC', 'USDT', 'DAI'].includes(upper) && spentToday + amount > LIMITS.maxDailyUSDC) {
    return {
      allowed: false,
      reason: `Daily limit exceeded: ${spentToday.toLocaleString()} / ${LIMITS.maxDailyUSDC.toLocaleString()} ${upper} spent today.`,
    };
  }

  // Confirmation threshold
  if (upper === 'ETH' && amount > LIMITS.requireConfirmationAbove) {
    return { allowed: true, requiresConfirmation: true };
  }

  return { allowed: true };
}

export function recordSpending(address: string, amount: number, token: string): void {
  const norm = normalizeAddress(address);
  const key = `${norm}:${token.toUpperCase()}`;
  const today = todayKey();
  const record = dailySpending.get(key);

  if (record && record.date === today) {
    dailySpending.set(key, { total: record.total + amount, date: today });
  } else {
    dailySpending.set(key, { total: amount, date: today });
  }
}

export function getSpendingInfo(
  address: string,
): { dailySpentETH: number; dailySpentUSDC: number; limitETH: number; limitUSDC: number; frozen: boolean } {
  const norm = normalizeAddress(address);
  const today = todayKey();

  const ethRecord = dailySpending.get(`${norm}:ETH`);
  const usdcRecord = dailySpending.get(`${norm}:USDC`);

  return {
    dailySpentETH: ethRecord && ethRecord.date === today ? ethRecord.total : 0,
    dailySpentUSDC: usdcRecord && usdcRecord.date === today ? usdcRecord.total : 0,
    limitETH: LIMITS.maxDailyETH,
    limitUSDC: LIMITS.maxDailyUSDC,
    frozen: isWalletFrozen(address),
  };
}
