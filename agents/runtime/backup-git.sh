#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-git.sh — Tag current state before CO-Springs deploy
# Creates annotated git tag + pushes to origin
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DATE_STAMP="$(date +%Y%m%d)"
TAG_NAME="v-pre-co-springs-${DATE_STAMP}"
TAG_MSG="Pre-CO-Springs deploy backup — $(date -u +'%Y-%m-%d %H:%M UTC')"

echo "Tagging current HEAD as: ${TAG_NAME}"
git tag -a "${TAG_NAME}" -m "${TAG_MSG}"

echo "Pushing tag to origin..."
git push origin --tags

echo ""
echo "✓ Tag ${TAG_NAME} pushed to origin"
echo ""
echo "To verify:"
echo "  git log --oneline ${TAG_NAME} -1"
echo "  git tag -l | grep co-springs"
echo ""
echo "To rollback to this tag:"
echo "  git checkout ${TAG_NAME}"
echo "  git push origin main --force  # then trigger Render deploy"