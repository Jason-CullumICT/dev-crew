# Security QA Report — dev-crew Path References Update

**Task:** Update all internal path and repo references for the dev-crew repo structure (Task 7)
**Role:** security-qa
**Team:** TheFixer
**Run:** cycle/run-1774659927912-8dd3ac77
**Date:** 2026-03-28

---

## RISK_LEVEL: low

**Rationale:** This is a search-and-replace reference update across config, scripts, and documentation. No schema changes, no new endpoints, no auth changes. Touches <10 active code files (most matches are in docs/plans which are informational). The only runtime code change is a backwards-compatibility string check in `workflow-engine.js:1436`.

---

## Scope of Review

Searched all files in `platform/`, `Source/`, `portal/`, `CLAUDE.md`, `tools/`, `Teams/` (excluding `node_modules/`, `.git/`) for references to:
- `claude-ai-OS`
- `container-test`
- `Work-backlog`

---

## Findings

### FINDING-1: Remaining "container-test" reference in active code — LOW

**File:** `platform/orchestrator/lib/workflow-engine.js:1436`
**Line:**
```javascript
const isPortalRepo = run.repo.includes("container-test") || run.repo.includes("dev-crew");
```

**Assessment:** This is a backwards-compatibility check that detects whether the current run targets the portal repo. The `"dev-crew"` check has already been added alongside `"container-test"`. This is **intentionally retained** for backwards compatibility — if a cycle run was started against the old `container-test` repo URL, it would still match. No security concern, but the `"container-test"` leg can be removed in a future cleanup once all old runs have aged out.

**Severity:** LOW (informational)
**Recommendation:** Add a comment `// TODO: remove "container-test" compat check after 2026-Q2` to track cleanup.

---

### FINDING-2: config.js has no hardcoded repo references — INFO (PASS)

**File:** `platform/orchestrator/lib/config.js`

The `githubRepo` field defaults to empty string (`process.env.GITHUB_REPO || ""`), not to any old repo name. No `Work-backlog`, `claude-ai-OS`, or `container-test` references found. This is correct — repo is always provided via environment variable.

**Severity:** INFO (no issue)

---

### FINDING-3: setup-workspace.sh template auto-apply — secure — INFO (PASS)

**File:** `platform/scripts/setup-workspace.sh`

The template auto-apply logic at lines 54-116:
1. Checks `if [[ ! -d "$WORKSPACE/Teams" ]]` before applying — correct guard
2. Copies from `/app/templates/*` (container-internal path) — no user-controlled input
3. Commits with descriptive message `"chore: scaffold agent team structure from dev-crew templates"`
4. Push failure is non-fatal (`if ! git push origin HEAD; then ... fi`)
5. All old references to `claude-ai-OS` have been removed from this file

**Security check — command injection:** The `sed` calls on lines 85-97 use `${PNAME}` which derives from `PROJECT_NAME` env var. This value is set by the orchestrator from `config.projectName` which reads from `process.env.PROJECT_NAME`. If a malicious `PROJECT_NAME` contained sed metacharacters (e.g., `|`, `/`), the sed substitutions use `|` as delimiter, so a project name containing `|` could break the sed command or inject unintended replacements.

**Severity:** LOW
**Recommendation:** Sanitize `PROJECT_NAME` before passing to sed, or use a tool that doesn't interpret metacharacters (e.g., `envsubst` or a simple `awk` gsub).

---

### FINDING-4: setup-cycle-workspace.sh — clean — INFO (PASS)

**File:** `platform/scripts/setup-cycle-workspace.sh`

- Line 12: `git config --global user.name "${GIT_AUTHOR_NAME:-dev-crew}"` — correctly uses `dev-crew` default
- Line 13: `git config --global user.email "${GIT_AUTHOR_EMAIL:-pipeline@dev-crew.local}"` — correct
- Line 38-66: Bootstrap uses `dev-crew` references throughout
- No old repo names found

**Severity:** INFO (no issue)

---

### FINDING-5: container-manager.js GIT_AUTHOR_NAME — clean — INFO (PASS)

**File:** `platform/orchestrator/lib/container-manager.js`

- Line 118-119: `GIT_AUTHOR_NAME=dev-crew`, `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local` — correct
- Line 238-239: Same in `spawnWorkerFromVolume` — correct
- No old repo names found

**Severity:** INFO (no issue)

---

### FINDING-6: server.js — clean — INFO (PASS)

**File:** `platform/orchestrator/server.js`

- Line 2: Comment says `dev-crew Orchestrator` — correct
- No references to old repo names found

**Severity:** INFO (no issue)

---

### FINDING-7: CLAUDE.md — clean — INFO (PASS)

**File:** `CLAUDE.md`

No references to `claude-ai-OS`, `container-test`, or `Work-backlog`. Project description correctly says `dev-crew`.

**Severity:** INFO (no issue)

---

### FINDING-8: portal/ and Source/ — clean — INFO (PASS)

No old repo references found in any `.ts`, `.tsx`, `.js`, `.json`, `.sh`, `.md`, `.yml`, or `.yaml` files under `portal/` or `Source/` (excluding `node_modules/`).

**Severity:** INFO (no issue)

---

### FINDING-9: tools/ and Teams/ — clean — INFO (PASS)

No old repo references found in `tools/` or `Teams/`.

**Severity:** INFO (no issue)

---

### FINDING-10: Documentation files retain historical references — INFO (expected)

**Files:**
- `docs/superpowers/specs/2026-03-24-parallel-container-cycles-design.md` — historical spec, mentions `claude-ai-OS` in git author config context
- `docs/superpowers/specs/2026-03-25-tiered-merge-pipeline-design.md` — historical spec, mentions `container-test`
- `docs/superpowers/specs/2026-03-27-dev-crew-repo-merge-design.md` — design doc explaining the merge of all three repos
- `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md` — implementation plan (the task source itself)
- `Plans/dev-crew-path-references/dispatch-plan.md` — dispatch plan with before/after examples

**Assessment:** These are historical design/planning documents that describe the repo merge. Updating them would destroy historical context. These references are expected and correct.

**Severity:** INFO (no action needed)

---

### FINDING-11: `git add -A` in scaffold step could commit sensitive files — LOW

**File:** `platform/scripts/setup-workspace.sh:106`
**Line:**
```bash
git add -A
```

**Assessment:** The scaffold step uses `git add -A` after copying templates, which stages ALL untracked files in the workspace — not just the template files. If the workspace contained leftover `.env` files, credentials, or other sensitive artifacts from a prior run, they would be committed and pushed. In practice, this runs on a freshly cloned repo in an ephemeral container, so the risk is minimal. But a `.gitignore` should be in place or `git add` should target specific directories (`Teams/`, `Plans/`, `tools/`, `CLAUDE.md`).

**Severity:** LOW
**Recommendation:** Replace `git add -A` with explicit `git add Teams/ Plans/ tools/ CLAUDE.md` to limit scope.

---

### FINDING-12: Credential file written to disk in setup-workspace.sh — INFO (pre-existing)

**File:** `platform/scripts/setup-workspace.sh:123-134`

The `CLAUDE_SESSION_TOKEN` is written to `/root/.claude/.credentials.json` with `chmod 600`. This is pre-existing behavior, not introduced by this task. Permissions are correctly restricted.

**Severity:** INFO (no regression)

---

## Security Checklist

| Check | Result |
|-------|--------|
| Command injection in shell scripts | LOW risk in sed with PROJECT_NAME (Finding 3) |
| Secrets leakage | PASS — no hardcoded tokens, GITHUB_TOKEN from env only |
| GITHUB_TOKEN handling | PASS — token injected via env, not in committed files |
| Old repo URLs that could redirect | PASS — no hardcoded repo URLs in active code |
| Path traversal in template copy | PASS — copies from fixed `/app/templates/` path |
| Git config identity spoofing | PASS — uses `dev-crew` identity, not old names |
| Architecture violations | PASS — no direct DB calls, no framework imports in business logic |
| Observability | N/A — no new routes or endpoints added |
| `git add -A` scope in scaffold | LOW — could commit unintended files (Finding 11) |
| Credential file permissions | PASS — chmod 600 on credentials.json (Finding 12) |
| Traceability enforcer | PASS — all requirements have implementation references |
| E2E test URLs | PASS — tests use relative paths, baseURL from pipeline config |

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 0 | — |
| LOW | 3 | Finding 1 (container-test compat), Finding 3 (sed injection), Finding 11 (git add -A scope) |
| INFO | 9 | All passing checks |

**Verdict:** The path reference update is complete and correct for all active code paths. The three LOW findings are minor:
1. A backwards-compat `"container-test"` string check that is intentionally retained
2. A theoretical sed injection via PROJECT_NAME that requires attacker control of environment variables (mitigated by Docker isolation)
3. A `git add -A` that could theoretically commit unintended files in the scaffold step (mitigated by ephemeral container)

No blocking issues. Safe to merge.

RISK_LEVEL: low
