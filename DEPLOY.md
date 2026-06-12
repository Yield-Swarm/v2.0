# YieldSwarm v2.0 — Akash Deployment Guide

## What Was Built

### Core Server
- `server.js` — Express entry point, boots successfully, all routes mount
- `db/index.js` — PostgreSQL connection with graceful degradation (works without DB_URL)
- `middleware/` — 7 middleware files: rate-limiter, security-headers, i18n, compress, admin-accelerator, runic-decoder, env-badge, council-engine, council-auth, cx-privacy-filter, maintenance, memory-pressure, ouroboros-cache
- `routes/` — 14 route handlers: admin, account, audit, blueforge-mining, ci-status, council-engine-protocol, download, franchise-webhook, invest, marketing, shop, telegram-swarm, wise-integration, yield-optimizer
- `services/` — boot-manager, env-config, helix-optimizer, startup-migrate, admin-ws, runic-dsl-engine
- `lib/` — memory-guard, sentry, startup-guard, homepage-handler, network-banner, broadcast-helix, council-engine-protocol
- `views/` — 15 EJS templates: homepage, admin dashboard, admin sub-pages (council, wise, blueforge, analytics, settings), yield, vaults, mining, agents, depin, depin-download, error, 404

### Admin Panel
- `/admin` — Dashboard with stats (health, yield, agents, mining, cloud cost, council reviews)
- `/admin/council-engine` — 9-LLM weighted voting display (Odin, Thor, Freya, Heimdall, White Hat, Loki, Perplexity, Cybersecurity, Bifröst)
- `/admin/wise-integration` — Wise balance + ZEC converter
- `/admin/blueforge-mining` — Mining fleet status + portal lock
- `/admin/analytics` — Traffic + revenue tracking (placeholder)
- `/admin/settings` — Environment variable display
- Auth via `ADMIN_SECRET` env var (cookie-based, 24h TTL)

### Docker & Akash
- `Dockerfile.api` — Node 20 Alpine, healthcheck on `/health`, 460MB heap limit
- `akash-deploy.yml` — SDL manifest for Akash deployment
  - App: 1 vCPU, 2GB RAM, 20GB storage (~$58/month)
  - PostgreSQL: 0.5 vCPU, 1GB RAM, 20GB persistent storage (~$29/month)
  - Total: ~$87/month (fits in $120 budget)
  - Domain: `defiswarmagents.com` and `defiswarmagents.info`
- `.github/workflows/docker.yml` — GitHub Actions workflow to build/push to `ghcr.io`

### Files Added
- 47 new files created from scratch (routes, services, middleware, views, db, lib, admin, Docker, SDL, CI)
- 1 fix: `memory-guard.js` `.unref()` compatibility
- 1 wrapper: `sentry.server.config.js` re-exports from `lib/`

## Deploy Steps

### 1. Build & Push Docker Image

Option A — GitHub Actions (recommended):
```bash
cd yieldswarm-v2
git push origin main
# GitHub Actions builds and pushes to ghcr.io/yield-swarm/v2.0:latest
```

Option B — Local build (requires Docker):
```bash
cd yieldswarm-v2
docker build -f Dockerfile.api -t ghcr.io/yield-swarm/v2.0:latest .
docker push ghcr.io/yield-swarm/v2.0:latest
```

### 2. Set Secrets on Akash

```bash
akash tx deployment create akash-deploy.yml \
  --from $AKASH_KEY_NAME \
  --chain-id akashnet-2 \
  --fees 5000uakt
```

Then set secrets via Akash deployment update or provider env:
- `DATABASE_URL=postgres://yieldswarm:PASSWORD@db:5432/yieldswarm`
- `ADMIN_SECRET=your-admin-secret`
- `ADMIN_ACCESS_TOKEN=your-bypass-token`
- `SENTRY_DSN=` (optional)
- `GA4_MEASUREMENT_ID=` (optional)
- `RESEND_API_KEY=` (optional)
- `AGENTMAIL_API_KEY=` (optional)
- `WISE_API_KEY=` (optional)

### 3. Update DNS

After Akash provider assigns an IP, update the A record in Unstoppable Domains for `defiswarmagents.com` to the new Akash provider IP.

Current: `34.42.100.71` (GCP VM)
New: Akash provider IP (assigned after deployment)

### 4. Verify

```bash
curl https://defiswarmagents.com/health
curl https://defiswarmagents.com/admin
```

## Cost Estimate

| Component | Resources | uakt/hr | Monthly |
|-----------|-----------|---------|---------|
| App | 1vCPU, 2GB, 20GB | 8,000 | ~$58 |
| DB | 0.5vCPU, 1GB, 20GB | 4,000 | ~$29 |
| **Total** | | **12,000** | **~$87** |

At $120 credit, this leaves ~$33 buffer for burst or scaling.

## Next Steps

1. **Push to GitHub** — Set up auth token or SSH key, then `git push origin main`
2. **Build image** — Trigger GitHub Actions or build locally
3. **Deploy to Akash** — Use `akash-deploy.yml` SDL
4. **Update DNS** — Point Unstoppable Domains A record to Akash IP
5. **Set admin files** — Upload any custom admin files you want to `admin/` directory

## GitHub Auth Fix

To push from this environment, add a GitHub token:
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/Yield-Swarm/v2.0.git
git push origin main
```
