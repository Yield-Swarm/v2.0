#!/bin/bash
set -euo pipefail

# ============================================================
# YieldSwarm Akash Mining Deployment Script
# Budget: $120 / 48 hours = $2.50/hr
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLET_ADDRESS="${WALLET_ADDRESS:-}"
POOL_URL="${POOL_URL:-}"
RUNTIME_HOURS=48

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  a100     Deploy 1x NVIDIA A100    (~\$2.50/hr)"
    echo "  rtx4090  Deploy 2x NVIDIA RTX 4090 (~\$1.25/hr each)"
    echo "  rtx3090  Deploy 4x NVIDIA RTX 3090 (~\$0.60/hr each)"
    echo "  stop     Stop all running deployments"
    echo "  status   Check deployment status"
    echo ""
    echo "Environment:"
    echo "  WALLET_ADDRESS    Mining wallet address (required)"
    echo "  POOL_URL          Mining pool URL (required)"
    echo ""
    echo "Example:"
    echo "  WALLET_ADDRESS=addr POOL_URL=pool $0 a100"
    exit 1
}

check_deps() {
    if ! command -v akash &> /dev/null; then
        echo -e "${RED}Error: akash CLI not found${NC}"
        echo "Install from https://github.com/akash-network/provider"
        exit 1
    fi
    if [[ -z "$WALLET_ADDRESS" ]]; then
        echo -e "${RED}Error: WALLET_ADDRESS not set${NC}"
        usage
    fi
    if [[ -z "$POOL_URL" ]]; then
        echo -e "${RED}Error: POOL_URL not set${NC}"
        usage
    fi
}

select_sdl() {
    case "$1" in
        a100)
            SDL_FILE="$SCRIPT_DIR/akash-mining-a100.yml"
            PROFILE="a100"
            ;;
        rtx4090)
            SDL_FILE="$SCRIPT_DIR/akash-mining-rtx4090.yml"
            PROFILE="rtx4090"
            ;;
        rtx3090)
            SDL_FILE="$SCRIPT_DIR/akash-mining-rtx3090.yml"
            PROFILE="rtx3090"
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
}

inject_env() {
    local sdl="$1"
    local tmp=$(mktemp)
    sed -e "s|YOUR_WALLET_ADDRESS|$WALLET_ADDRESS|g" \
        -e "s|YOUR_POOL_URL|$POOL_URL|g" \
        "$sdl" > "$tmp"
    echo "$tmp"
}

deploy() {
    local profile="$1"
    local sdl="$2"
    echo -e "${GREEN}Deploying YieldSwarm mining with profile: $profile${NC}"
    echo "Wallet: $WALLET_ADDRESS"
    echo "Pool: $POOL_URL"
    echo "Runtime: $RUNTIME_HOURS hours (auto-shutdown enabled)"
    echo ""

    local injected_sdl=$(inject_env "$sdl")
    
    # Create deployment
    echo "Creating deployment..."
    akash tx deployment create "$injected_sdl" \
        --from "$AKASH_KEY_NAME" \
        --chain-id akashnet-2 \
        --node https://rpc.akashnet.net:443 \
        --fees 5000uakt \
        -y

    # Get deployment ID and store it
    DEPLOYMENT_DSEQ=$(akash query deployment list --from "$AKASH_KEY_NAME" --node https://rpc.akashnet.net:443 -o json | jq -r '.deployments[0].deployment.deployment_id.dseq')
    echo "$DEPLOYMENT_DSEQ" > "$SCRIPT_DIR/.deployment_dseq"
    echo "$profile" > "$SCRIPT_DIR/.deployment_profile"
    
    echo -e "${GREEN}Deployment created: DSEQ=$DEPLOYMENT_DSEQ${NC}"
    rm -f "$injected_sdl"
}

stop_all() {
    echo -e "${YELLOW}Stopping all YieldSwarm mining deployments...${NC}"
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        akash tx deployment close "$dseq" \
            --from "$AKASH_KEY_NAME" \
            --chain-id akashnet-2 \
            --node https://rpc.akashnet.net:443 \
            --fees 5000uakt \
            -y
        rm -f "$SCRIPT_DIR/.deployment_dseq" "$SCRIPT_DIR/.deployment_profile"
        echo -e "${GREEN}Deployment closed.${NC}"
    else
        echo -e "${YELLOW}No active deployment found.${NC}"
    fi
}

show_status() {
    echo -e "${GREEN}=== YieldSwarm Mining Status ===${NC}"
    if [[ -f "$SCRIPT_DIR/.deployment_dseq" ]]; then
        local dseq=$(cat "$SCRIPT_DIR/.deployment_dseq")
        local profile=$(cat "$SCRIPT_DIR/.deployment_profile")
        echo "Profile: $profile"
        echo "DSEQ: $dseq"
        akash query deployment get "$dseq" \
            --node https://rpc.akashnet.net:443 \
            -o json | jq '.deployment.state' 2>/dev/null || echo "State: unknown"
    else
        echo "No active deployment."
    fi
    echo ""
    echo "Wallet: ${WALLET_ADDRESS:-not set}"
    echo "Pool: ${POOL_URL:-not set}"
}

# Main
check_deps

[[ $# -eq 0 ]] && usage

case "$1" in
    a100|rtx4090|rtx3090)
        select_sdl "$1"
        deploy "$PROFILE" "$SDL_FILE"
        echo ""
        echo -e "${GREEN}Deployment initiated. Run monitor-mining.sh to watch.${NC}"
        ;;
    stop)
        stop_all
        ;;
    status)
        show_status
        ;;
    *)
        usage
        ;;
esac
