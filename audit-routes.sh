#!/usr/bin/env bash
# Route status check — Task #2069534 Clickthrough Audit
# Uses curl to verify HTTP status codes

BASE="https://yieldswarm.polsia.app"
OK=0
ERR=0

echo "=== ROUTE STATUS CHECK ==="
echo "| Page | Status | Notes |"
echo "|------|--------|-------|"

check() {
  local path="$1"
  local label="$2"
  local extra="$3"

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE$path" 2>/dev/null || echo "ERR")
  if [ "$status" = "200" ] || [ "$status" = "301" ] || [ "$status" = "302" ]; then
    echo "| $label | $status | OK |"
    ((OK++))
  elif [ "$status" = "ERR" ]; then
    echo "| $label | TIMEOUT | timeout |"
    ((ERR++))
  else
    echo "| $label | $status | NEEDS FIX |"
    ((ERR++))
  fi
}

# 5-tab nav pages
check "/" "Homepage"
check "/earn" "Earn Hub"
check "/governance" "Governance"
check "/team" "Team"
check "/corporate" "Corporate"

# Vaults
check "/vaults" "Vaults Hub"
check "/vault/usdc" "Vault USDC"
check "/vault/sol" "Vault SOL"
check "/vault/ton" "Vault TON"
check "/vault/tao" "Vault TAO"

# Agents
check "/agents" "Agent Directory"
check "/agents/invest" "Agent Invest"

# Arena
check "/arena" "Arena"
check "/admin/arena" "Arena Admin"

# Key pages
check "/bridge" "Bridge"
check "/referrals" "Referrals"
check "/membership" "Membership"
check "/leaderboard" "DeFi Leaderboard"
check "/swarm" "Swarm"
check "/council" "Council Hub"
check "/coin/ysm" "YSM Coin"
check "/raffle" "Raffle"
check "/blog" "Blog"
check "/play" "Play"
check "/pool" "Mining Pool"
check "/defi" "DeFi Dashboard"
check "/transparency" "Transparency"
check "/invest" "Invest"
check "/press" "Press"
check "/security" "Security"
check "/privacy" "Privacy"
check "/terms" "Terms"
check "/docs" "Docs"
check "/tools" "Tools"
check "/shop" "Shop"
check "/token" "Token"
check "/app" "App"
check "/stats" "Stats"

# Additional important pages
check "/subscribe" "Subscribe"
check "/onboarding" "Onboarding"
check "/signup" "Signup"
check "/rng" "RNG Payment"
check "/admin/blueforge-mining" "BlueForge Mining"
check "/admin/swarm-ys-monitor" "Swarm YS Monitor"
check "/admin/swarm-coins" "Swarm Coins"
check "/admin/twitter-cycle" "Twitter Cycle"
check "/admin/vault-subscriptions" "Vault Subscriptions"
check "/admin/agent-wallets-v3" "Agent Wallets V3"
check "/admin/lp-claims" "LP Claims"
check "/admin/investor-capital" "Investor Capital"
check "/admin/raise" "Raise Rails"
check "/admin/kimi-claw" "Kimi Claw"
check "/admin/pump-sniper" "Pump Sniper"
check "/sunset-bridge" "Sunset Bridge"
check "/ton" "TON"
check "/partnerships" "Partnerships"
check "/join" "Telegram Join"

echo ""
echo "Summary: $OK pages OK, $ERR need attention"