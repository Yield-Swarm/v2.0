#!/usr/bin/env bash
# azure/deploy-crons.sh
# ─────────────────────────────────────────────────────────────────────────────
# Creates all YieldSwarm Azure Logic App cron schedulers in one shot.
# Run this ONCE after Azure App Service is provisioned and DNS has been pointed.
#
# PREREQUISITES:
#   1. az CLI installed and logged in: az login
#   2. Correct subscription active: az account set --subscription <SUBSCRIPTION_ID>
#   3. Resource group exists (or set CREATE_RG=1 below)
#   4. App Service deployed and reachable at APP_SERVICE_URL
#   5. CRON_SECRET env var set on the App Service:
#        az webapp config appsettings set \
#          --resource-group "$RESOURCE_GROUP" \
#          --name "$APP_SERVICE_NAME" \
#          --settings CRON_SECRET="$CRON_SECRET"
#
# USAGE:
#   export APP_SERVICE_URL="https://yieldswarm.azurewebsites.net"
#   export CRON_SECRET="your-cron-secret-here"
#   bash azure/deploy-crons.sh
#
# VERIFICATION (after deploy):
#   bash azure/deploy-crons.sh --verify
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-yieldswarm-rg}"
LOCATION="${LOCATION:-eastus}"
APP_SERVICE_URL="${APP_SERVICE_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
APP_SERVICE_NAME="${APP_SERVICE_NAME:-yieldswarm}"
CREATE_RG="${CREATE_RG:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_FILE="$SCRIPT_DIR/crons.bicep"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Guard: handle --verify flag ───────────────────────────────────────────────
if [[ "${1:-}" == "--verify" ]]; then
  info "Running post-deploy verification against $APP_SERVICE_URL..."
  if [[ -z "$APP_SERVICE_URL" || -z "$CRON_SECRET" ]]; then
    die "APP_SERVICE_URL and CRON_SECRET must be set for verification"
  fi
  JOBS=(
    agent-heartbeat
    cosmos-atomic-cycle
    helix-l2-sync
    helix-multi-bridge-health
    helix-validator-health
    mining-hashrate-poll
    bounty-scout
    vault-risk-snapshot
    oracle-eye-roger
    egyptian-arena-sweep
  )
  PASS=0; FAIL=0
  for JOB in "${JOBS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "$APP_SERVICE_URL/api/crons/$JOB" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      --max-time 10)
    if [[ "$STATUS" == "202" ]]; then
      info "✅  $JOB → HTTP $STATUS"
      PASS=$((PASS+1))
    else
      warn "❌  $JOB → HTTP $STATUS (expected 202)"
      FAIL=$((FAIL+1))
    fi
  done
  echo ""
  info "Verification complete: $PASS passed, $FAIL failed"
  if [[ $FAIL -gt 0 ]]; then
    error "Some cron endpoints returned unexpected status codes."
    error "Check App Service logs: az webapp log tail --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP"
    exit 1
  fi
  exit 0
fi

# ── Validate prerequisites ────────────────────────────────────────────────────
[[ -z "$APP_SERVICE_URL" ]]  && die "APP_SERVICE_URL is not set. Export it before running."
[[ -z "$CRON_SECRET" ]]      && die "CRON_SECRET is not set. Export it before running."
[[ ! -f "$BICEP_FILE" ]]     && die "Bicep file not found: $BICEP_FILE"

command -v az  &>/dev/null || die "az CLI not found. Install from https://aka.ms/install-azure-cli"
command -v jq  &>/dev/null || warn "jq not found — output will be raw JSON (install with: brew install jq)"

# ── Check az login ────────────────────────────────────────────────────────────
if ! az account show &>/dev/null; then
  die "Not logged in to Azure. Run: az login"
fi
SUBSCRIPTION=$(az account show --query name -o tsv)
info "Deploying to subscription: $SUBSCRIPTION"
info "Resource group:            $RESOURCE_GROUP"
info "Location:                  $LOCATION"
info "App Service URL:           $APP_SERVICE_URL"

# ── Create resource group if requested ────────────────────────────────────────
if [[ "$CREATE_RG" == "1" ]]; then
  info "Creating resource group $RESOURCE_GROUP in $LOCATION..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
  info "Resource group created."
else
  # Verify it exists
  az group show --name "$RESOURCE_GROUP" --output none 2>/dev/null \
    || die "Resource group '$RESOURCE_GROUP' does not exist. Set CREATE_RG=1 or create it manually."
fi

# ── Set CRON_SECRET on the App Service (idempotent) ───────────────────────────
info "Applying CRON_SECRET to App Service '$APP_SERVICE_NAME'..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --settings "CRON_SECRET=$CRON_SECRET" \
  --output none
info "CRON_SECRET applied."

# ── Deploy Logic Apps via Bicep ───────────────────────────────────────────────
DEPLOYMENT_NAME="yieldswarm-crons-$(date +%Y%m%d%H%M%S)"
info "Starting Bicep deployment: $DEPLOYMENT_NAME ..."

az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$BICEP_FILE" \
  --parameters \
      appServiceUrl="$APP_SERVICE_URL" \
      cronSecret="$CRON_SECRET" \
      location="$LOCATION" \
  --output json \
  | (command -v jq &>/dev/null && jq '.properties.provisioningState' || cat)

info "Bicep deployment complete."

# ── Smoke-test the 6 critical ElizaOS agent endpoints ────────────────────────
info "Smoke-testing 6 critical ElizaOS agent cron endpoints..."
CRITICAL_JOBS=(
  agent-heartbeat
  cosmos-atomic-cycle
  helix-l2-sync
  helix-multi-bridge-health
  helix-validator-health
  mining-hashrate-poll
)
ALL_OK=true
for JOB in "${CRITICAL_JOBS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$APP_SERVICE_URL/api/crons/$JOB" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" \
    --max-time 15)
  if [[ "$STATUS" == "202" ]]; then
    info "✅  $JOB → 202 Accepted"
  else
    warn "❌  $JOB → HTTP $STATUS"
    ALL_OK=false
  fi
done

if $ALL_OK; then
  info "All 6 ElizaOS agent cron endpoints reachable. Swarm will stay alive. ✅"
else
  warn "One or more critical cron endpoints failed smoke test."
  warn "Check App Service logs: az webapp log tail --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP"
fi

# ── List deployed Logic Apps ──────────────────────────────────────────────────
info "Deployed Logic Apps in $RESOURCE_GROUP:"
az logic workflow list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?starts_with(name, 'ys-cron-')].{Name:name, State:state}" \
  --output table 2>/dev/null || warn "Could not list Logic Apps (az logic extension may need: az extension add --name logic)"

echo ""
info "────────────────────────────────────────────────────────"
info "NEXT STEPS:"
info "  1. DNS cutover: point your domain to Azure App Service IP"
info "  2. Wait 24h with Render still running (parallel window)"
info "  3. Monitor Azure portal → Logic Apps → Run History"
info "  4. After 24h clean: decommission Render service"
info "  5. Full verification: bash azure/deploy-crons.sh --verify"
info "────────────────────────────────────────────────────────"
