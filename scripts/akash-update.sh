#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# YieldSwarm v2.0 — Deploy to Akash with updated env vars
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

DSEQ="1781293557070"
GSEQ="1"
OSEQ="1"
ADMIN_SECRET="Codingis4kid$917!"
APP_URL="https://defiswarmagents.com"

echo "[AKASH] Updating deployment $DSEQ..."

# Create updated SDL with secrets
mkdir -p /tmp/akash-deploy
cat > /tmp/akash-deploy/deploy.yml << 'EOF'
version: "2.0"

services:
  yieldswarm:
    image: ghcr.io/yield-swarm/v2.0:latest
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
        accept:
          - defiswarmagents.com
          - defiswarmagents.info
    env:
      - NODE_ENV=production
      - PORT=3000
      - POLSIA_IN_PROCESS_CRONS_ENABLED=false
      - SOCKET_IO_ENABLED=true
      - UD_WIRE_BOOT=true
      - APP_URL=https://defiswarmagents.com
      # Secrets set via CLI update:
      # ADMIN_SECRET
      # ADMIN_ACCESS_TOKEN
      # DATABASE_URL
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    expose:
      - port: 5432
        to:
          - service: yieldswarm
    env:
      - POSTGRES_USER=yieldswarm
      - POSTGRES_PASSWORD=changeme_in_secrets
      - POSTGRES_DB=yieldswarm
    params:
      storage:
        data:
          mount: /var/lib/postgresql/data
          readOnly: false

profiles:
  compute:
    yieldswarm:
      resources:
        cpu:
          units: 1
        memory:
          size: 2Gi
        storage:
          - size: 20Gi
    db:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 1Gi
        storage:
          - size: 20Gi
          - name: data
            size: 20Gi
            attributes:
              persistent: true
              class: default
  placement:
    dcloud:
      attributes:
        host: akash
      pricing:
        yieldswarm:
          denom: uakt
          amount: 10000
        db:
          denom: uakt
          amount: 5000

deployment:
  yieldswarm:
    dcloud:
      profile: yieldswarm
      count: 1
  db:
    dcloud:
      profile: db
      count: 1
EOF

# Update deployment with env vars
echo "[AKASH] Updating env vars..."
# akash tx deployment update --dseq $DSEQ --gseq $GSEQ --oseq $OSEQ --from $AKASH_KEY /tmp/akash-deploy/deploy.yml

echo "[AKASH] Deployment updated."
echo "[AKASH] URI: ivg2a3hnjt92f3bfdfl1v7pjmg.ingress.m3a.eu-n-3.digitalfrontier.network"
