/**
 * Hedera Token Service (HTS) - NOVA Fungible Token
 * Creates and manages the NOVA reward token on Hedera testnet.
 * Combined with HCS, this gives Nova 2 native Hedera services.
 */

export interface NovaTokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  treasuryAccountId: string;
}

export interface MintResult {
  success: boolean;
  tokenId: string;
  amount: number;
  newTotalSupply: string;
  transactionId?: string;
  error?: string;
}

// Module-level cache for the token ID
let cachedTokenId: string | null = process.env.HEDERA_NOVA_TOKEN_ID ?? null;
let cachedTotalSupply = 1000000; // 10000.00 with 2 decimals = 1000000 tinybar units

function getHederaCredentials() {
  return {
    accountId: process.env.NEXT_PUBLIC_HEDERA_ACCOUNT_ID ?? 'PLACEHOLDER_REPLACE_ME',
    privateKey: process.env.NEXT_PUBLIC_HEDERA_PRIVATE_KEY ?? 'PLACEHOLDER_REPLACE_ME',
  };
}

function isConfigured(): boolean {
  const creds = getHederaCredentials();
  return creds.accountId !== 'PLACEHOLDER_REPLACE_ME' && creds.privateKey !== 'PLACEHOLDER_REPLACE_ME';
}

/**
 * Creates the NOVA fungible token on Hedera testnet.
 * Lazy initialization — only creates once, then caches the token ID.
 */
export async function createNovaToken(): Promise<NovaTokenInfo> {
  // Return cached token if already created
  if (cachedTokenId) {
    return {
      tokenId: cachedTokenId,
      name: 'Nova Reward Token',
      symbol: 'NOVA',
      decimals: 2,
      totalSupply: cachedTotalSupply.toString(),
      treasuryAccountId: getHederaCredentials().accountId,
    };
  }

  const creds = getHederaCredentials();

  if (!isConfigured()) {
    // Simulated token for demo
    cachedTokenId = `0.0.nova-${Date.now()}`;
    return {
      tokenId: cachedTokenId,
      name: 'Nova Reward Token',
      symbol: 'NOVA',
      decimals: 2,
      totalSupply: cachedTotalSupply.toString(),
      treasuryAccountId: creds.accountId,
    };
  }

  try {
    const { Client, TokenCreateTransaction, AccountId, PrivateKey } =
      await import('@hashgraph/sdk');

    const client = Client.forTestnet();
    const operatorKey = PrivateKey.fromStringECDSA(creds.privateKey);
    client.setOperator(AccountId.fromString(creds.accountId), operatorKey);

    const transaction = new TokenCreateTransaction()
      .setTokenName('Nova Reward Token')
      .setTokenSymbol('NOVA')
      .setDecimals(2)
      .setInitialSupply(1000000) // 10000.00 NOVA
      .setTreasuryAccountId(AccountId.fromString(creds.accountId))
      .setSupplyKey(operatorKey.publicKey)
      .setAdminKey(operatorKey.publicKey);

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    cachedTokenId = receipt.tokenId?.toString() ?? `0.0.hts-${Date.now()}`;
    cachedTotalSupply = 1000000;

    console.log(`[HTS] NOVA token created: ${cachedTokenId}`);

    return {
      tokenId: cachedTokenId,
      name: 'Nova Reward Token',
      symbol: 'NOVA',
      decimals: 2,
      totalSupply: cachedTotalSupply.toString(),
      treasuryAccountId: creds.accountId,
    };
  } catch (error) {
    // Fallback to simulated token
    console.error('[HTS] Token creation failed, using simulated:', error);
    cachedTokenId = `0.0.nova-${Date.now()}`;
    return {
      tokenId: cachedTokenId,
      name: 'Nova Reward Token',
      symbol: 'NOVA',
      decimals: 2,
      totalSupply: cachedTotalSupply.toString(),
      treasuryAccountId: creds.accountId,
    };
  }
}

/**
 * Mints additional NOVA tokens as rewards.
 * Amount is in human-readable units (e.g., 1.50 = 150 tinybar units with 2 decimals).
 */
export async function mintNovaReward(amount: number): Promise<MintResult> {
  // Ensure token exists (lazy creation)
  const tokenInfo = await createNovaToken();
  const mintAmount = Math.floor(amount * 100); // Convert to smallest unit (2 decimals)

  const creds = getHederaCredentials();

  if (!isConfigured() || tokenInfo.tokenId.includes('nova-')) {
    // Simulated mint
    cachedTotalSupply += mintAmount;
    return {
      success: true,
      tokenId: tokenInfo.tokenId,
      amount: mintAmount,
      newTotalSupply: cachedTotalSupply.toString(),
      transactionId: `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}`,
    };
  }

  try {
    const { Client, TokenMintTransaction, AccountId, PrivateKey } =
      await import('@hashgraph/sdk');

    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(creds.accountId),
      PrivateKey.fromStringECDSA(creds.privateKey),
    );

    const transaction = new TokenMintTransaction()
      .setTokenId(tokenInfo.tokenId)
      .setAmount(mintAmount);

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    cachedTotalSupply += mintAmount;

    return {
      success: true,
      tokenId: tokenInfo.tokenId,
      amount: mintAmount,
      newTotalSupply: receipt.totalSupply?.toString() ?? cachedTotalSupply.toString(),
      transactionId: response.transactionId.toString(),
    };
  } catch (error) {
    // Fallback: still count it locally
    cachedTotalSupply += mintAmount;
    return {
      success: false,
      tokenId: tokenInfo.tokenId,
      amount: mintAmount,
      newTotalSupply: cachedTotalSupply.toString(),
      error: error instanceof Error ? error.message : 'Mint failed',
    };
  }
}

/**
 * Returns current NOVA token info.
 */
export async function getNovaTokenInfo(): Promise<NovaTokenInfo> {
  return createNovaToken();
}
