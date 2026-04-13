#!/bin/bash
# Sync src/ to health-tracker-next/src/ (Vercel deploy directory)
# Run this after editing any files in src/

set -e
cd /Users/mikefoley/.openclaw/workspace/health-tracker-next

echo "Syncing src/ → health-tracker-next/src/..."
rsync -av --delete \
  src/app/ \
  health-tracker-next/src/app/

echo "Done. Files synced."
echo ""
echo "Run: git add health-tracker-next/ && git commit && git push"
