# Design Review: Update Internal Path and Repo References for dev-crew

**Reviewer:** design (TheFixer)
**Date:** 2026-03-28
**Dispatch plan:** Plans/dev-crew-path-references/dispatch-plan.md
**Source task:** docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md Task 7

---

## RISK_LEVEL: medium

Rationale: Infrastructure renaming across ~12 files. No schema changes, no auth/security impact, no new endpoints. All changes are string replacements in config, scripts, and comments. Risk is medium due to file count (>3) and cross-cutting nature of the changes.

---

## Summary

All changes in the working tree correctly implement Task 7 of the dev-crew repo merge plan. Every file listed in the dispatch plan has been updated. The implementation is complete and correct.

## Findings

### INFO — All dispatch plan items implemented correctly

Every file and line identified in the dispatch plan has been updated:

| File | Status | Notes |
|------|--------|-------|
| `platform/orchestrator/server.js` | PASS | Comment, repo list, HTML title, H1, startup log all updated |
| `platform/orchestrator/lib/workflow-engine.js` | PASS | git config, portal repo detection, git diff path all updated |
| `platform/orchestrator/lib/container-manager.js` | PASS | Both GIT_AUTHOR_NAME/EMAIL pairs updated |
| `platform/orchestrator/lib/config.js` | PASS | workerImage default updated |
| `platform/scripts/setup-cycle-workspace.sh` | PASS | Git identity, comment, echo, commit message all updated |
| `platform/scripts/setup-workspace.sh` | PASS | Comment, echo updated; git add/commit/push block added |
| `CLAUDE.md` | PASS | Project description updated |
| `Plans/orchestrator-cycle-dashboard/design.md` | PASS | Reference updated |
| `platform/orchestrator/package.json` | PASS | Package name updated (bonus — not in dispatch plan) |
| `platform/orchestrator/package-lock.json` | PASS | Package name updated (bonus — not in dispatch plan) |
| `portal/Backend/src/index.ts` | PASS | Comment updated (bonus — not in dispatch plan) |
| `portal/Frontend/src/api/client.ts` | PASS | Comment updated (bonus — not in dispatch plan) |

### INFO — Backwards compatibility preserved

`workflow-engine.js:1436` correctly retains the `container-test` check alongside the new `dev-crew` check for in-flight run compatibility. The git diff path also correctly includes both `Source/` and `portal/`.

### INFO — Template auto-apply logic correct

The new block in `setup-workspace.sh` (lines 104-111) correctly:
1. Changes to `$WORKSPACE` before git operations
2. Uses `git add -A` to stage all scaffolded files
3. Uses `|| true` on commit to avoid failure if nothing to commit
4. Handles push failure gracefully with a warning
5. Is placed inside the existing `if [[ ! -d "$WORKSPACE/Teams" ]]` guard

### LOW — setup-workspace.sh: cd without restoring directory

The `cd "$WORKSPACE"` on line 105 changes the working directory but doesn't restore it afterward. This is low risk because the script continues with unrelated operations that use absolute paths or also operate in `$WORKSPACE`, but worth noting for maintainability.

### INFO — No remaining stale references

Verification grep confirms zero remaining references to `claude-ai-OS`, `container-test`, or `Work-backlog` in active code. The only `container-test` reference is the intentional backwards-compat check in `workflow-engine.js:1436`.

### INFO — All files parse successfully

- All 4 JS files pass `node -c` syntax check
- Both shell scripts pass `bash -n` syntax check

---

## Verification Results

| Check | Result |
|-------|--------|
| Old reference grep (excluding docs/) | PASS — only intentional backwards-compat hit |
| JS syntax (`node -c`) | PASS — all 4 files |
| Shell syntax (`bash -n`) | PASS — both scripts |
| Dispatch plan coverage | PASS — all 8 sections implemented |

## Conclusion

**APPROVE** — Implementation is complete, correct, and follows the dispatch plan exactly. The 4 bonus files (package.json, package-lock.json, portal comments) go beyond the plan but are correct and improve consistency. No critical or high issues found.
