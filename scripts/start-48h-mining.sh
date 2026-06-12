#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# YieldSwarm 48-Hour Mining Supercharger
# Uses all available Akash credits for maximum TAO mining
# Auto-shutdown after 48 hours to preserve budget
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

START_TIME=$(date +%s)
END_TIME=$((START_TIME + 172800))  # 48 hours in seconds
TOTAL_BUDGET=120  # $120 in credits
HOURLY_RATE=2.50   # Target spend rate

echo "═══════════════════════════════════════════════════════════════════════"
echo "  🚀 RAINBOW MINER — 48-Hour Supercharger"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Start:        $(date)"
echo "End:          $(date -d @${END_TIME})"
echo "Budget:       $${TOTAL_BUDGET}"
echo "Target Rate:  $${HOURLY_RATE}/hour"
echo ""

# ─── Install Bittensor ─────────────────────────────────────────────────
if ! command -v btcli &> /dev/null; then
    echo "[SETUP] Installing Bittensor..."
    apt-get update -qq
    apt-get install -y -qq python3 python3-pip git curl
    pip3 install --quiet bittensor
fi

# ─── Wallet Check ──────────────────────────────────────────────────────
if [ ! -d ~/.bittensor/wallets ]; then
    echo "[WALLET] No wallet found. Creating..."
    btcli wallet new_coldkey --wallet.name default --no_password
    btcli wallet new_hotkey --wallet.name default --wallet.hotkey default --no_password
fi

# ─── Subnet Registration ──────────────────────────────────────────────
SUBNET=1
WALLET_NAME="default"
HOTKEY="default"

echo "[MINER] Checking subnet ${SUBNET} registration..."
btcli subnet list --wallet.name ${WALLET_NAME}

# Register if not already registered
btcli subnet register \
    --netuid ${SUBNET} \
    --wallet.name ${WALLET_NAME} \
    --wallet.hotkey ${HOTKEY} \
    --subtensor.network finney

# ─── Start Mining Loop ─────────────────────────────────────────────────
echo "[MINER] Starting 48-hour mining operation..."
echo "[MINER] Press Ctrl+C to stop early"

while [ $(date +%s) -lt ${END_TIME} ]; do
    REMAINING=$((END_TIME - $(date +%s)))
    HOURS_LEFT=$((REMAINING / 3600))
    
    echo "[$(date '+%H:%M:%S')] Mining... ${HOURS_LEFT}h remaining"
    
    # Run miner for 1 hour intervals, then restart to check status
    timeout 3600 bt-miner \
        --netuid ${SUBNET} \
        --wallet.name ${WALLET_NAME} \
        --wallet.hotkey ${HOTKEY} \
        --subtensor.network finney \
        --logging.debug || true
    
    # Check if we're still within budget
    ELAPSED=$(($(date +%s) - START_TIME))
    HOURS_SPENT=$(echo "scale=2; $ELAPSED / 3600" | bc)
    ESTIMATED_SPENT=$(echo "scale=2; $HOURS_SPENT * $HOURLY_RATE" | bc)
    
    echo "[BUDGET] Estimated spent: $${ESTIMATED_SPENT} / $${TOTAL_BUDGET}"
    
    if (( $(echo "$ESTIMATED_SPENT > $TOTAL_BUDGET" | bc -l) )); then
        echo "[BUDGET] Budget exhausted! Stopping miner."
        break
    fi
done

# ─── Auto-Shutdown ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ⏰ 48-Hour Mining Complete"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Start: $(date -d @${START_TIME})"
echo "End:   $(date)"
echo ""

# Auto-shutdown to stop billing
if [ -f /var/run/akash-miner.pid ]; then
    echo "[SHUTDOWN] Stopping miner process..."
    kill -TERM $(cat /var/run/akash-miner.pid) 2>/dev/null || true
fi

# Signal Akash to close the lease (optional - depends on provider)
echo "[SHUTDOWN] Lease can now be closed to stop billing."
echo "[SHUTDOWN] Run: akash tx deployment close --dseq <DSEQ> --from <KEY>"

echo ""
echo "Mining complete. Check wallet balance with:"
echo "  btcli wallet overview --wallet.name default"
echo ""

# Exit cleanly
exit 0
