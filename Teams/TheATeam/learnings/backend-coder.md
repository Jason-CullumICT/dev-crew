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

## 2026-03-30: Dependency Linking Verification (backend-coder-1)

### Seed script patterns
- `seedKnownDependencies()` in `portal/Backend/src/database/seed-dependencies.ts` gracefully handles missing items (404) by skipping
- `addDependency()` uses INSERT OR IGNORE so seeding is idempotent — no errors on duplicate runs
- Seed script is a pure function taking a db handle, not tied to HTTP context — can be called from startup or tests

### VotingService test control
- `VoteSimulatorOptions.random` accepts `() => number` — use `{ random: () => 0.01 }` to force all agents to approve (value < approveThreshold)
- There is no `fixedOutcome` option — must use the injectable random function

### Dispatch gating verification
- Bug dispatch gating triggers on `in_development` status (no approval step for bugs)
- FR dispatch gating triggers on both `approved` and `in_development` (via DISPATCH_TRIGGER_STATUSES)
- FR approval through `approveFeatureRequest()` also checks dispatch gating — gated FRs go to `pending_dependencies`
- `RESOLVED_STATUSES` includes `duplicate` and `deprecated` (added by FR-DUP), so those also trigger cascade
