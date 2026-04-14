#!/usr/bin/env bash
# =============================================================================
# refresh-claude-token.sh
# =============================================================================
# Run after each agent step that may take >30 minutes.
#
# Checks how long the job has been running. If 30+ minutes have elapsed since
# setup-claude-credentials.sh ran, re-reads ~/.claude/.credentials.json and
# exports a fresh ANTHROPIC_API_KEY to $GITHUB_ENV.
#
# Why this works:
#   Claude CLI auto-refreshes its OAuth access token (using the refreshToken
#   in credentials.json) whenever it receives a 401. It writes the new
#   accessToken back to the credentials file. This script picks up that
#   updated token and makes it available to subsequent steps.
#
# If no credentials file exists (CLAUDE_CREDENTIALS secret not set), this
# script exits silently — the ANTHROPIC_API_KEY secret is used as-is.
#
# Usage in workflow step (after each agent step):
#   - name: Refresh Claude token if needed
#     if: always()
#     run: bash tools/refresh-claude-token.sh
# =============================================================================

CREDS_FILE="$HOME/.claude/.credentials.json"
MARKER_FILE="/tmp/claude_job_start_ts"
THRESHOLD=1800  # 30 minutes in seconds

# If no credentials file, nothing to do
if [ ! -f "$CREDS_FILE" ]; then
  echo "[token-refresh] No credentials file — using static ANTHROPIC_API_KEY"
  exit 0
fi

# Calculate elapsed time
NOW=$(date +%s)
if [ -f "$MARKER_FILE" ]; then
  JOB_START=$(cat "$MARKER_FILE")
  ELAPSED=$((NOW - JOB_START))
else
  ELAPSED=0
fi

ELAPSED_MIN=$((ELAPSED / 60))
echo "[token-refresh] Job elapsed: ${ELAPSED_MIN}m (threshold: 30m)"

if [ "$ELAPSED" -lt "$THRESHOLD" ]; then
  REMAINING=$(( (THRESHOLD - ELAPSED) / 60 ))
  echo "[token-refresh] Token still fresh — ${REMAINING}m until next refresh window"
  exit 0
fi

echo "[token-refresh] 30m threshold reached — reading refreshed token from credentials file"

# Read current token from credentials file
CURRENT_TOKEN=$(python3 -c "
import json, os
creds = os.path.expanduser('~/.claude/.credentials.json')
try:
    with open(creds) as f:
        d = json.load(f)
    print(d.get('claudeAiOauth', {}).get('accessToken', ''))
except Exception as e:
    print('')
")

if [ -z "$CURRENT_TOKEN" ]; then
  echo "[token-refresh] ERROR: Could not read token from credentials file"
  exit 0
fi

# Check if token has changed (Claude CLI refreshed it)
if [ "$CURRENT_TOKEN" = "${ANTHROPIC_API_KEY:-}" ]; then
  echo "[token-refresh] Token unchanged in credentials file"
  echo "[token-refresh] NOTE: If Claude auto-refreshed, it updated the credentials file"
  echo "[token-refresh] Exporting current token to ensure it's set for next steps"
fi

echo "::add-mask::$CURRENT_TOKEN"
echo "ANTHROPIC_API_KEY=$CURRENT_TOKEN" >> "$GITHUB_ENV"
echo "[token-refresh] ANTHROPIC_API_KEY refreshed in GITHUB_ENV (${#CURRENT_TOKEN} chars, masked in logs)"

# Reset the marker so the next 30-min window starts from now
date +%s > "$MARKER_FILE"
echo "[token-refresh] Timer reset — next check in 30m"
