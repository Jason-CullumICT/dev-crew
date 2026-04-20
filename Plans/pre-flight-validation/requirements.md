# Requirements: Pre-Flight Validation on Work Submission

**Feature:** Fail-fast validation at `POST /api/work` — detect invalid GitHub token or missing repo/branch before a run is created.

**Status:** APPROVED  
**Last updated:** 2026-04-14

---

## Verdict: APPROVED

The feature is clear, feasible, and testable. The problem is well-defined: `POST /api/work` creates a pipeline run with zero GitHub credential validation, causing failures 5+ minutes deep in a container. The fix is a synchronous pre-flight gate before the run record is created.

### Architectural Constraint (CRITICAL)

All backend changes target **`platform/orchestrator/`** — the orchestrator infrastructure. Per `CLAUDE.md`, `platform/` is **solo-session only**. Pipeline agents (backend-coder) **MUST NOT** touch this directory. Backend FRs must be executed by a solo session, not routed through `TheATeam` backend-coder.

Portal frontend changes target **`portal/`** and CAN go through a frontend-coder pipeline agent.

### Existing Infrastructure

| Component | File | Status |
|-----------|------|--------|
| `validateOrCreateRepo()` | `platform/orchestrator/server.js:769` | EXISTS — but has side effects (creates repos), wrong for pre-flight |
| `/api/repos/validate` | `platform/orchestrator/server.js:818` | EXISTS — but not called by `/api/work` |
| `config.githubToken` | `platform/orchestrator/lib/config.js:12` | EXISTS — server token |
| Error display in portal submit | `portal/Frontend/src/components/bugs/BugDetail.tsx:290` | EXISTS — generic `error` state, needs pre-flight distinction |

**Gap:** `POST /api/work` never calls any validation before creating and persisting a run. Branch existence is never checked anywhere.

---

## Functional Requirements

| ID | Description | Layer | Scope | Weight | Acceptance Criteria |
|----|-------------|-------|-------|--------|---------------------|
| FR-preflight-validator | Create `platform/orchestrator/lib/github-validator.js` with two read-only functions: `validateRepoAccess(repoFullName, token)` and `validateBranchExists(repoFullName, branch, token)`. No side effects — do NOT create repos. `validateRepoAccess` throws `{status:401, message:"..."}` if token missing/invalid; throws `{status:404, message:"Repo <name> not found or token lacks access"}` on 404; throws `{status:500, message:"GitHub API error: <status>"}` on other HTTP errors. `validateBranchExists` throws `{status:404, message:"Branch <branch> not found in <repo>"}` if branch does not exist. | [backend] | platform/ solo-session | M | Module exports both functions; both work with mocked `fetch`; no imports outside Node stdlib + config |
| FR-preflight-gating | In `platform/orchestrator/server.js` `POST /api/work` handler: after extracting `repo`/`repoBranch` fields, resolve `resolvedRepo = repo \|\| config.githubRepo` and `resolvedBranch = repoBranch \|\| config.githubBranch`; if `resolvedRepo` is non-empty AND `config.githubToken` is set, call `validateRepoAccess` then `validateBranchExists` **before** `saveRun(run)` and the 201 response; on validation error return the error's `status` code and `{error: message}` JSON immediately; skip validation if `resolvedRepo` is empty (backwards compat when no repo is configured). | [backend] | platform/ solo-session | S | `POST /api/work` with bad token returns 401 before run is created; missing repo returns 404; missing branch returns 404 with branch name in message; valid credentials return 201 as before; no run saved on failure |
| FR-preflight-tests | Create `platform/orchestrator/lib/github-validator.test.js` using `node:test` and `node:assert/strict`. Mock `fetch` globally. Cover: (1) missing token → 401, (2) valid token + existing repo → resolves, (3) valid token + 404 repo → 404, (4) GitHub API 403 → 401 with access message, (5) valid repo + existing branch → resolves, (6) valid repo + 404 branch → 404 with branch name. | [backend] | platform/ solo-session | M | `node --test platform/orchestrator/lib/github-validator.test.js` passes; each test has `// Verifies: FR-preflight-validator` or `FR-preflight-gating` comment |
| FR-preflight-error-display | In `portal/Frontend/src/components/bugs/BugDetail.tsx` and `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`: in the `submitWork` catch handler, inspect the HTTP status code of the error. If status is 401, 403, or 404, set `error` to the server's `error` field from the JSON response body and render it inside a distinct amber `PreflightError` box (not the generic red paragraph) with a header "Pre-flight check failed" and an actionable hint per code: 401 → "Check GITHUB_TOKEN on the server", 404 → show server message verbatim. Use the existing `error` state but add a `preflightError: boolean` flag to conditionally switch the box style. | [frontend] | portal/ pipeline-OK | S | Submitting to an inaccessible repo shows amber box with "Pre-flight check failed" header + actionable hint; 201 submission still works; existing generic error (500) still shows as red; each branch has `// Verifies: FR-preflight-error-display` comment |

---

## Scoping Plan

```
Backend (platform/ — solo-session only):
  FR-preflight-validator  M = 2 pts
  FR-preflight-gating     S = 1 pt
  FR-preflight-tests      M = 2 pts
  ─────────────────────────────────
  Total backend: 5 pts → 1 solo session

Frontend (portal/ — pipeline-OK):
  FR-preflight-error-display  S = 1 pt
  ────────────────────────────────────
  Total frontend: 1 pt → 1 frontend-coder
```

---

## Assignment

- **Solo Session (platform/):** FR-preflight-validator [M], FR-preflight-gating [S], FR-preflight-tests [M] — 5 pts total
- **Frontend Coder 1 (portal/):** FR-preflight-error-display [S] — 1 pt

---

## Implementation Notes

### Token resolution
The GitHub token is always `config.githubToken` (env: `GITHUB_TOKEN`). There is no per-request GitHub token — `claudeSessionToken` is for Anthropic, not GitHub. Validation uses the server-level token only.

### Backwards compatibility
If `resolvedRepo` is empty (no `repo` in request AND no `config.githubRepo` configured), skip pre-flight — the run proceeds as before. This preserves existing behaviour for installations without a configured repo.

### Skip when pipelineMode is local
When `pipelineMode` is `"local"` (default), the repo/branch are still needed for git push at end of cycle. However, a local pipeline may legitimately omit `repo`. The gate should only run when `resolvedRepo` is non-empty.

### GitHub API calls
Use the existing native `fetch` (Node 18+) with:
```js
GET https://api.github.com/repos/{fullName}
Authorization: token {githubToken}
Accept: application/vnd.github.v3+json
```
For branch: `GET https://api.github.com/repos/{fullName}/branches/{branch}`

### Error status mapping
| GitHub API response | Returned to client |
|--------------------|--------------------|
| 401 Unauthorized | 401 — token invalid |
| 403 Forbidden | 401 — token lacks access (present but no permission) |
| 404 on repo | 404 — repo not found or no access |
| 404 on branch | 404 — branch not found |
| Other 4xx/5xx | 500 — GitHub API error |

### Spec gap
`Specifications/workflow-engine.md` and `Specifications/dev-workflow-platform.md` do not cover pre-flight validation for work submission. **A solo session should add a "Pre-flight Validation" section to `Specifications/workflow-engine.md`** before or alongside implementation to keep spec-first discipline.
