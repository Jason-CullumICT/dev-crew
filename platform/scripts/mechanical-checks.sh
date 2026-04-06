#!/usr/bin/env bash
# mechanical-checks.sh — Hard numeric gates against destructive agent output.
#
# Called by workflow-engine.js at 5 pipeline checkpoints:
#   1. snapshot        — baseline after leader, before implementation
#   2. post-impl       — hard block if deletion thresholds exceeded after impl
#   3. deletion-context — outputs deletion summary for QA agent prompt injection
#   4. pre-merge       — hard block before PR creation
#   5. post-merge      — non-blocking audit after merge
#
# Usage:
#   mechanical-checks.sh <command> <run_id> <base_branch>
#
# Exit codes:
#   0 = pass / info written
#   1 = hard block (post-impl and pre-merge only; others always exit 0)
#
# Thresholds (override via env):
#   MECH_MAX_DELETED_FILES=10        — max files deleted vs base branch
#   MECH_MAX_DELETED_LINE_RATIO=40   — max % of changed lines that are deletions
#   MECH_MAX_DELETED_LINES=2000      — absolute max deleted lines

set -uo pipefail

COMMAND="${1:-help}"
RUN_ID="${2:-unknown}"
BASE_BRANCH="${3:-main}"

MAX_DELETED_FILES="${MECH_MAX_DELETED_FILES:-10}"
MAX_DEL_RATIO_PCT="${MECH_MAX_DELETED_LINE_RATIO:-40}"
MAX_DELETED_LINES="${MECH_MAX_DELETED_LINES:-2000}"

SNAPSHOT_FILE="/tmp/mech-snapshot-${RUN_ID}.json"
WORKSPACE="/workspace"

# ── Helpers ──────────────────────────────────────────────────────────────────

is_git_repo() {
  git -C "$WORKSPACE" rev-parse --git-dir >/dev/null 2>&1
}

git_base() {
  git -C "$WORKSPACE" merge-base "HEAD" "origin/${BASE_BRANCH}" 2>/dev/null \
    || git -C "$WORKSPACE" rev-parse "HEAD~5" 2>/dev/null \
    || git -C "$WORKSPACE" rev-parse "HEAD" 2>/dev/null \
    || echo ""
}

count_deleted_files() {
  local base="$1"
  git -C "$WORKSPACE" diff --diff-filter=D --name-only "${base}..HEAD" 2>/dev/null \
    | grep -cE '.' 2>/dev/null || echo "0"
}

list_deleted_files() {
  local base="$1"
  git -C "$WORKSPACE" diff --diff-filter=D --name-only "${base}..HEAD" 2>/dev/null || true
}

# Returns "insertions deletions" as two numbers on one line
line_stats() {
  local base="$1"
  git -C "$WORKSPACE" diff --numstat "${base}..HEAD" 2>/dev/null \
    | awk '{ins+=$1; del+=$2} END {print ins+0, del+0}'
}

# ── Commands ─────────────────────────────────────────────────────────────────

case "$COMMAND" in

  snapshot)
    if ! is_git_repo; then
      echo "[mech-check:snapshot] Not a git repo — skipping"
      exit 0
    fi

    COMMIT_SHA=$(git -C "$WORKSPACE" rev-parse HEAD 2>/dev/null || echo "unknown")
    FILE_COUNT=$(git -C "$WORKSPACE" ls-files 2>/dev/null | wc -l | tr -d ' ')

    cat > "$SNAPSHOT_FILE" <<JSON
{
  "runId": "${RUN_ID}",
  "baseBranch": "${BASE_BRANCH}",
  "snapshotAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commitSha": "${COMMIT_SHA}",
  "trackedFileCount": ${FILE_COUNT}
}
JSON
    echo "[mech-check:snapshot] Baseline: ${FILE_COUNT} tracked files at ${COMMIT_SHA:0:8}"
    exit 0
    ;;

  post-impl|pre-merge)
    if ! is_git_repo; then
      echo "[mech-check:${COMMAND}] Not a git repo — skipping"
      exit 0
    fi

    BASE=$(git_base)
    if [ -z "$BASE" ]; then
      echo "[mech-check:${COMMAND}] Could not determine base commit — skipping"
      exit 0
    fi

    DEL_FILES=$(count_deleted_files "$BASE")
    read -r INS_LINES DEL_LINES <<< "$(line_stats "$BASE")"
    TOTAL_LINES=$(( INS_LINES + DEL_LINES ))

    if [ "$TOTAL_LINES" -gt 0 ]; then
      DEL_RATIO_PCT=$(( DEL_LINES * 100 / TOTAL_LINES ))
    else
      DEL_RATIO_PCT=0
    fi

    echo "[mech-check:${COMMAND}] Stats: deleted_files=${DEL_FILES} ins=${INS_LINES} del=${DEL_LINES} del_ratio=${DEL_RATIO_PCT}%"

    BLOCKED=0
    REASONS=""

    if [ "$DEL_FILES" -gt "$MAX_DELETED_FILES" ]; then
      BLOCKED=1
      DEL_LIST=$(list_deleted_files "$BASE" | head -20 | tr '\n' ' ')
      REASONS="${REASONS}
  DELETED FILES: ${DEL_FILES} files deleted (threshold: ${MAX_DELETED_FILES})
    ${DEL_LIST}"
    fi

    if [ "$DEL_RATIO_PCT" -gt "$MAX_DEL_RATIO_PCT" ]; then
      BLOCKED=1
      REASONS="${REASONS}
  DELETION RATIO: ${DEL_RATIO_PCT}% of changed lines are deletions (threshold: ${MAX_DEL_RATIO_PCT}%)"
    fi

    if [ "$DEL_LINES" -gt "$MAX_DELETED_LINES" ]; then
      BLOCKED=1
      REASONS="${REASONS}
  DELETED LINES: ${DEL_LINES} lines deleted (threshold: ${MAX_DELETED_LINES})"
    fi

    if [ "$BLOCKED" -eq 1 ]; then
      echo ""
      echo "MECHANICAL CHECK BLOCKED — Thresholds exceeded:${REASONS}"
      echo ""
      echo "INSTRUCTIONS FOR THE AGENT:"
      echo "  1. Review every deleted file and line of code."
      echo "  2. Only remove code that was EXPLICITLY requested in the spec/task,"
      echo "     or is provably dead code with zero callers/references."
      echo "  3. To restore a file: git checkout <base-commit> -- <path>"
      echo "  4. Do NOT delete files to 'clean up' or 'refactor' unless the spec says to."
      echo "  5. The spec/task is the ONLY authority for what may be removed."
      exit 1
    fi

    echo "[mech-check:${COMMAND}] PASSED — all thresholds within limits"
    exit 0
    ;;

  deletion-context)
    # Output a summary block for injection into QA agent prompts.
    # Exits 0 and produces no output if deletions are negligible.
    if ! is_git_repo; then
      exit 0
    fi

    BASE=$(git_base)
    if [ -z "$BASE" ]; then
      exit 0
    fi

    DEL_FILES=$(count_deleted_files "$BASE")
    read -r INS_LINES DEL_LINES <<< "$(line_stats "$BASE")"

    # Only inject context when there's something meaningful to review
    if [ "$DEL_FILES" -eq 0 ] && [ "$DEL_LINES" -lt 50 ]; then
      exit 0
    fi

    DEL_FILE_LIST=$(list_deleted_files "$BASE" | head -20 | sed 's/^/    - /' || true)

    cat <<CONTEXT

══════════════════════════════════════════════════════════════════
MECHANICAL REVIEW CONTEXT — Deletion Summary
══════════════════════════════════════════════════════════════════
The implementation deleted ${DEL_FILES} file(s) and removed ${DEL_LINES} lines
(added ${INS_LINES} lines).

$(if [ -n "$DEL_FILE_LIST" ]; then
  printf "Deleted files:\n%s" "$DEL_FILE_LIST"
fi)

REVIEWER INSTRUCTIONS:
  - Verify that EVERY deleted file and removed code block was in scope for
    this specific task. Files not mentioned in the spec/task should NOT
    have been deleted.
  - If you find unauthorised deletions, mark this stage FAILED and list
    exactly which files/functions must be restored.
  - Check that no critical functionality was removed without a replacement.
══════════════════════════════════════════════════════════════════
CONTEXT
    exit 0
    ;;

  post-merge)
    # Non-blocking audit — always exits 0, emits a summary log line.
    if ! is_git_repo; then
      echo "[mech-check:post-merge] Not a git repo — skipping audit"
      exit 0
    fi

    BASE=$(git_base)
    if [ -z "$BASE" ]; then
      echo "[mech-check:post-merge] Could not determine base — skipping audit"
      exit 0
    fi

    DEL_FILES=$(count_deleted_files "$BASE")
    read -r INS_LINES DEL_LINES <<< "$(line_stats "$BASE")"
    TOTAL_LINES=$(( INS_LINES + DEL_LINES ))

    if [ "$TOTAL_LINES" -gt 0 ]; then
      DEL_RATIO_PCT=$(( DEL_LINES * 100 / TOTAL_LINES ))
    else
      DEL_RATIO_PCT=0
    fi

    echo "[mech-check:post-merge] AUDIT run=${RUN_ID} ins=${INS_LINES} del=${DEL_LINES} del_ratio=${DEL_RATIO_PCT}% deleted_files=${DEL_FILES}"

    if [ "$DEL_FILES" -gt 0 ]; then
      DEL_LIST=$(list_deleted_files "$BASE" | head -20 | tr '\n' ' ')
      echo "[mech-check:post-merge] Deleted files: ${DEL_LIST}"
    fi

    exit 0
    ;;

  *)
    echo "Usage: mechanical-checks.sh <snapshot|post-impl|deletion-context|pre-merge|post-merge> <run_id> <base_branch>"
    exit 1
    ;;

esac
