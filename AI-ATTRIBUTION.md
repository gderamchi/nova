# AI Attribution — Nova

## AI Tools Used

### Claude Code (Anthropic)
- **Orchestrator wiring**: Used Claude Code to connect the frontend to real backend execution (replacing mock data with on-chain transactions)
- **Per-user wallet system**: Claude Code helped scaffold the deterministic wallet derivation from Telegram user IDs
- **Bounty integrations**: Hedera HCS audit trail, Arc/Circle nanopayments, and 0G memory wiring were accelerated with Claude Code
- **Bug fixes**: Gas pricing issues, RPC compatibility, and Uniswap V3 multicall pattern

### Claude AI (via API)
- **Intent parsing**: Claude is used as the core AI model powering Nova's natural language understanding (parsing "swap 0.01 ETH to USDC" into structured intents)

### OpenClaw
- Used as the AI agent orchestration framework during development

## Team Contributions
All architecture decisions, product design, UX flow, smart contract integration logic, testing, and deployment were done by the team. AI tools were used to accelerate implementation of the decided architecture, not to design the system.

## What Was Built During the Hackathon
Everything in this repository was built during ETHGlobal Cannes 2026 (April 3-5, 2026). No prior code was reused. The git history shows incremental progress throughout the event.
