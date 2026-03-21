#!/usr/bin/env bash
set -euo pipefail

# OpenClaw “panic button”
# Goal: be resilient even when parts of the system are broken.
# - Captures diagnostics to workspace/debug/
# - Captures memory status + (optional) reindex
# - Captures config + backups (redacted)
# - Restarts gateway at the end
# - Creates a tar.gz of the bundle for easy sharing

WS_DIR="${OPENCLAW_WORKSPACE_DIR:-$HOME/.openclaw/workspace}"
OUT_DIR="$WS_DIR/debug"
TS="$(date +"%Y%m%d-%H%M%S")"
HOST="$(scutil --get ComputerName 2>/dev/null || hostname)"
BUNDLE="$OUT_DIR/openclaw-panic-$HOST-$TS"
TARBALL="$BUNDLE.tar.gz"

mkdir -p "$BUNDLE"

log() { printf "%s\n" "$*"; }

# Never let cleanup steps kill the script.
cleanup() {
  set +e
  if command -v tar >/dev/null 2>&1; then
    tar -czf "$TARBALL" -C "$(dirname "$BUNDLE")" "$(basename "$BUNDLE")" >/dev/null 2>&1 || true
  fi
  log ""
  log "Saved panic bundle to:"
  log "$BUNDLE"
  if [[ -f "$TARBALL" ]]; then
    log "Archived bundle to:"
    log "$TARBALL"
  fi
}
trap cleanup EXIT

# Basic meta
{
  echo "timestamp: $(date -Is)"
  echo "host: $HOST"
  echo "whoami: $(whoami)"
  echo "cwd: $(pwd)"
  echo "shell: ${SHELL:-unknown}"
  echo "path: $PATH"
  echo "macos: $(sw_vers 2>/dev/null || true)"
  echo "uptime: $(uptime || true)"
  echo "disk:"
  df -h || true
} > "$BUNDLE/meta.txt" 2>&1

# Ensure openclaw exists
if ! command -v openclaw >/dev/null 2>&1; then
  echo "ERROR: openclaw not found in PATH" > "$BUNDLE/ERROR-openclaw-missing.txt"
  exit 0
fi

(openclaw --version || true) > "$BUNDLE/openclaw-version.txt" 2>&1

# Status (include security audit + channel + memory summary)
(openclaw status --all || true) > "$BUNDLE/openclaw-status.txt" 2>&1

# Recent logs (bump limits so we don’t miss useful context)
# max-bytes must be <= 1000000 (gateway validation)
(openclaw logs --limit 5000 --max-bytes 1000000 --plain || true) > "$BUNDLE/openclaw-logs.txt" 2>&1

# Memory diagnostics + smoke test
(openclaw memory status || true) > "$BUNDLE/memory-status.txt" 2>&1
(openclaw memory search "sanity check" --limit 5 || true) > "$BUNDLE/memory-search-smoke.txt" 2>&1

# If memory is broken, a reindex is usually safe and fixes it.
# This can take a bit; still worth doing in panic mode.
(openclaw memory index || true) > "$BUNDLE/memory-index.txt" 2>&1

# Config capture (safe-by-default)
# IMPORTANT: config files can contain secrets (API keys, tokens).
# By default we DO NOT copy openclaw.json or backups into the bundle.
# To include them for local debugging, run with:
#   OPENCLAW_PANIC_COPY_CONFIG_FILES=1 ~/.openclaw/workspace/scripts/openclaw-panic.sh

{
  echo "SENSITIVE: This bundle is safe-by-default (config files NOT copied)."
  echo "If you enable config copying, review/redact before sharing externally."
} > "$BUNDLE/SENSITIVE_README.txt"

# Optional: copy config files if explicitly requested
COPY_CONFIG_FILES="${OPENCLAW_PANIC_COPY_CONFIG_FILES:-0}"
if [[ "$COPY_CONFIG_FILES" == "1" ]]; then
  CFG_DIR="$HOME/.openclaw"
  for f in "$CFG_DIR/openclaw.json" "$CFG_DIR/openclaw.json.bak" "$CFG_DIR/openclaw.json.bak"*; do
    if [[ -f "$f" ]]; then
      cp -p "$f" "$BUNDLE/" 2>/dev/null || true
    fi
  done
fi

# Extra: power + sleep assertions + recent sleep/wake
(pmset -g assertions || true) > "$BUNDLE/pmset-assertions.txt" 2>&1
(pmset -g log | tail -n 400 || true) > "$BUNDLE/pmset-log-tail.txt" 2>&1

# Extra: process snapshot (prefer rg, fallback to grep)
(ps aux || true) > "$BUNDLE/ps-aux.txt" 2>&1
if command -v rg >/dev/null 2>&1; then
  (ps aux | rg -n "openclaw|node" || true) > "$BUNDLE/ps-openclaw.txt" 2>&1
else
  (ps aux | grep -En "openclaw|node" || true) > "$BUNDLE/ps-openclaw.txt" 2>&1
fi

(lsof -nP -iTCP:18789 -sTCP:LISTEN || true) > "$BUNDLE/port-18789.txt" 2>&1

# Capture memory DB existence (don’t copy the whole DB unless you explicitly want to)
{
  echo "memory db: $HOME/.openclaw/memory/main.sqlite"
  ls -lah "$HOME/.openclaw/memory" 2>/dev/null || true
} > "$BUNDLE/memory-files.txt" 2>&1

# Restart gateway (this is usually what you want at the end)
(openclaw gateway restart || true) > "$BUNDLE/gateway-restart.txt" 2>&1

# Give it a second and re-check memory status after restart
(sleep 2 || true)
(openclaw memory status || true) > "$BUNDLE/memory-status-after-restart.txt" 2>&1
