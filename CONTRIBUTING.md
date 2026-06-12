# Contributing to YieldSwarm

YieldSwarm is open to contributors who want to build real infrastructure that runs real money.

The system generates $17,600+/month across Helium fleets, ZEC mining, and cross-chain DeFi. This is not a toy project. Good contributions get rewarded.

---

## Quick Start

```bash
git clone https://github.com/yieldswarm/yieldswarm.git
cd yieldswarm
npm install
cp .env.example .env
# Set DATABASE_URL to a Neon free tier DB (https://neon.tech — free, takes 30 seconds)
npm run dev
```

The full stack runs locally. No external services are required for most work — the app seeds mock data for fleet, agents, and yield.

---

## What We're Looking For

**High priority** (biggest BCCD bounties):

- **AgentSwarm OS integration API** — REST + webhook endpoints for external agents to subscribe to yield events
- **ZEC mining telemetry improvements** — better dashboards for solo block probability, difficulty trends
- **DeFi protocol adapters** — new protocol stubs for the agent-simulator (Morpho, Euler, Pendle)
- **Referral attribution pipeline** — on-chain wallet linking for referral verification
- **Email drip campaign improvements** — better segmentation, A/B test framework

**Good first issues** (labeled [`good first issue`](https://github.com/yieldswarm/yieldswarm/labels/good%20first%20issue)):

- Fix edge cases in the ZEC price fallback (CoinPaprika → backup source)
- Add pagination to the admin CRM dashboard
- Improve mobile layout on /roi calculator
- Add ELO rating chart to the AI stack page
- Write tests for the referral tier calculation logic

**Open research questions** (documented in [GitHub Discussions](https://github.com/yieldswarm/yieldswarm/discussions)):

- Cross-chain bridge risk scoring model
- DePIN hardware depreciation calculator
- Agent consensus failure modes and recovery

---

## Bounty Program

Contributions earn **BCCD tokens** — YieldSwarm's platform token. BCCD is redeemable for miner purchase discounts, yield share participation, and future governance.

| Contribution type | BCCD reward |
|-------------------|-------------|
| Bug fix (confirmed, with test) | 500 BCCD |
| Good first issue | 250 BCCD |
| New protocol adapter (agent-simulator) | 1,000 BCCD |
| New route or feature (small scope) | 1,000 BCCD |
| Significant feature (large scope) | 2,500–5,000 BCCD |
| Core architecture improvement | Negotiated |
| Security vulnerability (see /security) | 2,500–10,000 BCCD |

### How to claim a bounty

1. Comment on the issue or open a new one — describe what you're going to build
2. We'll confirm the bounty amount before you start (don't build speculatively)
3. Open a PR referencing the issue
4. PR is reviewed, merged, and bounty is credited to your account email within 7 days

To register for bounties, [create an account](https://yieldswarm.polsia.app/account). Your email is how we track BCCD rewards.

---

## Code Standards

**Architecture rules** (same as internal team):

- `server.js` is wiring only — middleware and route mounts, nothing else
- All routes go in `routes/<name>.js` using `express.Router()`
- All DB queries go through named functions in `db/<entity>.js`
- No `pool.query()` in routes. Ever.
- No DDL in runtime files — schema changes go in `migrations/<timestamp>_<name>.sql`
- Every file in `routes/`, `db/`, `services/` opens with a 1–3 line comment: what this module owns, what it does NOT own

**Style**:
- No `console.*` in routes or services — structured logger only
- Comment the WHY, not the WHAT
- Keep route files focused — if a file is handling 2 unrelated domain concerns, split it

---

## Pull Request Process

1. **Open an issue first** if the change is non-trivial. Describe the problem and your proposed approach. Wait for a ✅ before building.
2. **Branch from `main`** — `git checkout -b your-feature-name`
3. **Keep PRs focused** — one thing per PR. Small PRs get reviewed fast.
4. **Write a clear PR description** — what changed, why, how to test it
5. Run the self-check before submitting:

```bash
{ [ -f server.js ] && [ "$(wc -l < server.js)" -gt 300 ] && echo "FAIL: server.js > 300 lines"; } || echo "PASS: server.js LOC"
{ grep -lnE 'new Pool\(|pool\.query\(' $(git ls-files '*.js' | grep -v '^db/') 2>/dev/null && echo "FAIL: raw SQL outside db/"; } || echo "PASS: db/ encapsulation"
```

Both must pass.

---

## Project Areas

| Area | Files | Description |
|------|-------|-------------|
| Agent data | `routes/swarm.js`, `db/agents.js` | ElizaOS agent status, actions, alerts |
| Fleet | `routes/dashboard.js`, `db/fleet.js` | Helium + hardware nodes |
| Mining | `routes/mining.js`, `db/mining.js`, `routes/zec-price.js` | ZEC mining telemetry |
| DeFi | `db/fleet.js` (defi_positions) | Cross-chain protocol positions |
| LLM layer | `routes/model-intelligence.js`, `lib/multi-model-router.js` | ELO-rated model consensus |
| Referrals | `routes/referrals.js`, `db/referrals.js` | 5-tier referral system |
| Shop | `routes/shop.js`, `db/shop.js` | Miner purchase + BCCD rewards |
| Blog | `routes/blog.js`, `db/blog.js` | SEO content engine |
| Membership | `routes/membership.js`, `db/members.js` | DUNA investor subscriptions |

---

## Getting Help

- **GitHub Issues** — for bugs, feature requests, questions about code
- **GitHub Discussions** — for architecture questions, open research, protocol ideas
- **[Discord](https://yieldswarm.polsia.app/invest)** — real-time chat (link on waitlist page)

If you're building something serious and want to talk architecture before writing code, open a Discussion. We'd rather spend 10 minutes aligning up front than review a large PR that's going the wrong direction.

---

## License

By contributing, you agree your contributions are licensed under the MIT License.
