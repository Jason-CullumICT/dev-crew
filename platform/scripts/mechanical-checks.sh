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

  observability)
    # Check changed source files for raw logging patterns.
    # Language is detected per-file from extension — no project config needed.
    # Works in monorepos: a Go file gets Go rules, a TS file gets TS rules, etc.
    #
    # Non-blocking by default (warnings only).
    # Set MECH_OBS_STRICT=true to make violations block (exit 1).
    OBS_STRICT="${MECH_OBS_STRICT:-false}"

    if ! is_git_repo; then
      echo "[mech-check:observability] Not a git repo — skipping"
      exit 0
    fi

    BASE=$(git_base)
    if [ -z "$BASE" ]; then
      exit 0
    fi

    # Changed/added source files only — not deleted, not vendored/generated
    CHANGED=$(git -C "$WORKSPACE" diff --diff-filter=ACM --name-only "${BASE}..HEAD" 2>/dev/null \
      | grep -vE '\.(md|json|yaml|yml|xml|toml|lock|txt|env|sum|mod\.rs|pb\.go|pb\.ts|generated\.)' \
      | grep -vE '(^|/)(__tests__|__mocks__|fixtures|testdata|vendor|node_modules|dist|build|\.git)/' \
      | grep -vE '(_test\.(go|py|rb|cs|rs|kt|java)|\.test\.(ts|tsx|js|jsx)|\.spec\.(ts|tsx|js|jsx)|_spec\.rb|Test\.java|Tests\.cs)$' \
      || true)

    if [ -z "$CHANGED" ]; then
      echo "[mech-check:observability] No changed source files to check"
      exit 0
    fi

    WARNINGS=0

    while IFS= read -r filepath; do
      [ -z "$filepath" ] && continue
      FULL_PATH="${WORKSPACE}/${filepath}"
      [ ! -f "$FULL_PATH" ] && continue

      # Derive extension (handles multi-part like .test.ts already filtered above)
      ext="${filepath##*.}"

      BAD_PATTERN=""
      LANG=""

      case "$ext" in
        ts|tsx|mts|cts)
          BAD_PATTERN='console\.(log|error|warn|debug|info)\s*\('
          LANG="TypeScript"
          ;;
        js|jsx|mjs|cjs)
          BAD_PATTERN='console\.(log|error|warn|debug|info)\s*\('
          LANG="JavaScript"
          ;;
        py)
          # Bare print() calls — excludes `if __name__` blocks and CLI entrypoints
          BAD_PATTERN='^\s*print\s*\('
          LANG="Python"
          ;;
        go)
          BAD_PATTERN='fmt\.(Print|Println|Printf)\('
          LANG="Go"
          ;;
        java)
          BAD_PATTERN='(System\.(out|err)\.(print|println|printf)\s*\(|\.printStackTrace\s*\()'
          LANG="Java"
          ;;
        kt)
          # Kotlin: bare println/print (not method calls like someObj.println)
          BAD_PATTERN='^\s*println\s*\('
          LANG="Kotlin"
          ;;
        rb)
          # Ruby: puts/p/pp at start of expression (not method names)
          BAD_PATTERN='^\s*(puts|p|pp)\s'
          LANG="Ruby"
          ;;
        php)
          BAD_PATTERN='^\s*(echo\s|var_dump\s*\(|print_r\s*\(|var_export\s*\()'
          LANG="PHP"
          ;;
        cs)
          BAD_PATTERN='Console\.(Write|WriteLine)\s*\('
          LANG="C#"
          ;;
        rs)
          # Rust: println!/eprintln!/dbg! macros
          BAD_PATTERN='(println!|eprintln!|dbg!)\s*\('
          LANG="Rust"
          ;;
        swift)
          BAD_PATTERN='^\s*(print\s*\(|NSLog\s*\()'
          LANG="Swift"
          ;;
        cpp|cc|cxx|c)
          BAD_PATTERN='(std::cout|std::cerr|printf\s*\(|fprintf\s*\(stderr)'
          LANG="C/C++"
          ;;
        *)
          # Unknown extension — skip silently
          continue
          ;;
      esac

      # Check for bad pattern, excluding comment-only lines
      HITS=$(grep -nE "$BAD_PATTERN" "$FULL_PATH" 2>/dev/null \
        | grep -vE '^\s*[0-9]+\s*:\s*(//|#|/\*|\*|--|\')' \
        | head -5 || true)

      if [ -n "$HITS" ]; then
        echo "[mech-check:observability] ⚠ [$LANG] ${filepath}:"
        echo "$HITS" | sed 's/^/    /'
        WARNINGS=$(( WARNINGS + 1 ))
      fi
    done <<< "$CHANGED"

    if [ "$WARNINGS" -gt 0 ]; then
      echo ""
      echo "[mech-check:observability] ${WARNINGS} file(s) use raw output instead of structured logging."
      echo "  Replace with your project's logger. See CLAUDE.md Observability section."
      if [ "$OBS_STRICT" = "true" ]; then
        exit 1
      fi
    else
      echo "[mech-check:observability] ✓ No raw logging patterns detected in changed files"
    fi
    exit 0
    ;;

  *)
    echo "Usage: mechanical-checks.sh <snapshot|post-impl|deletion-context|pre-merge|post-merge|observability> <run_id> <base_branch>"
    exit 1
    ;;

esac
