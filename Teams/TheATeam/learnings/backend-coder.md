# Backend Coder Learnings

## 2026-03-30: Duplicate/Deprecated Status (backend-coder-1)

### Gap analysis pattern
- Bug service already fully implemented duplicate/deprecated — feature request service was the gap
- `mapFRRow()` was missing `duplicate_of`, `deprecation_reason`, and `duplicated_by` fields
- Routes were not forwarding `duplicate_of`/`deprecation_reason` from req.body to services

### Implementation pattern
- Copy bug service patterns exactly for feature request service — same validation, same field clearing logic
- `duplicated_by` computed via reverse query: `SELECT id FROM [table] WHERE duplicate_of = ?`
- Hidden status filtering uses `HIDDEN_STATUSES` constant with `AND status NOT IN (...)` clause
- `duplicate`/`deprecated` are terminal — STATUS_TRANSITIONS maps them to `[]` (no outgoing transitions)
- When marking duplicate: clear `deprecation_reason`; when marking deprecated: clear `duplicate_of`

### Testing
- 19 new tests added across bugs.test.ts and featureRequests.test.ts
- Tests cover: include_hidden filtering, route forwarding, validation (missing duplicate_of, self-ref, non-existent ref), duplicated_by computation, terminal status blocking
- All 508 backend tests pass, TypeScript type-check passes

### E2E Test Results
- 10 of 14 E2E tests pass (all API-only tests)
- 4 UI-only E2E tests fail because they need a running frontend (Vite dev server) — frontend-coder scope
- Original E2E failures were `net::ERR_CONNECTION_REFUSED` because no server was running at port 5102
- Fix: start backend with `PORT=5102` to match `playwright.pipeline.config.ts` baseURL
- The E2E config at `Source/E2E/playwright.pipeline.config.ts` uses port 5102, not the default 3001

## 2026-03-25: Tiered Merge Pipeline (backend-coder-2)

### dispatch.js patterns
- `buildAgentPrompt()` signature: `(role, task, team, planCtx, runId)` — runId is the 5th param, added for FR-TMP-002
- `parseDispatchPlan()` signature: `(leaderOutput, task, team, runId)` — runId is the 4th param
- QA agents (non-impl roles) get E2E test generation instructions when runId is present
- `enrichTaskForLeader()` appends risk classification instructions to the task before leader planning

### workflow-engine.js integration
- `_parseDispatchFromWorker()` accepts `runId` as 5th param, passes it through to `buildAgentPrompt()`
- The leader task is enriched via `dispatch.enrichTaskForLeader()` before being passed to `run-team.sh`
- Backend-coder-1 owns workflow-engine.js and config.js — coordinate on interface changes

### Dockerfile.worker
- gh CLI installed via apt from GitHub's official package repo
- Placed before Claude Code install to keep layer caching efficient
- Auth handled via GITHUB_TOKEN env var already passed to workers

### server.js
- `GET /api/runs` list endpoint destructures and re-maps fields — must add new fields explicitly
- `GET /api/runs/:id` returns full run object — new fields included automatically

## 2026-03-25: Tiered Merge Pipeline (backend-coder-1)

### workflow-engine.js — new phases and methods
- Phase 1b: Risk extraction uses `/RISK_LEVEL:\s*(low|medium|high)/i` regex on leaderResult.stdout
- Phase 5.5: `_runPlaywrightE2E()` — runs Playwright E2E tests in worker, gracefully skips on any failure
- Phase 6.5: `_createPR()`, `_aiReviewPR()`, `_autoMerge()` — full PR lifecycle
- E2E feedback loop shares counter with QA feedback loop (max 2 total per run)
- All new methods wrap in try/catch with graceful degradation — pipeline never breaks from new code
- Playwright JSON output parser walks `report.suites[].specs[].tests[]` recursively

### config.js — new tiered merge config
- `mergeStrategy`, `defaultRiskLevel`, `autoMergeLow`, `autoMergeMedium`
- `AUTO_MERGE_LOW` and `AUTO_MERGE_MEDIUM` use `!== "false"` pattern (default true)

### Testing patterns
- Node built-in test runner (`node --test`) works well for this project — no test framework needed
- Mock `containerManager.execInWorker()` with label-based routing (opts.label) for targeted mock responses
- All 26 tests pass covering FR-TMP-001, 003, 004, 005, 006, 007, 009, 010

### Interface contract with backend-coder-2
- `_parseDispatchFromWorker()` now passes `run.id` to dispatch calls per the 5th param contract
- `enrichTaskForLeader()` is called by coder-2's dispatch.js changes — workflow engine passes raw task
