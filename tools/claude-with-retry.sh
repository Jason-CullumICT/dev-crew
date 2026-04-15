#!/usr/bin/env bash
# claude-with-retry.sh — Runs claude with up to 3 attempts on transient API errors.
# Usage: bash tools/claude-with-retry.sh [claude args...]
# Drop-in replacement for `claude` in workflow steps.

MAX_ATTEMPTS=3
RETRY_DELAY=30

for attempt in $(seq 1 $MAX_ATTEMPTS); do
  if claude "$@"; then
    exit 0
  fi
  EXIT_CODE=$?
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    echo "[claude-retry] Attempt $attempt/${MAX_ATTEMPTS} failed (exit ${EXIT_CODE}). Retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  fi
done

echo "[claude-retry] ERROR: claude failed after ${MAX_ATTEMPTS} attempts."
exit 1
