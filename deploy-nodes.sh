#!/usr/bin/env bash
# YieldSwarm — Deploy Agent Nodes to Nebius GPU Cluster
# Usage: ./deploy-nodes.sh <node_ip> [agent_type]
# Last updated: 2026-05-22
#
# Steps:
#   1. SSH to Nebius GPU node
#   2. Pull latest YieldSwarm agent Docker image
#   3. Start ElizaOS runtime for MultiMining agents
#   4. Wire into Alchemy SOL Mainnet endpoint
#   5. Report wallet address back to Council

set -euo pipefail

NODE_IP="${1:?Usage: $0 <node_ip> [agent_type]}"
AGENT_TYPE="${2:-ELITE_SCOUT}"
SSH_KEY="${NEBULUS_SSH_KEY_PATH:-~/.ssh/yieldswarm_nebius}"
REGISTRY="ghcr.io/polsia-inc/yieldswarm-agents"
TAG="${AGENT_IMAGE_TAG:-latest}"
SITE_URL="${SITE_URL:-https://yieldswarm.polsia.app}"

echo "═══════════════════════════════════════════════"
echo "  YieldSwarm Node Deploy — ${AGENT_TYPE}"
echo "  Target: ${NODE_IP}"
echo "  Image:  ${REGISTRY}:${TAG}"
echo "═══════════════════════════════════════════════"

# ─────────────────────────────────────────
# 1. Health check — is node reachable?
# ─────────────────────────────────────────
echo "[1/5] Checking node connectivity..."
ssh -i "${SSH_KEY}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    "ubuntu@${NODE_IP}" "echo 'Node reachable ✓'"

# ─────────────────────────────────────────
# 2. Pull latest agent Docker image
# ─────────────────────────────────────────
echo "[2/5] Pulling agent image..."
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "ubuntu@${NODE_IP}" \
    "docker pull ${REGISTRY}:${TAG} && echo 'Image pulled ✓'"

# ─────────────────────────────────────────
# 3. Stop existing agent container (if any)
# ─────────────────────────────────────────
echo "[3/5] Stopping existing agent container..."
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "ubuntu@${NODE_IP}" \
    "docker stop yieldswarm-agent 2>/dev/null || true && docker rm yieldswarm-agent 2>/dev/null || true && echo 'Container cleared ✓'"

# ─────────────────────────────────────────
# 4. Start ElizaOS runtime for MultiMining
# ─────────────────────────────────────────
echo "[4/5] Starting ElizaOS agent runtime..."
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "ubuntu@${NODE_IP}" \
    "docker run -d \
      --name yieldswarm-agent \
      --restart unless-stopped \
      --gpus all \
      -e AGENT_TYPE=${AGENT_TYPE} \
      -e SOLANA_MAINNET_RPC=${SOLANA_MAINNET_RPC:-https://api.mainnet-beta.solana.com} \
      -e ALCHEMY_API_KEY=${ALCHEMY_API_KEY:-} \
      -e WALLET_ENCRYPTION_KEY=${WALLET_ENCRYPTION_KEY:-} \
      -e COUNCIL_TELEGRAM_BOT_TOKEN=${COUNCIL_TELEGRAM_BOT_TOKEN:-} \
      -e SITE_URL=${SITE_URL} \
      -p 3001:3001 \
      ${REGISTRY}:${TAG} && echo 'Agent started ✓'"

# ─────────────────────────────────────────
# 5. Report wallet address back to Council
# ─────────────────────────────────────────
echo "[5/5] Reporting wallet to Council..."
AGENT_WALLET=$(ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "ubuntu@${NODE_IP}" \
    "docker exec yieldswarm-agent node -e \"
      const { getAgentWallet } = require('./lib/wallet');
      getAgentWallet('${AGENT_TYPE}').then(w => console.log(w.address));
    \" 2>/dev/null || echo 'wallet-pending'")

# POST wallet address to YieldSwarm Council API
curl -s -X POST "${SITE_URL}/api/agents/council/register-node" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: ${DISCORD_INTERNAL_SECRET:-}" \
  -d "{
    \"agent_type\": \"${AGENT_TYPE}\",
    \"node_ip\": \"${NODE_IP}\",
    \"wallet_address\": \"${AGENT_WALLET}\",
    \"deployed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"image\": \"${REGISTRY}:${TAG}\"
  }" || echo "Council registration deferred (API may not be live)"

echo "═══════════════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "  Agent:  ${AGENT_TYPE}"
echo "  Node:   ${NODE_IP}"
echo "  Wallet: ${AGENT_WALLET}"
echo "═══════════════════════════════════════════════"
