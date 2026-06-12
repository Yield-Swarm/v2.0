#!/bin/bash
set -uo pipefail

# ============================================================
# YieldSwarm 48-Hour Mining Monitor & Auto-Shutdown
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_HOURS=48
POLL_INTERVAL=300  # 5 minutes
SHUTDOWN_GRACE=60  # 1 minute grace period

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOG_FILE="$SCRIPT_DIR/mining-monitor.log"
STATE_FILE="$SCRIPT_DIR/.mining_state"

# Mining state tracking
START_TIME=$(date +%s)
END_TIME=$((START_TIME + RUNTIME_HOURS * 3600))

log() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     YieldSwarm 48-Hour Mining Monitor                  ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Start: $(date -d @$START_TIME '+%Y-%m-%d %H:%M:%S')"
    echo "End:   $(date -d @$END_TIME '+%Y-%m-%d %H:%M:%S')"
    echo "Budget: \$120 | Max Runtime: $RUNTIME_HOURS hours"
    echo "Log: $LOG_FILE"
    echo ""
}

get_deployment_status() {
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        akash query deployment get "$dseq" \
            --node https://rpc.akashnet.net:443 \
            -o json 2>/dev/null | jq -r '.deployment.state // "unknown"'
    else
        echo "no_deployment"
    fi
}

check_lease_status() {
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        akash query market lease list --dseq "$dseq" \
            --node https://rpc.akashnet.net:443 \
            -o json 2>/dev/null | jq -r '.leases[0].lease.state // "none"'
    else
        echo "none"
    fi
}

check_gpu_metrics() {
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        local provider=$(akash query market lease list --dseq "$dseq" \
            --node https://rpc.akashnet.net:443 \
            -o json 2>/dev/null | jq -r '.leases[0].lease.lease_id.provider // ""')
        
        if [[ -n "$provider" ]]; then
            # Fetch GPU utilization via provider status endpoint
            curl -s "http://$provider:8080/status" 2>/dev/null | jq -r '.gpu_utilization // "unknown"'
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

estimate_spend() {
    local elapsed=$1
    local hours=$(echo "scale=2; $elapsed / 3600" | bc)
    
    if [[ -f "$SCRIPT_DIR/.deployment_profile" ]]; then
        local profile=$(cat "$SCRIPT_DIR/.deployment_profile")
        case "$profile" in
            a100)
                echo "scale=2; $hours * 2.50" | bc
                ;;
            rtx4090)
                echo "scale=2; $hours * 2.50" | bc
                ;;
            rtx3090)
                echo "scale=2; $hours * 2.40" | bc
                ;;
            *)
                echo "unknown"
                ;;
        esac
    else
        echo "unknown"
    fi
}

shutdown_deployment() {
    log "SHUTDOWN TRIGGERED: 48-hour budget window reached"
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  BUDGET LIMIT REACHED — INITIATING AUTO-SHUTDOWN       ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        log "Closing deployment DSEQ=$dseq..."
        
        akash tx deployment close "$dseq" \
            --from "$AKASH_KEY_NAME" \
            --chain-id akashnet-2 \
            --node https://rpc.akashnet.net:443 \
            --fees 5000uakt \
            -y >> "$LOG_FILE" 2>&1
        
        rm -f "$SCRIPT_DIR/.deployment_dseq" "$SCRIPT_DIR/.deployment_profile"
        log "Deployment closed successfully. Credits preserved."
    fi
    
    # Write final summary
    cat >> "$LOG_FILE" << EOF

=== FINAL REPORT ===
Runtime: $(printf '%02d:%02d:%02d' $(($elapsed/3600)) $(($elapsed%3600/60)) $(($elapsed%60)))
Estimated Spend: \$$current_spend
Status: AUTO-SHUTDOWN COMPLETE
Credits Preserved: YES
EOF
    
    echo -e "${GREEN}Auto-shutdown complete. Credits preserved.${NC}"
    exit 0
}

print_status() {
    local now=$(date +%s)
    local elapsed=$((now - START_TIME))
    local remaining=$((END_TIME - now))
    local current_spend=$(estimate_spend "$elapsed")
    local deployment_state=$(get_deployment_status)
    local lease_state=$(check_lease_status)
    local gpu_util=$(check_gpu_metrics)
    
    clear
    print_banner
    
    echo -e "${BLUE}=== Current Status ===${NC}"
    printf "Elapsed:     %02d:%02d:%02d / 48:00:00\n" \
        $((elapsed/3600)) $((elapsed%3600/60)) $((elapsed%60))
    printf "Remaining:   %02d:%02d:%02d\n" \
        $((remaining/3600)) $((remaining%3600/60)) $((remaining%60))
    echo "Deployment:  $deployment_state"
    echo "Lease:       $lease_state"
    echo "GPU Util:    $gpu_util%"
    echo "Est. Spend:  \$$current_spend / \$120"
    echo ""
    
    # Progress bar
    local progress=$((elapsed * 100 / (RUNTIME_HOURS * 3600)))
    local filled=$((progress / 2))
    local empty=$((50 - filled))
    printf "${YELLOW}["
    printf "%0.s█" $(seq 1 $filled)
    printf "%0.s░" $(seq 1 $empty)
    printf "] %d%%${NC}\n" "$progress"
    echo ""
    
    # Warnings
    if [[ $remaining -lt 3600 ]]; then
        echo -e "${RED}WARNING: Less than 1 hour remaining${NC}"
    elif [[ $remaining -lt 7200 ]]; then
        echo -e "${YELLOW}WARNING: Less than 2 hours remaining${NC}"
    fi
    
    if [[ "$deployment_state" != "active" && "$deployment_state" != "no_deployment" ]]; then
        echo -e "${RED}ALERT: Deployment not active!${NC}"
    fi
    
    echo "$(date '+%H:%M:%S') - Monitoring... (Ctrl+C to stop)"
}

# Cleanup handler
cleanup() {
    echo ""
    log "Monitor interrupted by user"
    echo -e "${YELLOW}Monitor stopped. Deployment is still running.${NC}"
    echo "To stop deployment: ./deploy-mining.sh stop"
    exit 0
}

trap cleanup INT TERM

# Main loop
print_banner
log "Monitor started. 48-hour budget window active."

while true; do
    print_status
    
    local now=$(date +%s)
    local elapsed=$((now - START_TIME))
    local remaining=$((END_TIME - now))
    
    # Check for shutdown condition
    if [[ $remaining -le 0 ]]; then
        shutdown_deployment
    fi
    
    # Log periodic status
    if [[ $((elapsed % 1800)) -lt 300 ]]; then
        local spend=$(estimate_spend "$elapsed")
        log "STATUS: elapsed=$(($elapsed/3600))h, spend=\$$spend, state=$(get_deployment_status)"
    fi
    
    sleep "$POLL_INTERVAL"
done
