#!/usr/bin/env bash
# =============================================================================
# setup-claude-credentials.sh
# =============================================================================
# Run at the start of each CI job (after Install Claude Code).
#
# Two modes — detected automatically:
#
# Mode 1 — OAuth token in ANTHROPIC_API_KEY (sk-ant-oat01-...):
#   Writes ~/.claude/.credentials.json so Claude CLI uses the OAuth flow.
#   Clears ANTHROPIC_API_KEY for subsequent steps (CLI uses credentials file).
#
# Mode 2 — CLAUDE_CREDENTIALS secret set (full credentials JSON):
#   Enabled when CLAUDE_CREDENTIALS_ENABLED=true (default: false).
#   Writes credentials file from the secret and exports accessToken.
#
# Mode 3 — Real API key in ANTHROPIC_API_KEY (sk-ant-api...):
#   No-op. Key passes through unchanged.
# =============================================================================

set -euo pipefail

CREDS_FILE="$HOME/.claude/.credentials.json"
MARKER_FILE="/tmp/claude_job_start_ts"

# ── Mode 1: OAuth token in ANTHROPIC_API_KEY ──────────────────────────────────
if [[ "${ANTHROPIC_API_KEY:-}" == sk-ant-oat* ]]; then
  echo "[claude-setup] OAuth token detected in ANTHROPIC_API_KEY — writing credentials file"
  mkdir -p "$(dirname "$CREDS_FILE")"
  python3 -c "
import json, time, sys
token = sys.argv[1]
creds = {
  'claudeAiOauth': {
    'accessToken': token,
    'refreshToken': '',
    'expiresAt': int(time.time() * 1000) + 3600000,
    'scopes': ['user:inference', 'user:profile', 'user:sessions:claude_code']
  }
}
print(json.dumps(creds))
" "${ANTHROPIC_API_KEY}" > "$CREDS_FILE"
  echo "[claude-setup] Credentials file written — clearing ANTHROPIC_API_KEY so CLI uses OAuth flow"
  echo "ANTHROPIC_API_KEY=" >> "$GITHUB_ENV"
  date +%s > "$MARKER_FILE"
  exit 0
fi

# ── Mode 2: CLAUDE_CREDENTIALS secret (opt-in) ───────────────────────────────
if [ "${CLAUDE_CREDENTIALS_ENABLED:-false}" = "true" ]; then
  if [ -z "${CLAUDE_CREDENTIALS:-}" ]; then
    echo "[claude-setup] WARNING: CLAUDE_CREDENTIALS_ENABLED=true but CLAUDE_CREDENTIALS not set"
    date +%s > "$MARKER_FILE"
    exit 0
  fi

  mkdir -p "$(dirname "$CREDS_FILE")"
  printf '%s' "$CLAUDE_CREDENTIALS" > "$CREDS_FILE"
  echo "[claude-setup] Credentials file written from CLAUDE_CREDENTIALS secret"

  TOKEN=$(python3 -c "
import json, os
try:
    with open(os.path.expanduser('~/.claude/.credentials.json')) as f:
        d = json.load(f)
    print(d.get('claudeAiOauth', {}).get('accessToken', ''))
except:
    print('')
")

  if [ -z "$TOKEN" ]; then
    echo "[claude-setup] ERROR: Could not extract accessToken from credentials"
    exit 1
  fi

  echo "::add-mask::$TOKEN"
  echo "ANTHROPIC_API_KEY=$TOKEN" >> "$GITHUB_ENV"
  echo "[claude-setup] ANTHROPIC_API_KEY exported (${#TOKEN} chars)"
  date +%s > "$MARKER_FILE"
  exit 0
fi

# ── Mode 3: Real API key — pass through unchanged ─────────────────────────────
echo "[claude-setup] API key detected — no credential setup needed"
date +%s > "$MARKER_FILE"
