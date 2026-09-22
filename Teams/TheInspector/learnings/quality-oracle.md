# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Codebase Structure (critical for future audits)

- **Two separate applications share one repo**:
  - `Source/` → implements **workflow-engine.md** spec (Self-Judging Workflow Engine, FR-WF-* IDs)
  - `portal/` → implements **dev-workflow-platform.md** spec (Dev Workflow Platform, FR-001..FR-069)
  - These are distinct apps with distinct domains and FR namespaces
- The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` + `E2E/`. Running it against `Specifications/dev-workflow-platform.md` will ALWAYS report 76 missing requirements because those FRs live in `portal/`, not `Source/`.
- Plans are in `Plans/` with their own `requirements.md` files. The enforcer's default mode picks the most-recently-modified requirements file (usually `Plans/self-judging-workflow/requirements.md` which covers FR-WF-*).

### Traceability Enforcer Issues (fix before running reports)

1. **Regex bug**: `re.compile(r"FR-[A-Z0-9-]+")` in `tools/traceability-enforcer.py` matches "FR-1" inside "NFR-1". Running against `tiered-merge-pipeline.md` generates phantom FR-1, FR-2, FR-3. Fix: use word-boundary anchored regex `r"\bFR-[A-Z0-9-]+"`.
2. **Scope too narrow**: `source_dirs = ["Source", "E2E"]` — portal/ is excluded. Add `portal/` to the scan for portal-spec checks.

### Key FR Coverage (2026-09-22 baseline)

- **FR-WF-001 to FR-WF-013**: All 13 requirements traced in Source/ ✅ (traceability enforcer passes)
- **FR-dependency-***: All 14 requirements traced in Source/ ✅
- **dev-workflow-platform.md FR-001..FR-069**: Implemented in portal/ (not verified by enforcer as configured)
- **tiered-merge-pipeline.md FR-TMP-***: No implementation found in Source/ or portal/

### Missing Implementation (confirmed gaps in Source/)

- `dependencyCheckDuration` histogram missing from `Source/Backend/src/metrics.ts` — FR-dependency-metrics requires it
- No route latency histogram/middleware in Source/Backend (CLAUDE.md architecture rule: "Auto-collect route latency via middleware")
- No OpenTelemetry instrumentation initialized in Source/Backend/src/app.ts (CLAUDE.md architecture rule)
- `/approve` endpoint lacks dependency gating — only `/dispatch` endpoint gates on unresolved blockers

### Useful File Paths

- `Source/Backend/src/metrics.ts` — all Prometheus counters
- `Source/Backend/src/app.ts` — Express app, middleware chain
- `Source/Shared/types/workflow.ts` — all WorkItemStatus enum values + VALID_STATUS_TRANSITIONS
- `Source/Backend/src/services/dependency.ts` — dependency service (BFS cycle detection, cascade dispatch)
- `Source/Backend/src/routes/workflow.ts` — 374 lines, largest route file; contains dispatch gating
- `tools/traceability-enforcer.py` — scans Plans/{latest}/requirements.md for FR-IDs, then checks Source/

### ESLint Suppressions

- `Source/Frontend/src/hooks/useWorkItems.ts:63` — `eslint-disable-next-line react-hooks/exhaustive-deps`
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — same suppression

### Duplicate Test Files (P4 debt)

- `WorkItemDetailPage`: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368L) AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393L) — both testing same component
- `WorkItemListPage`: `Source/Frontend/tests/WorkItemListPage.test.tsx` (286L) AND `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262L)

### Spec Coverage Trend

- First audit run: 2026-09-22
- Source/ app: Self-judging workflow engine spec fully traced (100% FR-WF-*, FR-dependency-*)
- Source/ app: 4 implementation gaps vs architecture rules (histogram, OTel, latency middleware, approve gating)
