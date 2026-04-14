#!/usr/bin/env bash
# =============================================================================
# setup-claude-credentials.sh
# =============================================================================
# Run at the start of each CI job (after Install Claude Code).
#
# Writes ~/.claude/.credentials.json from the CLAUDE_CREDENTIALS env var
# (which should be the full JSON from your local ~/.claude/.credentials.json).
# Then exports the initial accessToken as ANTHROPIC_API_KEY so all subsequent
# steps in the job use it.
#
# Claude CLI will auto-refresh the access token using the refreshToken when
# it expires — subsequent refresh-claude-token.sh calls pick up the new token.
#
# Usage in workflow step:
#   - name: Setup Claude credentials
#     env:
#       CLAUDE_CREDENTIALS: ${{ secrets.CLAUDE_CREDENTIALS }}
#     run: bash tools/setup-claude-credentials.sh
# =============================================================================

set -euo pipefail

# Feature flag — set CLAUDE_CREDENTIALS_ENABLED=true to re-enable.
# Disabled: falls through to static ANTHROPIC_API_KEY secret.
if [ "${CLAUDE_CREDENTIALS_ENABLED:-false}" != "true" ]; then
  echo "[claude-setup] Credential refresh disabled (CLAUDE_CREDENTIALS_ENABLED != true) — using static ANTHROPIC_API_KEY"
  exit 0
fi

CREDS_FILE="$HOME/.claude/.credentials.json"
MARKER_FILE="/tmp/claude_job_start_ts"

# Write credentials file
if [ -z "${CLAUDE_CREDENTIALS:-}" ]; then
  echo "── [claude-setup] WARNING: CLAUDE_CREDENTIALS not set ──────────────"
  echo "  Falling back to ANTHROPIC_API_KEY secret (no auto-refresh)."
  echo "  Add CLAUDE_CREDENTIALS secret (full ~/.claude/.credentials.json)"
  echo "  to enable automatic token refresh every 30 minutes."
  echo "────────────────────────────────────────────────────────────────────"
  date +%s > "$MARKER_FILE"
  exit 0
fi

mkdir -p "$(dirname "$CREDS_FILE")"
printf '%s' "$CLAUDE_CREDENTIALS" > "$CREDS_FILE"
echo "[claude-setup] Credentials file written to $CREDS_FILE"

# Extract and export initial access token
TOKEN=$(python3 -c "
import json, os
creds = os.path.expanduser('~/.claude/.credentials.json')
try:
    with open(creds) as f:
        d = json.load(f)
    print(d.get('claudeAiOauth', {}).get('accessToken', ''))
except Exception as e:
    print('')
")

if [ -z "$TOKEN" ]; then
  echo "[claude-setup] ERROR: Could not extract accessToken from credentials"
  exit 1
fi

echo "::add-mask::$TOKEN"
echo "ANTHROPIC_API_KEY=$TOKEN" >> "$GITHUB_ENV"
echo "[claude-setup] ANTHROPIC_API_KEY exported (${#TOKEN} chars, masked in logs)"

# Record job start time for 30-min refresh checks
date +%s > "$MARKER_FILE"
echo "[claude-setup] Job start time recorded"
