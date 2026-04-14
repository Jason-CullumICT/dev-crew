#!/usr/bin/env bash
# =============================================================================
# git-push.sh — Commit staged changes and push with rebase retry
# =============================================================================
# Usage: bash tools/git-push.sh "<branch>" "<commit-message>"
#
# Handles three robustness issues that plain `git commit ... || true` and
# `git pull --rebase && git push` miss:
#
#   1. Distinguishes "nothing to commit" (safe skip) from real commit errors
#   2. Retries pull-rebase + push up to 3 times with backoff, covering the
#      race window when parallel jobs push to the same branch simultaneously
#   3. Fails loudly on genuine errors instead of swallowing them
#
# =============================================================================
set -euo pipefail

BRANCH="$1"
MSG="$2"

git config user.email "github-actions[bot]@users.noreply.github.com"
git config user.name "github-actions[bot]"
git add -A

# Only commit if there are staged changes — distinguishes empty commit
# (exit 1 from git) from real errors
if ! git diff --cached --quiet; then
  git commit -m "$MSG"
else
  echo "[git-push] Nothing to commit — skipping commit step"
fi

# Push with rebase retry — parallel jobs writing different files rarely
# conflict on content, but they do race on push. Three attempts with
# jittered backoff covers the common case.
for attempt in 1 2 3; do
  if git pull --rebase origin "$BRANCH" && git push origin HEAD; then
    exit 0
  fi
  git rebase --abort 2>/dev/null || true
  if [ "$attempt" -lt 3 ]; then
    SLEEP=$((attempt * 5 + RANDOM % 6))
    echo "[git-push] Push attempt $attempt failed — retrying in ${SLEEP}s..."
    sleep "$SLEEP"
  fi
done

echo "[git-push] ERROR: Failed to push after 3 attempts"
exit 1
