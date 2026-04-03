export interface Skill {
  name: string;
  description: string;
  parameters: SkillParameter[];
  handler: string; // function path
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
  default?: string | number | boolean;
}

export const DEFI_SKILLS: Skill[] = [
  {
    name: 'swap',
    description: 'Swap one token for another on the same chain via Uniswap V3',
    parameters: [
      { name: 'tokenIn', type: 'string', required: true, description: 'Input token symbol (e.g. ETH, USDC)' },
      { name: 'tokenOut', type: 'string', required: true, description: 'Output token symbol' },
      { name: 'amount', type: 'string', required: true, description: 'Amount of input token' },
      { name: 'chainId', type: 'number', required: false, description: 'Chain ID (default: 84532)', default: 84532 },
      { name: 'slippage', type: 'number', required: false, description: 'Max slippage %', default: 0.5 },
    ],
    handler: 'uniswap/swap',
  },
  {
    name: 'bridge',
    description: 'Bridge tokens cross-chain via Across Protocol',
    parameters: [
      { name: 'token', type: 'string', required: true, description: 'Token to bridge' },
      { name: 'amount', type: 'string', required: true, description: 'Amount to bridge' },
      { name: 'fromChainId', type: 'number', required: true, description: 'Source chain ID' },
      { name: 'toChainId', type: 'number', required: true, description: 'Destination chain ID' },
    ],
    handler: 'bridge/across',
  },
  {
    name: 'transfer',
    description: 'Transfer tokens to another address or ENS name',
    parameters: [
      { name: 'token', type: 'string', required: true, description: 'Token to transfer' },
      { name: 'amount', type: 'string', required: true, description: 'Amount to transfer' },
      { name: 'recipient', type: 'string', required: true, description: 'Recipient address or ENS name' },
      { name: 'chainId', type: 'number', required: false, description: 'Chain ID', default: 84532 },
    ],
    handler: 'transfer',
  },
  {
    name: 'balance',
    description: 'Check token balances on one or more chains',
    parameters: [
      { name: 'token', type: 'string', required: false, description: 'Specific token (or all)', default: 'all' },
      { name: 'chainId', type: 'number', required: false, description: 'Chain ID (or all chains)', default: 0 },
    ],
    handler: 'balance',
  },
  {
    name: 'nanopay',
    description: 'Send a USDC nanopayment via Arc/Circle',
    parameters: [
      { name: 'amount', type: 'string', required: true, description: 'USDC amount (can be micro-amounts like 0.001)' },
      { name: 'recipient', type: 'string', required: true, description: 'Recipient agent or address' },
      { name: 'memo', type: 'string', required: false, description: 'Payment memo' },
    ],
    handler: 'arc/nanopay',
  },
];

export function getSkill(name: string): Skill | undefined {
  return DEFI_SKILLS.find(s => s.name === name);
}

export function getSkillNames(): string[] {
  return DEFI_SKILLS.map(s => s.name);
}

export function formatSkillsForLLM(): string {
  return DEFI_SKILLS.map(s => {
    const params = s.parameters.map(p =>
      `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`,
    ).join('\n');
    return `## ${s.name}\n${s.description}\nParameters:\n${params}`;
  }).join('\n\n');
}
