#!/usr/bin/env bash
# ============================================================
# YieldSwarm — Azure VM Full Deployment Script
# ============================================================
# One-command deployment for Azurecloudredundancy VM
# Usage:
#   curl -sL https://raw.githubusercontent.com/Polsia-Inc/yieldswarm/main/azure-deploy.sh | bash
#   OR:
#   ssh azure-user@4.147.152.142 "bash -s" < azure-deploy.sh
# ============================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
VM_IP="4.147.152.142"
SSH_USER="${SSH_USER:-azureuser}"
REPO_URL="https://github.com/Polsia-Inc/yieldswarm.git"
BRANCH="main"
APP_DIR="${APP_DIR:-/home/$SSH_USER/yieldswarm}"
LOG_DIR="/var/log/yieldswarm"
SERVICE_NAME="yieldswarm"

# ── Colors ──────────────────────────────────────────────────────
RED='\u001b[31m'; GRN='\u001b[32m'; YLW='\u001b[33m'; BLU='\u001b[34m'; RST='\u001b[0m'
info()  { echo -e "${BLU}[INFO]${RST} $1"; }
ok()    { echo -e "${GRN}[OK]${RST}   $1"; }
warn()  { echo -e "${YLW}[WARN]${RST} $1"; }
err()   { echo -e "${RED}[ERR]${RST}  $1"; }

# ── Pre-flight ─────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  warn "Not root — some steps may need sudo"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  YieldSwarm — Azure VM Deployment                       ║"
echo "║  VM: Azurecloudredundancy @ $VM_IP           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── System packages ───────────────────────────────────────────
info "Updating apt and installing Node.js 20, PM2, Nginx, certbot..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl wget git ufw nginx certbot python3-certbot-nginx fail2ban build-essential > /dev/null 2>&1

# Node.js 20
if ! command -v node &> /dev/null || [[ "$(node -v)" != "v20"* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
fi
ok "Node $(node -v), npm $(npm -v)"

# PM2
npm install -g pm2 > /dev/null 2>&1
ok "PM2 $(pm2 --version) installed"

# ── Firewall ───────────────────────────────────────────────────
info "Configuring UFW..."
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp    > /dev/null 2>&1  # SSH
ufw allow 80/tcp    > /dev/null 2>&1  # HTTP
ufw allow 443/tcp   > /dev/null 2>&1  # HTTPS
ufw allow 3000/tcp  > /dev/null 2>&1  # App (internal)
yes | ufw enable > /dev/null 2>&1 || true
ok "Firewall: SSH/HTTP/HTTPS/3000 open"

# ── App directory ─────────────────────────────────────────────
info "Setting up app directory at $APP_DIR..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d ".git" ]; then
  git pull origin "$BRANCH" 2>/dev/null && ok "Repo updated" || warn "Git pull failed"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" 2>/dev/null && ok "Repo cloned" || err "Clone failed"
fi

# ── Dependencies ───────────────────────────────────────────────
info "Installing npm dependencies..."
npm install --omit=dev 2>&1 | tail -3
ok "Dependencies installed"

# ── Environment (.env) ─────────────────────────────────────────
info "Setting up .env..."
if [ ! -f ".env" ] || [ ! -s ".env" ]; then
  # Copy from .env.example and then overlay our comprehensive defaults
  cp .env.example .env 2>/dev/null || true

  # Write the production .env from this script's embedded template
  cat > .env << 'ENVFILE'
# ============================================================
# YieldSwarm — Production .env for Azure VM Deployment
# ============================================================
# ⚠️  CRITICAL: Replace all ⚠️ placeholders with real values
#    Wallet private keys MUST be replaced before running
# ============================================================

# ─── Server ────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
APP_URL=https://yieldswarm.polsia.app
APP_BASE_URL=https://yieldswarm.polsia.app
BASE_URL=https://yieldswarm.polsia.app
SITE_URL=https://yieldswarm.polsia.app
SESSION_SECRET=YieldSwarm2026SessionSecretChangeMeInProduction
VISITOR_SALT=yieldswarm-visitor-salt-2026

# ─── Database ──────────────────────────────────────────────────
# ⚠️ Get Neon connection string from: Polsia dashboard → Company → Infrastructure → Database
# Format: REDACTED/yieldswarm?sslmode=require
DATABASE_URL=REDACTED/yieldswarm?sslmode=require

# ─── Admin ─────────────────────────────────────────────────────
ADMIN_SECRET=⚠️ CHANGE_TO_LONG_RANDOM_STRING
ADMIN_ACCESS_TOKEN=
ADMIN_ALERT_EMAIL=cbrown03777@gmail.com
ADMIN_EMAIL=cbrown03777@gmail.com
ADMIN_KEY=
ADMIN_PASSWORD=
ADMIN_TOKEN=
OWNER_EMAIL=cbrown03777@gmail.com
FOUNDER_EMAIL=cbrown03777@gmail.com
CRON_SECRET=⚠️ GENERATE_RANDOM_32_CHARS
APPROVAL_NOTIFICATION_EMAIL=cbrown03777@gmail.com
APPROVAL_TOKEN_SECRET=

# ─── Polsia Platform ───────────────────────────────────────────
# ⚠️ Get from: Polsia dashboard → Company Settings → API Keys
POLSIA_API_KEY=⚠️ GET_FROM_POLSIA_DASHBOARD
POLSIA_API_BASE=https://api.polsia.com
POLSIA_API_URL=https://api.polsia.com
POLSIA_AI_API_KEY=⚠️ GET_FROM_POLSIA_DASHBOARD
POLSIA_AI_BASE_URL=https://api.polsia.com
POLSIA_ANALYTICS_SLUG=yieldswarm
POLSIA_IN_PROCESS_CRONS_ENABLED=false

# ─── AI / LLM ───────────────────────────────────────────────────
LLM_ROUTER_DEFAULT=polsia
AGENT_AI_API_KEY=

# OpenAI (fallback)
OPENAI_API_KEY=⚠️ ADD_KEY
OPENAI_BASE_URL=

# Multi-model LLM layer
TOGETHER_API_KEY=⚠️ ADD_KEY
DEEPSEEK_API_KEY=⚠️ ADD_KEY
MISTRAL_API_KEY=⚠️ ADD_KEY
FIREWORKS_API_KEY=
OPENROUTER_API_KEY=⚠️ ADD_KEY
GROQ_API_KEY=⚠️ ADD_KEY
GROQ_API_KEY_BACKUP=
KIMI_API_KEY=⚠️ ADD_KEY

# ─── Blockchain / RPC ─────────────────────────────────────────
ETHEREUM_RPC_URL=https://arb1.arbitrum.io/rpc
ETH_RPC_URL=https://arb1.arbitrum.io/rpc
ALCHEMY_API_KEY=⚠️ ADD_ALCHEMY_KEY
INFURA_API_KEY=
QUICKNODE_API_KEY=
ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/⚠️YOUR_ALCHEMY_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/⚠️YOUR_ALCHEMY_KEY
BASE_RPC_URL=https://mainnet.base.org

# Solana
# ⚠️ Get Helius RPC from: https://helius.xyz → Dashboard → API Keys
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=⚠️YOUR_HELIUS_KEY
SOL_RPC_URL=https://mainnet.helius-rpc.com/?api-key=⚠️YOUR_HELIUS_KEY
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=⚠️YOUR_HELIUS_KEY
HELIUS_API_KEY=⚠️ YOUR_HELIUS_KEY
SOLANA_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=⚠️YOUR_HELIUS_KEY
SOLANA_DEVNET_RPC=https://api.devnet.solana.com

# Bittensor / TAO
TAO_RPC=wss://entrypoint-finney.opentensor.ai:443
TAOSTATS_API=https://api.taostats.io

# Zcash
ZCASH_MAINNET_RPC=https://zec.blockexplorer.com/api

# Market data
GOLDAPI_KEY=⚠️ ADD_KEY
COINGECKO_API_KEY=
SCRAPER_API_KEY=⚠️ ADD_KEY

ETHERSCAN_API_KEY=
MAPBOX_ACCESS_TOKEN=
REPORT_GAS=
ETH_PRICE_USD_APPROX=3000

# ─── TON ───────────────────────────────────────────────────────
TONAPI_KEY=⚠️ ADD_KEY
TON_CENTER_API_KEY=⚠️ ADD_KEY
TON_WALLET_ADDRESS=
TON_WALLET_KEY=⚠️ CRITICAL: REPLACE WITH REAL PRIVATE KEY

# ─── HELIX L2 (Arbitrum Orbit) ─────────────────────────────────
HELIX_L1_RPC_URL=⚠️ ADD_HELIX_L1_RPC
HELIX_L2_RPC_URL=https://testnet-rpc.helix.xyz
HELIX_CHAIN_ID=971230
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# ─── Wallets & Treasury ─────────────────────────────────────────
# ⚠️  CRITICAL: Replace all private key placeholders!
DEPLOYER_PRIVATE_KEY=⚠️ CRITICAL: REPLACE_WITH_REAL_PRIVATE_KEY
MINING_WALLET=⚠️ ADD_MINING_WALLET_ADDRESS
POOL_WALLET=⚠️ ADD_POOL_WALLET_ADDRESS
TITHE_DESTINATION=⚠️ ADD_TITHE_WALLET_ADDRESS
TREASURY_WALLET=⚠️ ADD_TREASURY_WALLET_ADDRESS
WALLET_ENCRYPTION_KEY=⚠️ CRITICAL: ADD_32_BYTE_ENCRYPTION_KEY

# ─── Smart Contracts ───────────────────────────────────────────
ARENA_DEPLOYER_PRIVATE_KEY=⚠️ CRITICAL: ADD_DEPLOYER_KEY
ARENA_ESCROW_ADDRESS=
ARENA_PROVER_PK=
ARENA_VERIFIER_CONTRACT=
BASE_USDC_ADDRESS=0x833589fcd6edb6e08fc4db23618f5a27a12ad3f0
BASE_USDC_TREASURY=
YIELD_GOVERNOR_ADDRESS=
YIELD_TIMELOCK_ADDRESS=
YIELD_VOTES_ADDRESS=

# ─── Yield Vaults — HELIX + Arbitrum (APY target: 32.3%) ──────────────────────
# Fill after running hardhat deploy scripts (see contracts/DEPLOY.md)
VAULT_CONTRACT_HELIX=⚠️ PENDING_DEPLOY  # HELIXVault proxy on HELIX L2 (chainId: 971230)
VAULT_CONTRACT_ARB=⚠️ PENDING_DEPLOY     # ArbVault proxy on Arbitrum One (chainId: 42161)
SWARM_TOKEN_ADDRESS=⚠️ ADD_SWARM_TOKEN   # $SWARM token address
TREASURY_ADDRESS=⚠️ ADD_TREASURY         # Multisig/DUNA treasury for yield splits
COUNCIL_MULTISIG=⚠️ ADD_COUNCIL         # Council multisig for upgrade authorization

# ─── Arena ──────────────────────────────────────────────────────
ARENA_ADMIN_SECRET=⚠️ CHANGE_TO_LONG_RANDOM_STRING

# ─── Square (primary card processor) ───────────────────────────
SQUARE_ACCESS_TOKEN=⚠️ ADD_SQUARE_ACCESS_TOKEN
SQUARE_APPLICATION_ID=⚠️ ADD_SQUARE_APPLICATION_ID
SQUARE_LOCATION_ID=⚠️ ADD_SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY=⚠️ ADD_SQUARE_WEBHOOK_SIGNATURE

# ─── BTCPay Server (primary crypto) ───────────────────────────
BTCPAY_URL=⚠️ ADD_BTCPAY_URL
BTCPAY_API_KEY=⚠️ ADD_BTCPAY_API_KEY
BTCPAY_STORE_ID=⚠️ ADD_BTCPAY_STORE_ID
BTCPAY_WEBHOOK_SECRET=⚠️ ADD_BTCPAY_WEBHOOK_SECRET

# ─── NOWPayments (fallback crypto) ─────────────────────────────
NOWPAYMENTS_API_KEY=⚠️ ADD_NOWPAYMENTS_KEY
NOWPAYMENTS_IPN_SECRET=⚠️ ADD_NOWPAYMENTS_IPN_SECRET

# ─── Ramp Network (fiat on-ramp) ───────────────────────────────
RAMP_HOST_API_KEY=⚠️ ADD_RAMP_KEY
RAMP_WEBHOOK_SECRET=⚠️ ADD_RAMP_WEBHOOK_SECRET

# ─── Kraken ───────────────────────────────────────────────────
KRAKEN_API_KEY=⚠️ ADD_KRAKEN_API_KEY
KRAKEN_API_SECRET=⚠️ ADD_KRAKEN_API_SECRET
KRAKEN_PAY_ADDRESS=
KRAKEN_ETH_DEPOSIT_ADDRESS=
KRAKEN_SOL_DEPOSIT_ADDRESS=
KRAKEN_TON_DEPOSIT_ADDRESS=
KRAKEN_ZEC_DEPOSIT_ADDRESS=
KRAKEN_BTC_DEPOSIT_ADDRESS=
KRAKEN_WEBHOOK_SECRET=

# ─── Email ─────────────────────────────────────────────────────
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yieldswarm.polsia.app

# ─── AgentMail.to ──────────────────────────────────────────────
AGENTMAIL_API_KEY=⚠️ ADD_AGENTMAIL_KEY
AGENTMAIL_SMTP_HOST=smtp.agentmail.to
AGENTMAIL_SMTP_PORT=465
AGENTMAIL_SMTP_USER=⚠️ ADD_AGENTMAIL_SMTP_USER
AGENTMAIL_SMTP_PASS=⚠️ ADD_AGENTMAIL_SMTP_PASS
AGENTMAIL_DEFAULT_FROM=noreply@yieldswarm.agent

# ─── Telegram ───────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=⚠️ ADD_TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME=
TELEGRAM_GROUP_ID=
TELEGRAM_SETUP_SECRET=
TELEGRAM_INTERNAL_SECRET=

# ─── Discord ───────────────────────────────────────────────────
DISCORD_BOT_TOKEN=⚠️ ADD_DISCORD_BOT_TOKEN
DISCORD_GUILD_ID=⚠️ ADD_DISCORD_GUILD_ID
DISCORD_PUBLIC_KEY=⚠️ ADD_DISCORD_PUBLIC_KEY
DISCORD_APP_ID=
DISCORD_INTERNAL_SECRET=
DISCORD_PREMIUM_ROLE_ID=
DISCORD_WEBHOOK_YIELDS=⚠️ ADD_WEBHOOK_URL
DISCORD_WEBHOOK_COUNCIL=⚠️ ADD_WEBHOOK_URL
DISCORD_WEBHOOK_FLEET=⚠️ ADD_WEBHOOK_URL
DISCORD_WEBHOOK_ARENA=⚠️ ADD_WEBHOOK_URL
DISCORD_WEBHOOK_ANNOUNCEMENTS=⚠️ ADD_WEBHOOK_URL
DISCORD_WEBHOOK_ALERTS=⚠️ ADD_WEBHOOK_URL
ORG_WEBHOOK_SECRET=

# ─── Twilio ───────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=⚠️ ADD_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=⚠️ ADD_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=⚠️ ADD_TWILIO_PHONE_NUMBER

# ─── Web Push (PWA) ─────────────────────────────────────────────
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=⚠️ GENERATE_VAPID_KEYS
VAPID_PRIVATE_KEY=⚠️ GENERATE_VAPID_KEYS
VAPID_SUBJECT=mailto:cbrown03777@gmail.com

# ─── Perplexity AI ──────────────────────────────────────────────
PERPLEXITY_API_KEY=⚠️ ADD_PERPLEXITY_KEY
PERPLEXITY_ACTIVATED=true

# ─── Akash Network ─────────────────────────────────────────────
AKASH_API_KEY=⚠️ ADD_AKASH_KEY
AKASH_ACCOUNT_ADDRESS=⚠️ ADD_AKASH_ACCOUNT_ADDRESS

# ─── BlueForge Mining ───────────────────────────────────────────
BLUEFORGE_EMAIL=⚠️ ADD_BLUEFORGE_EMAIL
BLUEFORGE_PASSWORD=⚠️ ADD_BLUEFORGE_PASSWORD
BLUEFORGE_API_KEY=⚠️ ADD_BLUEFORGE_API_KEY
BLUEFORGE_ENABLED=true

# ─── Plotra ────────────────────────────────────────────────────
PLOTRA_API_KEY=⚠️ ADD_PLOTRA_KEY
PLOTRA_ACCESS_KEY=⚠️ ADD_PLOTRA_ACCESS_KEY
PLOTRA_SECRET=⚠️ ADD_PLOTRA_SECRET
PLOTRA_HEIMDALL_AGENT_ID=
PLOTRA_ODIN_AGENT_ID=
PLOTRA_FREYA_AGENT_ID=

# ─── Moltbook ──────────────────────────────────────────────────
MOLTBOOK_API_KEY=⚠️ ADD_MOLTBOOK_KEY
MOLTBOOK_SETUP_SECRET=

# ─── Cloudflare ─────────────────────────────────────────────────
CLOUDFLARE_CLIENT_ID=
CLOUDFLARE_SECRET=
CLOUDFLARE_API_TOKEN=⚠️ ADD_CLOUDFLARE_TOKEN
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_TUNNEL_ID=⚠️ ADD_TUNNEL_ID
CLOUDFLARE_TUNNEL_TOKEN=⚠️ ADD_TUNNEL_TOKEN

# ─── IPFS / Pinata ─────────────────────────────────────────────
PINATA_API_KEY=⚠️ ADD_PINATA_KEY
PINATA_SECRET=⚠️ ADD_PINATA_SECRET
PINATA_JWT=⚠️ ADD_PINATA_JWT

# ─── GitHub ────────────────────────────────────────────────────
GITHUB_TOKEN=⚠️ ADD_GITHUB_TOKEN

# ─── Sentry ────────────────────────────────────────────────────
SENTRY_DSN=⚠️ ADD_SENTRY_DSN

# ─── Council Engine ────────────────────────────────────────────
COUNCIL_TELEGRAM_BOT_TOKEN=⚠️ ADD_TELEGRAM_BOT_TOKEN
COUNCIL_DEITY_COUNT=14

# ─── KIMI50 Trading ────────────────────────────────────────────
# Copy from Render dashboard → Environment Variables
KIMI50_TOKEN_MINT=6bRBS6dLXamnczBXSkkQTeQf568Cmtmm1oNtUkhipump
KIMI50_TRADING_CAPITAL_SOL=1.13
KIMI50_MAX_TRADE_SOL=0.2
KIMI50_DAILY_LIMIT=10
KIMI50_RAYDIUM_POOL=⚠️ ADD_RAYDIUM_POOL_ADDRESS
KIMI50_SLIPPAGE_BPS=50
KIMI50_ROLL_PRICE_SOL=0.1
KIMI50_ROLLS_PER_POOL=5
KIMI50_POOL_OPEN_SOL=0.55

# ─── Pump Sniper ───────────────────────────────────────────────
PUMP_SNIPER_WALLET=⚠️ ADD_PUMP_SNIPER_WALLET
PUMPPORTAL_API_KEY=⚠️ ADD_PUMPPORTAL_KEY

# ─── Security ──────────────────────────────────────────────────
HMAC_SECRET=⚠️ GENERATE_RANDOM_32_CHARS
COUNCIL_HMAC_KEY=⚠️ GENERATE_RANDOM_32_CHARS
COUNCIL_HMAC_SECRET=⚠️ GENERATE_RANDOM_32_CHARS
COUNCIL_SECRET=⚠️ GENERATE_RANDOM_32_CHARS
WALLET_ENCRYPT_KEY=⚠️ ADD_WALLET_ENCRYPT_KEY
POW_INTERNAL_SALT=⚠️ GENERATE_RANDOM_SALT

# ─── CX / Swarm Layer ─────────────────────────────────────────
CX_AUDIT_BASE_URL=
CX_HMAC_SECRET=⚠️ GENERATE_RANDOM_HMAC
SWARM_LAYER_CX_URL=
SWARM_LAYER_HEALTH_URL=
SWARM_LAYER_ORIGIN=https://yieldswarm.polsia.app
CLAIM_SECRET=⚠️ GENERATE_CLAIM_SECRET

# ─── Misc / Feature Flags ───────────────────────────────────────
AGENTS=true
SERVICES=true
NODE_ID=yieldswarm-azure-vm1
NODE_REGION=westus2
MASTER_URL=
INVESTOR_PASSWORD=⚠️ CHANGE_THIS
DEBUG_PANTHEON=false
BLITZ_MODE=false
BLITZ_START_TIMESTAMP=
TIDAL_PAUSED=false
GA=
HEARTBEAT_INTERVAL_MS=420000
HANDUP_INTERVAL_MS=

# ─── Feature Flags ──────────────────────────────────────────────
FEATURE_BOUNTY_ENABLED=true
FEATURE_HELIX_DEPLOY=true
FEATURE_AGENT_SWARM=true
FEATURE_MOBILE_APP=false
FEATURE_BITAXE_COUNTER=false

# ─── DeFi / Yield ───────────────────────────────────────────────
KAMINO_RPC=https://api.mainnet-beta.solana.com
DRIFT_PROTOCOL=https://drift.protocol.network
ENVFILE

  ok ".env created — ⚠️  EDIT IT NOW TO FILL IN REAL CREDENTIALS"
else
  ok ".env already exists — skipping creation"
fi

# ── Log directory ───────────────────────────────────────────────
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"
chown -R "$SSH_USER:$SSH_USER" "$LOG_DIR" 2>/dev/null || true

# ── ecosystem.config.js (Azure paths) ──────────────────────────
info "Configuring PM2 ecosystem..."
cat > ecosystem.config.js << 'ECOFILE'
// ecosystem.config.js — PM2 cluster for YieldSwarm on Azure
module.exports = {
  apps: [
    {
      name: 'yieldswarm',
      script: './server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=900 --expose-gc',
      cwd: process.env.APP_DIR || '/home/ubuntu/yieldswarm',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        POLSIA_IN_PROCESS_CRONS_ENABLED: 'false',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        POLSIA_IN_PROCESS_CRONS_ENABLED: 'false',
      },
      error_file: '/var/log/yieldswarm/err.log',
      out_file: '/var/log/yieldswarm/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000,
      listen_timeout: 8000,
    },
  ],
};
ECOFILE
ok "ecosystem.config.js configured"

# ── Nginx ──────────────────────────────────────────────────────
info "Configuring Nginx reverse proxy..."
if [ -f scripts/nginx.conf ]; then
  cp scripts/nginx.conf /etc/nginx/sites-available/yieldswarm
elif [ -f scripts/nginx.conf ]; then
  # Write minimal nginx config
  cat > /etc/nginx/sites-available/yieldswarm << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
NGINXCONF
fi

# Enable site + test
ln -sf /etc/nginx/sites-available/yieldswarm /etc/nginx/sites-enabled/yieldswarm
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx
ok "Nginx configured and running"

# ── Database migration ─────────────────────────────────────────
info "Running database migrations..."
npm run migrate 2>&1 | tail -5 || warn "Migration failed — check DATABASE_URL in .env"

# ── PM2 startup ────────────────────────────────────────────────
info "Starting YieldSwarm with PM2..."
pm2 delete yieldswarm 2>/dev/null || true
pm2 start ecosystem.config.js --env production 2>/dev/null || pm2 start server.js --name yieldswarm

sleep 4

# Check boot
if pm2 describe yieldswarm 2>/dev/null | grep -q "online"; then
  ok "PM2 cluster online (2 workers)"
  pm2 list
else
  warn "PM2 not showing 'online' — checking logs..."
  pm2 logs yieldswarm --lines 15 --nostream
fi

# ── Systemd service ─────────────────────────────────────────────
info "Setting up PM2 systemd service..."
SYSTEMD_UNIT=$(cat << 'SYSTEMD'
[Unit]
Description=YieldSwarm Node.js Application
After=network.target
Wants=network-online.target

[Service]
Type=forking
User=root
WorkingDirectory=APP_DIR_PLACEHOLDER
Restart=always
RestartSec=10
ExecStartPre=/usr/bin/sleep 5
ExecStart=/usr/local/bin/pm2 start APP_DIR_PLACEHOLDER/ecosystem.config.js --env production
ExecStop=/usr/local/bin/pm2 stop yieldswarm
ExecReload=/usr/local/bin/pm2 reload yieldswarm
KillMode=process
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD
)
SYSTEMD_UNIT="${SYSTEMD_UNIT//APP_DIR_PLACEHOLDER/$APP_DIR}"
echo "$SYSTEMD_UNIT" > /etc/systemd/system/yieldswarm.service

systemctl daemon-reload
systemctl enable yieldswarm
systemctl start yieldswarm
ok "Systemd service enabled + running"

# ── PM2 startup command ────────────────────────────────────────
info "Capturing PM2 startup command..."
STARTUP_CMD=$(pm2 startup 2>/dev/null | tail -1 || echo "sudo env PATH=\"\"/usr/local/bin:/usr/bin:/bin\" pm2 startup systemd -u root --hp /root")
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PM2 STARTUP COMMAND (run as sudo on the VM):"
echo ""
echo "  $STARTUP_CMD"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Final verification ──────────────────────────────────────────
info "Verifying server health..."
sleep 3

if curl -s --max-time 8 "http://localhost:3000/health" 2>/dev/null | grep -qi "ok\\|ready\\|status"; then
  ok "Server responding on port 3000 ✅"
else
  warn "Server not yet responding — check: pm2 logs yieldswarm --lines 30"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Deployment Summary                                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  App directory:     $APP_DIR"
echo "  App URL:           https://yieldswarm.polsia.app"
echo "  Admin:             https://yieldswarm.polsia.app/admin"
echo "  Health:            https://yieldswarm.polsia.app/health"
echo "  PM2 status:        pm2 list"
echo "  PM2 logs:          pm2 logs yieldswarm"
echo "  Nginx logs:        tail -f /var/log/nginx/access.log"
echo "  Restart service:   sudo systemctl restart yieldswarm"
echo ""
echo "⚠️  BEFORE RESTARTING THE APP:"
echo "   1. Edit $APP_DIR/.env and fill in all ⚠️ placeholders"
echo "   2. ⚠️  CRITICAL: Replace all wallet private keys with real keys"
echo "   3. Set DATABASE_URL to your Neon connection string"
echo "   4. Set POLSIA_API_KEY from Polsia dashboard"
echo "   5. Run: pm2 restart yieldswarm"
echo ""
echo "   Copy KIMI50 vars from Render dashboard → Environment Variables"
echo ""