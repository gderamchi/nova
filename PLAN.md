# Nova - Technical Build Plan
## ETHGlobal Cannes 2026 | 36h Hackathon

### Target Bounties ($33K potential)
1. **Uniswap Foundation $10K** - Best Uniswap API Integration
2. **0G $6K** - Best OpenClaw Agent
3. **Arc/Circle $6K** - Best Agentic Economy with Nanopayments
4. **ENS $5K** - Best ENS Integration for AI Agents
5. **Hedera $6K** - AI & Agentic Payments

---

## Phase 1: Project Init (1h)
**Files:**
- `package.json` - Next.js 14, deps
- `next.config.ts` - config
- `tsconfig.json`
- `tailwind.config.ts` + `postcss.config.js`
- `.env.local` - all API keys
- `.gitignore`
- `src/app/layout.tsx` - root layout
- `src/app/page.tsx` - landing/redirect
- `src/app/globals.css` - tailwind imports

**Deps:** next react react-dom typescript tailwindcss postcss autoprefixer @types/react @types/node

## Phase 2: Telegram Mini-App Shell (2h)
**Files:**
- `src/app/mini-app/page.tsx` - main Mini-App page
- `src/app/mini-app/layout.tsx` - TMA layout with SDK init
- `src/components/ChatInterface.tsx` - chat-style NL input
- `src/components/TransactionCard.tsx` - tx status display
- `src/components/WalletStatus.tsx` - smart account status
- `src/lib/telegram.ts` - TMA SDK helpers
- `src/hooks/useTelegram.ts` - hook for TMA context

**Deps:** @telegram-apps/sdk-react @telegram-apps/sdk

## Phase 3: LLM Intent Parser (2h)
**Files:**
- `src/app/api/parse-intent/route.ts` - API route
- `src/lib/intent-parser.ts` - Claude API integration
- `src/lib/intent-types.ts` - TypeScript types for intents
- `src/lib/prompts.ts` - system prompts for parsing

**Deps:** @anthropic-ai/sdk

**Intent types:** swap, bridge, lend, transfer
**Output:** { action, tokenIn, tokenOut, amount, chainFrom, chainTo, protocol }

## Phase 4: Smart Account / AA (3h)
**Files:**
- `src/lib/smart-account.ts` - create ephemeral smart accounts
- `src/lib/bundler.ts` - Pimlico bundler client
- `src/lib/paymaster.ts` - gas sponsorship
- `src/lib/chains.ts` - chain configs (Base Sepolia, Arb Sepolia)
- `src/hooks/useSmartAccount.ts` - React hook

**Deps:** permissionless viem @pimlico/sdk

## Phase 5: Uniswap Integration (3h) [BOUNTY #1]
**Files:**
- `src/lib/uniswap/client.ts` - Uniswap API client
- `src/lib/uniswap/quote.ts` - get quotes
- `src/lib/uniswap/swap.ts` - execute swaps via API
- `src/lib/uniswap/tokens.ts` - token list for testnets
- `src/app/api/swap/route.ts` - swap API endpoint

**Deps:** (uses fetch to Uniswap API, needs API key from developer.uniswap.org)

## Phase 6: Cross-Chain Bridge (2h)
**Files:**
- `src/lib/bridge/across.ts` - Across Protocol integration
- `src/lib/bridge/router.ts` - route selection (same-chain swap vs bridge+swap)
- `src/app/api/bridge/route.ts` - bridge API endpoint

**Deps:** @across-protocol/sdk (or direct API calls)

## Phase 7: ENS Agent Identity (2h) [BOUNTY #4]
**Files:**
- `src/lib/ens/identity.ts` - register/resolve ENS subnames for agents
- `src/lib/ens/records.ts` - store agent metadata in text records
- `src/lib/ens/discovery.ts` - agent discovery via ENS
- `src/components/AgentIdentity.tsx` - display agent ENS name

**Deps:** @ensdomains/ensjs

## Phase 8: OpenClaw Agent Wrapper (2h) [BOUNTY #2]
**Files:**
- `src/lib/openclaw/agent.ts` - OpenClaw agent definition
- `src/lib/openclaw/skills.ts` - DeFi skills (swap, bridge, lend)
- `src/lib/openclaw/memory.ts` - agent memory/state via 0G Storage
- `openclaw-agent/SKILL.md` - skill definition for OpenClaw
- `openclaw-agent/agent.json` - agent manifest

## Phase 9: Arc/Circle Nanopayments (2h) [BOUNTY #3]
**Files:**
- `src/lib/arc/nanopay.ts` - USDC nanopayment flows
- `src/lib/arc/agent-commerce.ts` - agent-to-agent payments
- `src/app/api/nanopay/route.ts` - payment endpoint

## Phase 10: Hedera Agent Payments (2h) [BOUNTY #5]
**Files:**
- `src/lib/hedera/agent-kit.ts` - Hedera Agent Kit integration
- `src/lib/hedera/payments.ts` - agent payment execution
- `src/lib/hedera/hcs.ts` - audit trail via Consensus Service

**Deps:** @hashgraph/sdk

## Phase 11: Integration & Demo Flow (3h)
**Files:**
- `src/lib/orchestrator.ts` - ties all modules together
- `src/lib/execution-engine.ts` - intent -> plan -> execute pipeline
- `src/components/DemoMode.tsx` - guided demo walkthrough
- Update ChatInterface with full flow

## Phase 12: Deploy & Polish (2h)
- Vercel deploy
- Telegram BotFather webhook setup
- Demo video recording
- README with architecture diagram
- ETHGlobal submission

---

## Timeline (36h)
- Hours 0-1: Phase 1 (init)
- Hours 1-3: Phase 2 (Telegram)
- Hours 3-5: Phase 3 (LLM parser)
- Hours 5-8: Phase 4 (AA/Smart Accounts)
- Hours 8-11: Phase 5 (Uniswap) ⭐
- Hours 11-13: Phase 6 (Bridge)
- Hours 13-15: Phase 7 (ENS) ⭐
- Hours 15-17: Phase 8 (OpenClaw) ⭐
- Hours 17-19: Phase 9 (Arc) ⭐
- Hours 19-21: Phase 10 (Hedera) ⭐
- Hours 21-24: Phase 11 (Integration)
- Hours 24-26: Phase 12 (Deploy)
- Hours 26-36: Buffer, polish, demo prep

## API Keys Needed
- [x] Telegram Bot: (see .env.local)
- [x] Anthropic Claude: (same as OpenClaw)
- [ ] Pimlico: https://dashboard.pimlico.io
- [ ] Alchemy RPC: https://www.alchemy.com
- [ ] Uniswap: https://developer.uniswap.org
- [ ] 0G: TBD
- [ ] Hedera testnet: https://portal.hedera.com
