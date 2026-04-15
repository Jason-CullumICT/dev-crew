# Backend Coder Learnings

## 2026-04-15: Playwright Docker Optimization Feature — Scope Mismatch

### Feature: "Bake Playwright into worker Docker image to eliminate per-cycle reinstall"
- ALL implementation is in `platform/` (Dockerfile.worker, workflow-engine.js) — HARD LIMIT for pipeline agents
- FRs are FR-PW-001, FR-PW-002 (platform/), FR-PW-003 (Specifications/)
- NO `[backend]` FRs exist in Source/Backend/ for this feature
- This feature MUST be executed as a solo session, not a pipeline agent
- Key changes needed: `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` in Dockerfile.worker; remove per-cycle install blocks in `_runPlaywrightE2E()` in workflow-engine.js; update env var from `/workspace/.playwright` to `/ms-playwright`
- Requirements spec is at Plans/pipeline-optimisations/requirements.md

## 2026-04-14: Dependency Tracking (FR-dependency-*)

### Shared types already defined in Source/Shared/types/workflow.ts
- `DependencyLink`, `DependencyBlockageReason`, `DependencyActionRequest`, `ReadinessCheckResponse`
- `RESOLVED_STATUSES` (Completed, Rejected, Failed) — blockers that unblock dependents
- `DISPATCH_TRIGGER_STATUSES` (Completed, Rejected) — trigger cascade auto-dispatch
- `WorkItem.blockedBy`, `WorkItem.blocks`, `WorkItem.hasUnresolvedBlockers` — stored on the item

### Dependency service design (Source/Backend/src/services/dependency.ts)
- BFS cycle detection: start from `fromId`, follow `blocks` links, check if `toId` reachable
- `computeHasUnresolvedBlockers` runs live against store (accurate without stale flag)
- `isReady` returns ReadinessCheckResponse with unresolved blocker list
- `onItemResolved` called after reject/complete to cascade auto-dispatch Approved+ready dependents
- `setDependencies` removes all existing then adds new (bulk replace pattern)

### Route integration patterns
- Dependency endpoints added to `src/routes/workflow.ts` (same file as workflow actions)
- Self-ref → 400, not found → 404, cycle → 409
- Dispatch gating: check `computeHasUnresolvedBlockers` before allowing in-progress transition
- Cascade: call `onItemResolved` after reject handler
- `blockedBy` field in PATCH handled by calling `setDependencies` before other field updates

### Metrics (src/metrics.ts)
- `dependency_operations_total` — action label: add/remove/set
- `dispatch_gating_events_total` — event label: blocked/cascade_dispatched
- `cycle_detection_events_total` — detected label: true/false

### Test patterns
- Store tests: use `store.resetStore()` in beforeEach
- Service tests directly use store module — no HTTP overhead needed
- Route tests: addDependency() from service to seed state before HTTP calls
- 52 new tests added (total 146, all pass)

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
