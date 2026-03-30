# Backend Coder Learnings

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

## 2026-03-30: Dependency Linking (backend-coder-2)

### Dependency ordering bug
- `createBug` and `createFeatureRequest` had dependencies set via `setDependencies()` BEFORE the INSERT into the DB. Since `setDependencies()` calls `verifyItemExists()`, this would fail with a 404. Fixed by moving INSERT before dependency setup.

### Service layer patterns
- `mapBugRow` and `mapFRRow` hydrate dependency fields (blocked_by, blocks, has_unresolved_blockers) on every read — the DependencyService is instantiated per call
- Dispatch gating is done in the update service methods, not in route handlers — keeps route handlers thin
- Cascade on completion uses `onItemCompleted()` which checks all items blocked by the completing item and auto-dispatches any in `pending_dependencies` status

### Testing patterns
- Tests for dispatch gating need to create items with `blocked_by` on create, then test status transitions
- For FR dispatch gating tests, must walk the full status transition chain: potential → voting → approved (gated) since FR has strict transition rules
- Cross-type dependencies (bug blocked by FR, FR blocked by bug) work and are important to test

## 2026-03-30: Duplicate/Deprecated Tagging (backend-coder-1)

### Already-implemented code
- The dependency-linking cycle (commit de058016) already fully implemented all backend gaps for duplicate/deprecated tagging: route handlers pass `duplicate_of`/`deprecation_reason`, FR service has full validation, both list endpoints support `include_hidden`, and comprehensive tests exist at `portal/Backend/tests/duplicate-deprecated.test.ts`
- When a dispatch plan identifies gaps, always verify current code state before implementing — prior cycles may have closed them

### FR service duplicate/deprecated patterns
- Bug service uses an explicit terminal-status guard (`if bug.status === 'duplicate' || bug.status === 'deprecated'`) while FR service relies on STATUS_TRANSITIONS map having empty arrays for terminal statuses — both approaches work
- `duplicate_of` validation queries same-type table only (bugs→bugs, FRs→FRs) — cross-type duplicates are not in scope
- Both services clear the opposite field when setting duplicate/deprecated (e.g., clear `deprecation_reason` when marking as duplicate)
