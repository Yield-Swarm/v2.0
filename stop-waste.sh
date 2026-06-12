#!/bin/bash
set -euo pipefail

# ============================================================
# YieldSwarm — Stop Mining Waste
# ============================================================

AKASH_BIN="${AKASH_BIN:-/root/.openclaw/workspace/bin/akash}"

if ! command -v "$AKASH_BIN" &> /dev/null; then
    echo "Error: akash CLI not found"
    exit 1
fi

if [[ -z "${AKASH_KEY_NAME:-}" ]]; then
    echo "Error: AKASH_KEY_NAME not set"
    exit 1
fi

echo "=== Active deployments ==="
$AKASH_BIN query deployment list --from "$AKASH_KEY_NAME" --node https://rpc.akashnet.net:443 -o json 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'{x[\"deployment\"][\"deployment_id\"][\"dseq\"]}: {x[\"deployment\"][\"state\"]}') for x in d.get('deployments',[])]" 2>/dev/null || \
    echo "Could not list deployments"

echo ""
echo "To close a deployment, run:"
echo "  akash tx deployment close DSEQ --from \$AKASH_KEY_NAME --chain-id akashnet-2 --node https://rpc.akashnet.net:443 --fees 5000uakt -y"
echo ""

# Known mining DSEQ from earlier context
KNOWN_H100_DSEQ="1781295776396"
echo "Known H100 mining DSEQ: $KNOWN_H100_DSEQ"
read -p "Close H100 mining deployment $KNOWN_H100_DSEQ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $AKASH_BIN tx deployment close "$KNOWN_H100_DSEQ" \
        --from "$AKASH_KEY_NAME" \
        --chain-id akashnet-2 \
        --node https://rpc.akashnet.net:443 \
        --fees 5000uakt \
        -y
    echo "H100 mining deployment closed."
fi
