#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-db.sh — Snapshot Neon Postgres before CO-Springs deploy
# Usage: ./backups/backup-db.sh [date_stamp]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DATE_STAMP="${1:-$(date +%Y%m%d_%H%M%S)}"
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/yieldswarm_pre_co_springs_${DATE_STAMP}.sql"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL env var not set"
  exit 1
fi

echo "Creating database snapshot: ${BACKUP_FILE}"
pg_dump "${DATABASE_URL}" --no-owner --no-acl -f "${BACKUP_FILE}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: pg_dump produced no output"
  exit 1
fi

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✓ Snapshot created: ${BACKUP_FILE} (${SIZE})"

# Generate checksum for integrity verification
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
echo "✓ Checksum generated: ${BACKUP_FILE}.sha256"

echo ""
echo "To restore:"
echo "  psql \""${DATABASE_URL}\"" < "${BACKUP_FILE}""
echo ""
echo "To upload to R2 (requires rclone configured):"
echo "  rclone copy \"${BACKUP_FILE}\" r2:yieldswarm-backups/"