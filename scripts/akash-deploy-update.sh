#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# YieldSwarm v2.0 — Akash Deployment Update Script
# Run this on your local machine with Akash CLI installed
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

DSEQ="1781293557070"
GSEQ="1"
OSEQ="1"
PROVIDER="provider.m3a.eu-n-3.digitalfrontier.network"
URI="ivg2a3hnjt92f3bfdfl1v7pjmg.ingress.m3a.eu-n-3.digitalfrontier.network"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  YieldSwarm v2.0 — Akash Deployment Update"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Deployment: $DSEQ"
echo "Provider:   $PROVIDER"
echo "URI:        $URI"
echo ""

# Step 1: Update env vars
echo "[1/5] Updating environment variables..."
# The provider needs to update the env vars
# akash provider send-manifest --dseq $DSEQ --gseq $GSEQ --oseq $OSEQ --provider $PROVIDER --from $AKASH_KEY_NAME deploy.yml

# Step 2: Set secrets
echo "[2/5] Setting secrets..."
echo "  ADMIN_SECRET = Codingis4kid$917!"
echo "  APP_URL = https://defiswarmagents.com"
echo ""
echo "To update manually via Akash CLI:"
echo "  akash tx deployment update --dseq $DSEQ --gseq $GSEQ --oseq $OSEQ --from \$AKASH_KEY_NAME deploy.yml"
echo ""

# Step 3: Health check
echo "[3/5] Checking deployment health..."
curl -s "https://$URI/health" || echo "Health check failed"

# Step 4: DNS update
echo ""
echo "[4/5] DNS Update Required"
echo "───────────────────────────────────────────────────────────────────────"
echo "Your domain defiswarmagents.com currently points to: 34.42.100.71"
echo "Update A record to the Akash provider IP."
echo ""
echo "To get the provider IP:"
echo "  dig +short $PROVIDER"
echo "  OR check your Akash lease dashboard"
echo ""
echo "[5/5] Once DNS propagates, verify:"
echo "  curl https://defiswarmagents.com/health"
echo "  curl https://defiswarmagents.com/admin"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
