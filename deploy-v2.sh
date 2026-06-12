#!/bin/bash
set -euo pipefail

# ============================================================
# YieldSwarm v2.0 — Akash Deployment from Source
# No pre-built Docker image required. Clones repo at runtime.
# ============================================================

AKASH_BIN="${AKASH_BIN:-/root/.openclaw/workspace/bin/akash}"
SDL_FILE="${1:-akash-deploy-source.yml}"

if ! command -v "$AKASH_BIN" &> /dev/null; then
    echo "Error: akash CLI not found at $AKASH_BIN"
    echo "Install: curl -sL https://raw.githubusercontent.com/akash-network/node/master/install.sh | bash"
    exit 1
fi

if [[ -z "${AKASH_KEY_NAME:-}" ]]; then
    echo "Error: AKASH_KEY_NAME not set"
    echo "Export your key name: export AKASH_KEY_NAME=mykey"
    echo "Or create one: akash keys add mykey"
    exit 1
fi

if [[ ! -f "$SDL_FILE" ]]; then
    echo "Error: SDL file not found: $SDL_FILE"
    exit 1
fi

# Get account address
AKASH_ACCOUNT_ADDRESS=$($AKASH_BIN keys show "$AKASH_KEY_NAME" -a)
echo "Deploying from: $AKASH_ACCOUNT_ADDRESS"

# Create deployment
echo "Creating deployment..."
$AKASH_BIN tx deployment create "$SDL_FILE" \
    --from "$AKASH_KEY_NAME" \
    --chain-id akashnet-2 \
    --node https://rpc.akashnet.net:443 \
    --fees 5000uakt \
    -y

echo "Deployment submitted. Check status:"
echo "  akash query deployment list --from $AKASH_KEY_NAME"
