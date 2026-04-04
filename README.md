# Nova — Zero-Click Cross-Chain DeFi Agent

> 🏗️ Built at **ETHGlobal Cannes 2026** | [Live Demo](https://nova-sigma-steel.vercel.app) | [Telegram Bot](https://t.me/novahackathon_bot)

> **💬 Natural-language DeFi agent in Telegram: just type what you want, Nova executes it on-chain.**

## 🧠 What is Nova?

Nova is an AI-powered DeFi agent that lives inside a **Telegram Mini-App**. Users interact with it using plain English — commands like "swap 0.1 ETH to USDC" or "bridge 100 USDC from Base to Arbitrum" — and Nova parses the intent, builds a transaction plan, and executes real on-chain operations with zero manual clicks. It supports token swaps via Uniswap V3, cross-chain bridging via Across Protocol, native/ERC-20 transfers, multi-chain balance checks, USDC nanopayments between agents via Arc/Circle, and a full immutable audit trail powered by Hedera Consensus Service. Each Telegram user gets a deterministic wallet derived from a master key, so there's no seed phrase or wallet setup required. Nova also registers itself as an ENS-identified agent (`nova-agent.eth`) with on-chain metadata, and persists its operation history to 0G decentralized storage. The result is a conversational interface where DeFi feels as simple as texting a friend.

```
"Swap 0.01 ETH to USDC"  →  ✅ Real Uniswap V3 transaction on-chain
```

## ✨ Features

- 🗣️ **Natural Language DeFi** — Claude AI understands your intent ("buy ETH", "send USDC to vitalik.eth")
- 📱 **Telegram Mini App** — 900M+ users, nothing to install, one-tap access
- 🔁 **Uniswap V3 Swaps** — Real on-chain token swaps via SwapRouter02
- 🌉 **Cross-Chain Bridge** — Bridge assets between Base and Arbitrum via Across Protocol
- 💸 **Transfers** — Send ETH or ERC20 tokens to any address or ENS name
- ⛽ **Account Abstraction** — ERC-4337 smart accounts with gas sponsorship via Pimlico
- 💰 **Agent Nanopayments** — USDC micropayments between AI agents via Arc/Circle
- 📝 **Audit Trail** — Every operation logged to Hedera Consensus Service (HCS)
- 🧠 **Agent Memory** — Persistent operation history via 0G decentralized storage
- 🔗 **ENS Identity** — Agent identity and discovery via ENS names

## 🔧 How It's Made

Nova is built on **Next.js 14** (App Router) with a Telegram Mini-App frontend using `@telegram-apps/sdk-react`. The core pipeline works in three stages: **parse → plan → execute**. Natural language is sent to **Claude Sonnet 4** (Anthropic API) with a structured system prompt that outputs typed JSON intents (swap, bridge, transfer, balance, nanopay, audit, memory). The orchestrator (`orchestrator.ts`) then routes each intent to the appropriate handler.

For swaps, we call **Uniswap V3's SwapRouter02** directly on Base Sepolia — encoding `exactInputSingle` + `refundETH` into a `multicall` for ETH-in swaps, or doing approve-then-swap for ERC-20s, all using `viem`'s `encodeFunctionData`. Cross-chain bridging hits the **Across Protocol** suggested-fees API for quotes and sends deposits to the spoke pool contract. Per-user wallets are derived deterministically via `keccak256(masterKey + "nova-user-" + telegramUserId)` — a hacky but effective way to give every Telegram user their own wallet with no onboarding, and a treasury account auto-funds new users with gas.

**ENS** (`@ensdomains/ensjs` on mainnet) provides agent identity: Nova registers text records (agent-type, skills, version) and resolves `.eth` recipients. **0G Storage** persists agent memory (operation history, preferences) to decentralized storage with a local cache fallback. **Arc/Circle** powers USDC nanopayments between agents — every operation logs a micro-fee to a payment ledger. **Hedera Consensus Service** (`@hashgraph/sdk`) writes every swap, bridge, and transfer to an HCS topic for an immutable audit trail. The whole thing is wrapped as an **OpenClaw agent** with a skill manifest (`agent.json` + `SKILL.md`) exposing swap/bridge/transfer/balance/nanopay as composable agent skills. All partner integrations gracefully degrade to simulated mode when API keys aren't configured, so the demo always works.

## 🏗️ Architecture

```
User (Telegram Mini App)
  → Chat UI (Next.js + Tailwind)
    → Claude AI (Intent Parser)
      → Orchestrator (Route Planning)
        → Execution Engine
          ├── Uniswap V3 (Swaps)
          ├── Across Protocol (Bridges)
          ├── viem (Transfers)
          ├── Arc/Circle (Nanopayments)
          ├── Pimlico (AA + Gas Sponsorship)
          ├── Hedera HCS (Audit Trail)
          └── 0G Storage (Agent Memory)
```

## 🎯 Sponsor Integrations

### Uniswap — Token Swaps (API Key Integration)
Real on-chain swaps via **Uniswap V3 SwapRouter02** on Base Sepolia. Uses `multicall` with `exactInputSingle` + `refundETH` for native ETH swaps. Verified transactions on [BaseScan](https://sepolia.basescan.org).

- **API Key**: Authenticated requests to `https://api.uniswap.org/v2/quote` with `x-api-key` header
- **Fallback**: Graceful degradation to simulated quotes when API is unavailable
- **Debug logging**: All API responses logged for transparency
- [Uniswap Developer Feedback Form](https://forms.gle/7JEAfMPKHMDVQB6U8)

### 0G — Agent Memory & Storage
Nova uses **0G decentralized storage** for persistent agent memory. Every operation (swap, transfer, bridge, payment) is stored and retrievable. Users can query their full operation history through natural language ("show my history").

### Arc/Circle — Chain Abstracted USDC & Agent-to-Agent Commerce
Nova treats **Base and Arbitrum as one unified liquidity layer for USDC**, routing payments through Arc. Cross-chain USDC transfers are abstracted away — users send USDC and Nova handles the bridging, nanopayment recording, and audit trail across chains seamlessly.

- **Chain Abstracted USDC**: `crossChainUSDCTransfer()` moves USDC across chains — logs a nanopayment on the source chain, creates a bridged payment record on the destination chain, and records the full flow to Hedera HCS. Users never think about which chain their USDC is on.
- **Cross-chain bridge integration**: When bridging USDC, the orchestrator automatically creates a cross-chain USDC flow record via Arc and logs it to the HCS audit trail, treating multiple blockchains as one liquidity surface.
- **Multi-agent commerce flow**: 3-agent payment loop (nova-defi -> oracle-price -> data-provider -> nova-defi)
- **Reply payments**: Every nanopayment triggers a bidirectional reply, demonstrating real agent economy
- **Service marketplace**: Agents register skills with prices, other agents discover and pay for them
- **API endpoint**: `POST /api/agent-commerce` triggers the full simulation; `GET /api/agent-commerce` returns commerce history
- **Architecture diagram**:
  ```
  [Base Sepolia]                    [Arbitrum Sepolia]
       │                                   │
       └──── USDC (Arc liquidity) ─────────┘
                      │
              Nova Orchestrator
              (chain-abstracted)

  nova-defi ──$0.005──> oracle-price ──$0.003──> data-provider
       ^                                              │
       └──────────────── $0.01 ───────────────────────┘
  ```

### Hedera — Audit Trail (HCS) + Reward Token (HTS)
Nova uses **2 native Hedera services** — no Solidity required:

1. **HCS (Hedera Consensus Service)** — Every Nova operation is logged to HCS topic `0.0.8504799` for an immutable, timestamped audit trail. Sub-second finality, predictable fees.
2. **HTS (Hedera Token Service)** — The **NOVA reward token** (symbol: NOVA, decimals: 2, initial supply: 10,000) is created and minted via HTS. Users earn NOVA tokens for every successful swap, bridge, or transfer.

- **HCS Topic ID**: `0.0.8504799`
- **NOVA Token**: Created lazily on first use via `TokenCreateTransaction`, minted via `TokenMintTransaction`
- **Reward flow**: After each successful operation, Nova mints NOVA rewards AND logs the reward event to HCS
- **API endpoint**: `GET /api/hedera` returns `{ topicId, tokenId, hcsMessages, tokenInfo }`
- **Key type**: ECDSA (`PrivateKey.fromStringECDSA`)

### Pimlico — Account Abstraction
**ERC-4337 smart accounts** with gas sponsorship via Pimlico. Users don't need to hold ETH for gas — Nova sponsors all transaction fees through the Pimlico paymaster.

### ENS — Agent Identity
Nova's agent identity is registered as an **ENS name** (`nova-agent.eth`), enabling agent discovery and metadata storage in ENS text records.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Messaging | Telegram Mini App SDK |
| AI | Anthropic Claude (intent parsing) |
| Blockchain | Base Sepolia, Arbitrum Sepolia |
| DEX | Uniswap V3 (SwapRouter02) |
| Bridge | Across Protocol |
| AA | Pimlico (ERC-4337 bundler + paymaster) |
| Payments | Arc/Circle (USDC nanopayments) |
| Audit | Hedera Consensus Service (HCS) |
| Storage | 0G decentralized storage |
| Identity | ENS (Ethereum Name Service) |
| Deploy | Vercel |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/gderamchi/nova.git
cd nova

# Install
npm install

# Configure
cp .env.example .env.local
# Add your API keys (see below)

# Run
npm run dev
```

### Environment Variables

```env
ANTHROPIC_API_KEY=         # Claude API key for intent parsing
TELEGRAM_BOT_TOKEN=        # Telegram bot token from @BotFather
NOVA_PRIVATE_KEY=          # Server wallet private key (testnet only!)
NEXT_PUBLIC_PIMLICO_API_KEY=
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://base-sepolia-rpc.publicnode.com
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://arbitrum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_HEDERA_ACCOUNT_ID=
NEXT_PUBLIC_HEDERA_PRIVATE_KEY=
NEXT_PUBLIC_ARC_API_KEY=
NEXT_PUBLIC_0G_API_KEY=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
```

## 📱 Demo

1. Open [@novahackathon_bot](https://t.me/novahackathon_bot) on Telegram
2. Tap **"Open Nova"** menu button
3. Try these commands:
   - `Check my balance` — Real on-chain balances
   - `Swap 0.001 ETH to USDC` — Real Uniswap V3 swap
   - `Send 0.0001 ETH to 0x...` — Real ETH transfer
   - `Pay 0.01 USDC to agent-oracle` — Agent nanopayment
   - `Show audit log` — Hedera HCS audit trail
   - `Show my history` — 0G storage operation history

## 🔗 Deployed Contracts & Addresses

| Contract / Service | Address / ID | Chain / Network |
|-------------------|-------------|-----------------|
| SwapRouter02 | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` | Base Sepolia |
| UniswapV3Factory | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` | Base Sepolia |
| WETH | `0x4200000000000000000000000000000000000006` | Base Sepolia |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Base Sepolia |
| Nova Agent Wallet | `0x834583E76fbE01a9297982639AE72994A49872EB` | Base Sepolia |
| HCS Topic | `0.0.8504799` | Hedera Testnet |
| NOVA Token (HTS) | Created lazily on first use | Hedera Testnet |
| Hedera Treasury | `0.0.8498893` | Hedera Testnet |

## 👥 Team

- **Samir** — Telegram: [@Samir_18100](https://t.me/Samir_18100) | LinkedIn: [Samir](#)
- **Habi** — GitHub: [habicll](https://github.com/habicll) | LinkedIn: [Habi](#)
- **Guillaume** — Telegram: [@guillaumederamchi](https://t.me/guillaumederamchi) | LinkedIn: [Guillaume](#)

## 📄 License

MIT

---

*Nova — DeFi, as simple as a text message.* 💬⚡
