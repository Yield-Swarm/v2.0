# AI Agent Integration — AgentSwarm OS

YieldSwarm's backend exposes a public API that external agents can integrate with. If you're building autonomous agents that operate in DeFi, DePIN, or yield optimization — you can read live data from the YieldSwarm ecosystem and subscribe to yield events.

---

## What You Can Access

| Endpoint | Description | Auth required |
|----------|-------------|---------------|
| `GET /api/fleet` | Live fleet node status (all hardware units) | No |
| `GET /api/agents` | Agent status, uptime, 24h/7d/30d yield per agent | No |
| `GET /api/zec-price` | Live ZEC/USD price (CoinPaprika + fallback) | No |
| `GET /api/model-intelligence/leaderboard` | ELO ratings per model per domain | No |
| `POST /api/model-intelligence/query` | Route a prompt through the consensus LLM layer | API key |
| `POST /api/waitlist-crm` | Register an agent identity in the ecosystem | No |

All public endpoints return JSON. No authentication needed for read-only data.

---

## Live Data Feeds

### Fleet Status

```bash
curl https://yieldswarm.polsia.app/api/fleet
```

Response:
```json
{
  "nodes": [
    {
      "node_id": "helium-sf-001",
      "device_type": "helium_hotspot",
      "location": "San Francisco, CA",
      "online": true,
      "yield_24h": 1.42,
      "yield_7d": 9.87
    }
  ],
  "summary": {
    "total_nodes": 485,
    "online_count": 461,
    "total_yield_24h_usd": 580.40
  }
}
```

### Agent Status

```bash
curl https://yieldswarm.polsia.app/api/agents
```

Response:
```json
{
  "agents": [
    {
      "agent_id": "fleet-optimizer",
      "name": "Fleet Optimizer",
      "status": "active",
      "uptime_pct": 99.2,
      "yield_24h": 189.40,
      "yield_7d": 1284.30,
      "last_action": "Rebalanced 3 underperforming Helium nodes",
      "last_action_at": "2026-05-16T00:03:21Z"
    }
  ]
}
```

### ZEC Price

```bash
curl https://yieldswarm.polsia.app/api/zec-price
```

Response:
```json
{
  "symbol": "ZEC",
  "price_usd": 28.40,
  "price_btc": 0.000284,
  "change_24h_pct": 2.1,
  "source": "coinpaprika",
  "cached_at": "2026-05-16T00:07:00Z"
}
```

---

## Multi-Model LLM Consensus API

The most powerful integration: route your own prompts through YieldSwarm's ELO-rated LLM consensus layer.

The system fans out to multiple models (Llama 3.1 405B, Qwen 2.5, DeepSeek, Mistral, CodeLlama), scores responses using an ELO tournament, and returns the synthesized best-of-N output.

### Request

```bash
curl -X POST https://yieldswarm.polsia.app/api/model-intelligence/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "prompt": "Analyze the risk of allocating 25% portfolio to JitoSOL given current SOL staking APY of 7.2% and TVL trend",
    "domain": "defi_analysis",
    "agent_id": "your-agent-id",
    "models": ["llama-3.1-405b", "deepseek-v3", "mistral-large"]
  }'
```

### Response

```json
{
  "request_id": "req_abc123",
  "consensus": "Moderate risk. JitoSOL at 7.2% APY is within normal range, but TVL compression over the last 14d suggests liquidity is migrating. Recommend capping at 20% until TVL stabilizes. Key risk: validator concentration at top 3 validators is 41%.",
  "winning_model": "deepseek-v3",
  "model_scores": {
    "llama-3.1-405b": 0.72,
    "deepseek-v3": 0.89,
    "mistral-large": 0.81
  },
  "latency_ms": 2840,
  "elo_updated": true
}
```

### Domains

| Domain | Description |
|--------|-------------|
| `defi_analysis` | Protocol risk, APY analysis, rebalancing decisions |
| `depin_operations` | Hardware fleet optimization, venue analysis |
| `mining_strategy` | Mining pool selection, hashrate optimization |
| `risk_assessment` | Portfolio risk, drawdown protection |
| `market_intelligence` | Price action, sentiment, on-chain signals |

To get an API key: [register an account](https://yieldswarm.polsia.app/account) and email hello@yieldswarm.com with subject "Agent Integration API Key".

---

## AgentSwarm OS — How It Works

AgentSwarm OS is the operating environment for the 6 internal YieldSwarm agents. External agents can plug into the event stream to receive yield signals.

### Supported Chains

```json
{
  "supported_chains": ["solana", "ethereum", "arbitrum", "base", "optimism", "zcash"],
  "supported_protocols": ["jito", "kamino", "drift", "aave", "uniswap-v3", "curve", "convex"],
  "permission_model": "read_only_public | authenticated_write",
  "os_version": "2.1.0"
}
```

### Event Types

When you subscribe (via webhook), you receive events:

| Event | Payload | When fired |
|-------|---------|-----------|
| `yield.rebalance` | Protocol changes, amounts moved | Agent executes a rebalance |
| `fleet.node_offline` | Node ID, last seen time | Hardware goes offline |
| `mining.block_found` | Block height, ZEC amount, USD value | Solo block mined |
| `alert.critical` | Alert message, agent ID | Critical threshold breach |
| `agent.action` | Agent ID, action summary | Any agent makes a decision |

### Webhook Registration (Coming Q3 2026)

```bash
curl -X POST https://yieldswarm.polsia.app/api/agents/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://your-agent.example.com/webhook",
    "events": ["yield.rebalance", "alert.critical"],
    "secret": "your-webhook-secret"
  }'
```

Webhook integration is in development. [Star the repo](https://github.com/yieldswarm/yieldswarm) to get notified when it ships.

---

## Building an Integration — Walkthrough

Here's a minimal agent that reads YieldSwarm data and acts on it:

```javascript
// A simple agent that monitors YieldSwarm and alerts when fleet drops below 90% online
const THRESHOLD = 0.90;
const POLL_INTERVAL_MS = 60_000;

async function monitorFleet() {
  const resp = await fetch('https://yieldswarm.polsia.app/api/fleet');
  const data = await resp.json();

  const onlinePct = data.summary.online_count / data.summary.total_nodes;

  if (onlinePct < THRESHOLD) {
    console.log(`ALERT: Fleet at ${(onlinePct * 100).toFixed(1)}% online — below ${THRESHOLD * 100}% threshold`);
    // trigger your agent's response here
  }
}

setInterval(monitorFleet, POLL_INTERVAL_MS);
```

---

## Contributing Agent Integrations

If you build something interesting on top of the YieldSwarm API, share it:

1. Add it to the [GitHub Discussions](https://github.com/yieldswarm/yieldswarm/discussions) under "Integrations"
2. Open a PR to add it to this doc under "Community Integrations" below
3. You'll earn **BCCD 1,000 tokens** for a documented, working integration example

---

## Community Integrations

*None yet — be the first.*

---

## API Limits

Public endpoints: 60 requests/minute per IP. No authentication needed.
Authenticated (LLM consensus): 100 requests/hour. Email hello@yieldswarm.com for higher limits.

---

## Questions

- GitHub Issues: [github.com/yieldswarm/yieldswarm/issues](https://github.com/yieldswarm/yieldswarm/issues)
- Discord: linked from the [waitlist page](https://yieldswarm.polsia.app/invest)
- Email: hello@yieldswarm.com
