# Nova DeFi Agent

## Overview
Nova is a zero-click, cross-chain DeFi agent that operates inside Telegram Mini Apps. Users type natural language commands, and Nova handles everything: intent parsing, route planning, gas sponsorship, and execution.

## Skills

### swap
Swap tokens on the same chain via Uniswap V3.
- **Input**: tokenIn, tokenOut, amount, chainId, slippage
- **Output**: txHash, amountOut, executionPrice
- **Chains**: Base Sepolia (84532), Arbitrum Sepolia (421614)

### bridge
Bridge tokens cross-chain via Across Protocol.
- **Input**: token, amount, fromChainId, toChainId
- **Output**: txHash, depositId, estimatedFillTime
- **Routes**: Base Sepolia ↔ Arbitrum Sepolia

### transfer
Transfer tokens to an address or ENS name.
- **Input**: token, amount, recipient, chainId
- **Output**: txHash, recipient resolved address

### balance
Check token balances across chains.
- **Input**: token (optional), chainId (optional)
- **Output**: balances per chain per token

### nanopay
Send USDC micro-payments via Arc/Circle nanopayment channels.
- **Input**: amount, recipient, memo
- **Output**: paymentId, txHash

## Agent Identity
- **ENS**: nova-agent.eth (when registered)
- **Protocol**: ERC-4337 Account Abstraction
- **LLM**: Claude Sonnet (Anthropic)
- **Storage**: 0G decentralized storage for agent memory

## Architecture
```
User (Telegram) → Nova Chat UI → Claude Intent Parser → Route Planner
  → Execution Engine (Uniswap / Across / Transfer)
  → AA Bundler (Pimlico) → Paymaster (gas sponsorship)
  → HCS Audit Log (Hedera) → Response to User
```

## Supported Chains
| Chain | ID | Network |
|-------|-----|---------|
| Base Sepolia | 84532 | Testnet |
| Arbitrum Sepolia | 421614 | Testnet |

## Payment Rails
- **Arc/Circle**: USDC nanopayments for agent-to-agent commerce
- **Hedera**: HBAR payments with HCS audit trail
