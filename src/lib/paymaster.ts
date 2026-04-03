const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? 'PLACEHOLDER_REPLACE_ME';

function getPaymasterUrl(chainId: number): string {
  const chainName = chainId === 421614 ? 'arbitrum-sepolia' : 'base-sepolia';
  return `https://api.pimlico.io/v2/${chainName}/rpc?apikey=${PIMLICO_API_KEY}`;
}

export interface SponsorshipResult {
  paymasterAndData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}

export async function sponsorUserOperation(
  chainId: number,
  userOp: {
    sender: `0x${string}`;
    nonce: bigint;
    callData: `0x${string}`;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  },
): Promise<SponsorshipResult> {
  const url = getPaymasterUrl(chainId);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [
        {
          sender: userOp.sender,
          nonce: `0x${userOp.nonce.toString(16)}`,
          callData: userOp.callData,
          maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        },
        '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // EntryPoint v0.7
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Paymaster error: ${data.error.message}`);
  }

  return {
    paymasterAndData: data.result.paymasterAndData,
    callGasLimit: BigInt(data.result.callGasLimit),
    verificationGasLimit: BigInt(data.result.verificationGasLimit),
    preVerificationGas: BigInt(data.result.preVerificationGas),
  };
}

export async function checkSponsorshipEligibility(chainId: number): Promise<boolean> {
  try {
    const url = getPaymasterUrl(chainId);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_supportedEntryPoints',
        params: [],
      }),
    });
    const data = await response.json();
    return !data.error;
  } catch {
    return false;
  }
}
