/**
 * Pimlico ERC-4337 Smart Account with gas sponsoring.
 * Uses Safe smart accounts (v1.4.1) + Pimlico paymaster for gasless transactions.
 */

import { createPublicClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { CHAIN_ID_MAP, baseSepolia } from './chains';

const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || 'pim_5puaJtR4ijHi9QjfW3JPC4';

function getPimlicoUrl(chainId: number): string {
  const chainName = chainId === 421614 ? 'arbitrum-sepolia' : 'base-sepolia';
  return `https://api.pimlico.io/v2/${chainName}/rpc?apikey=${PIMLICO_API_KEY}`;
}

function getChainForId(chainId: number): Chain {
  return CHAIN_ID_MAP[chainId] ?? baseSepolia;
}

export async function getSmartAccountClient(privateKey: `0x${string}`, chainId: number) {
  const chain = getChainForId(chainId);
  const pimlicoUrl = getPimlicoUrl(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  });

  const owner = privateKeyToAccount(privateKey);

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    version: '1.4.1',
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  });

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain,
    bundlerTransport: http(pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await pimlicoClient.getUserOperationGasPrice()).fast;
      },
    },
  });

  return smartAccountClient;
}

/** Compute the counterfactual Safe smart account address without deploying */
export async function getSmartAccountAddress(privateKey: `0x${string}`, chainId: number): Promise<`0x${string}`> {
  const chain = getChainForId(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const owner = privateKeyToAccount(privateKey);

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    version: '1.4.1',
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
  });

  return safeAccount.address;
}
