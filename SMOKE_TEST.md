# Smoke Test Checklist

## Server Startup
- [ ] `npm install` completes without errors
- [ ] `node server.js` boots with all phases complete
- [ ] Health endpoint returns `{"status":"ok"}` at `/health`
- [ ] No crash on missing DATABASE_URL (graceful degradation)

## Public Pages
- [ ] `GET /` — Homepage loads with vault stats
- [ ] `GET /yield` — Yield page loads
- [ ] `GET /vaults` — Vaults page loads
- [ ] `GET /mining` — Mining page loads
- [ ] `GET /agents` — Agents page loads
- [ ] `GET /depin` — DePIN page loads

## Admin Panel (Auth Required)
- [ ] `GET /admin` — Redirects to login if no cookie
- [ ] `POST /admin/login` — Accepts ADMIN_SECRET, sets cookie
- [ ] `GET /admin` (authed) — Dashboard with stats bars
- [ ] `GET /admin/council-engine` — 9-LLM voting display
- [ ] `GET /admin/wise-integration` — Wise balance card
- [ ] `GET /admin/blueforge-mining` — Mining fleet status
- [ ] `GET /admin/analytics` — Analytics placeholder
- [ ] `GET /admin/settings` — Environment vars display

## API Endpoints
- [ ] `GET /api/health` — Returns `{status: "ok"}`
- [ ] `GET /api/infrastructure/status` — Infrastructure table
- [ ] `GET /api/wise-integration/balance` — Sandbox balance
- [ ] `GET /api/blueforge-mining/portal` — Portal status

## Admin Accelerator
- [ ] Server-Timing header present on admin pages
- [ ] Cache-Control: private, no-store on admin pages
- [ ] Render time < 500ms for all admin pages

## Akash Deploy Test
- [ ] SDL validates with `akash provider status` or `akash tx deployment create`
- [ ] Container exposes ports 3000, 22, 80
- [ ] Health check passes at `/health`

## TAO Miner (ECS)
- [ ] Bittensor installed: `btcli --version`
- [ ] Wallet created: `ls ~/.bittensor/wallets/`
- [ ] Registered on subnet: `btcli wallet overview`
- [ ] Miner running: `systemctl status tao-miner`

## AI Node (ECS)
- [ ] Ollama installed: `ollama --version`
- [ ] Models pulled: `ollama list`
- [ ] API responding: `curl http://localhost:11434/api/tags`
- [ ] systemd service active: `systemctl status ollama`
