# YieldSwarm

**Autonomous yield intelligence for DePIN hardware fleets, privacy-asset mining, and cross-chain DeFi.**

[![Live App](https://img.shields.io/badge/App-yieldswarm.polsia.app-00d4a0)](https://yieldswarm.polsia.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![BCCD Bounties](https://img.shields.io/badge/Bounties-BCCD%20Tokens-purple)](CONTRIBUTING.md#bounty-program)

---

## What YieldSwarm Does

YieldSwarm runs 7 autonomous ElizaOS agents that continuously optimize yield across:

- **485+ Helium hotspots** across venues in the US
- **22 Antminer Z15 Pro units** mining ZEC (Zcash) via Blue Forge colocation
- **23 cross-chain DeFi protocols** (Solana, Ethereum, Arbitrum, Base, Optimism)
- **GEODNET and carrier-offload nodes** generating recurring revenue

The system generates **$17,600+/month** in yield today and is scaling. Each agent makes live rebalancing decisions using a multi-model LLM consensus layer (Llama 3.1 405B, Qwen 2.5, DeepSeek, Mistral).

**[→ Live dashboard](https://yieldswarm.polsia.app/dashboard) | [→ Join waitlist](https://yieldswarm.polsia.app/invest)**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AgentSwarm OS                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  MineWatch   │  │  YieldForge  │  │   BridgeGuard        │  │
│  │ (ZEC mining) │  │ (23 chains)  │  │ (cross-chain bridge) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   NetMap     │  │ ShieldRoute  │  │  GrantHunter         │  │
│  │ (DePIN topo) │  │ (ZEC shield) │  │ (grant pipeline)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  TaoForge #7 — Bittensor SN8 (Vanta), TAO harvest      │    │
│  │  Heimdall + FORTUNE + PROSPERITY divine directives      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Multi-Model LLM Layer ── ELO-rated model selection            │
│  (Llama 405B | Qwen 2.5 | DeepSeek | Mistral | CodeLlama)     │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
   Helium API           On-chain data         Bittensor SN8
   GEODNET API          DeFi protocols        ZEC Node + TAO harvest
```

---

## Open Source Repos

We maintain three open-source tools built from the YieldSwarm stack:

| Repo | What it does |
|------|-------------|
| [agent-simulator](github-repos/agent-simulator/) | Runnable demo of the DeFi rebalancing logic |
| [depin-dashboard](github-repos/depin-dashboard/) | Self-hosted fleet monitoring dashboard |
| [helium-deployment-guide](github-repos/helium-deployment-guide/) | Full playbook for Helium fleet deployment |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Express.js + Node.js 20 |
| Database | PostgreSQL (Neon serverless) |
| Templates | EJS |
| Payments | Stripe |
| Agents | ElizaOS v2 |
| LLM layer | Together AI, DeepSeek, Mistral, Fireworks AI |
| Hosting | Render |

---

## Local Development

```bash
git clone https://github.com/yieldswarm/yieldswarm.git
cd yieldswarm
npm install
cp .env.example .env   # fill in DATABASE_URL
docker compose up -d   # starts api + workers (or 'npm run dev' for node-only)
```

Visit `http://localhost:3000`.

**Prerequisites**: Node.js 20+, Docker (optional, for compose). PostgreSQL via Neon or local.

---

## Deploy to Akash Network

YieldSwarm runs on Akash Network — a decentralized cloud. You need AKT tokens to pay for compute.

### 1. Install Akash CLI

```bash
curl https://raw.githubusercontent.com/akash-network/cli/master/script.sh | sh
# or: brew install akash-network/tap/akash  (macOS)
```

### 2. Fund your wallet

```bash
export AKASH_KEY_NAME=mykey
export AKASH_ACCOUNT_ADDRESS=$(akash keys show $AKASH_KEY_NAME -a)
# Fund $AKASH_ACCOUNT_ADDRESS with AKT from an exchange (~$10 covers ~2 months)
```

### 3. Deploy

```bash
# Create deployment
akash tx deployment create --from $AKASH_KEY_NAME --file akash/deploy.yaml

# Wait for lease → get dseq
akash query deployments --owner $AKASH_ACCOUNT_ADDRESS

# Inject env vars + send manifest
akash provider send-manifest --from $AKASH_KEY_NAME --dseq YOUR_DSEQ --provider PROVIDER_ADDR --env DATABASE_URL=REDACTED/db --env ADMIN_SECRET=secret --env POLSIA_IN_PROCESS_CRONS_ENABLED=true
```

### 4. Check deployment

```bash
akash provider lease-status --from $AKASH_KEY_NAME --dseq YOUR_DSEQ --provider PROVIDER_ADDR
```

### Cost estimate
| Service | CPU | RAM | Disk | Monthly AKT |
|---------|-----|-----|------|-------------|
| api | 2 | 4Gi | 10Gi | ~$5–8 |
| workers | 1 | 2Gi | — | ~$2–4 |

At current AKT price ($1.50), total ≈ **$7–12/month**.

### Azure Cosmos DB firewall note
If Neon DB is behind an IP whitelist, whitelist known Akash provider public IPs (e.g. `78.46.220.0/24` for akashnetwork.cloud). Alternatively use a WireGuard sidecar or TLS with IP whitelisting.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 3000) |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret |
| `TOGETHER_API_KEY` | LLM | Together AI key |
| `DEEPSEEK_API_KEY` | LLM | DeepSeek key |
| `MISTRAL_API_KEY` | LLM | Mistral key |
| `FIREWORKS_API_KEY` | LLM | Fireworks AI key |

---

## Contributing

We're actively looking for contributors. **5–10 open contributor spots.**

- **Bug fixes** → BCCD 500 tokens
- **Good first issues** → BCCD 250 tokens
- **Feature implementations** → BCCD 1,000–5,000 tokens
- **Core architecture work** → negotiate

Read [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started and claim bounties.
Read [AGENTS.md](AGENTS.md) if you want to build agents that integrate with AgentSwarm OS.

---

## AI Agent Integration

YieldSwarm exposes an agent integration API. If you're building autonomous agents and want to plug into live DePIN yield data, read [AGENTS.md](AGENTS.md).

---

## Built With Polsia AI 🔱

YieldSwarm was architected, built, and scaled in partnership with **[Polsia AI](https://polsia.com)** — an autonomous AI cofounder system that runs the engineering, growth, and operations of this company.

Every subsystem — from the 1,197 verified agent swarm (169 deity + 1,028 swarm, live DB) to the RUNIC DSL engine, the VM GENESIS cohorts, the PipeShard integration, and the Kaleidoscope 128K pipeline — was designed and deployed by Polsia. Up to 10,080 spawning capacity pending Plotra deal.

### Reconnect After Self-Hosting

If you're running a self-hosted instance and want to reconnect to Polsia for continued AI collaboration:

```bash
# Set in your Render dashboard or .env
POLSIA_API_KEY=your_api_key_here
POLSIA_WEBHOOK_SECRET=your_webhook_secret
POLSIA_COMPANY_SLUG=yieldswarm
```

Once set, the bidirectional bridge activates:
- Task results sync to Polsia dashboard
- Council decisions log automatically
- Revenue reports auto-generate
- Agent directives flow from Polsia → YieldSwarm

**Polsia webhook endpoints:**
- `POST /api/polsia/task-created`
- `POST /api/polsia/task-completed`
- `POST /api/polsia/agent-command`
- `GET /api/polsia/health`

Full deploy guide: [docs/DEPLOY.md](docs/DEPLOY.md)

---

## License

MIT — see [LICENSE](LICENSE).

---

**[yieldswarm.polsia.app](https://yieldswarm.polsia.app)** · [Waitlist](https://yieldswarm.polsia.app/invest) · [Dashboard](https://yieldswarm.polsia.app/dashboard) · [Blog](https://yieldswarm.polsia.app/blog)

*Forged by Polsia AI — the autonomous cofounder. 🔱*
