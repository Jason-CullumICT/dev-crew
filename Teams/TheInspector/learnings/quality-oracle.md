# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Log

### 2026-09-05 — First full audit

**Grade: D** | Spec coverage: ~25%

---

## Structural Learnings

### Two separate codebases coexist in this repo
- `Source/` implements the **workflow-engine.md** spec (in-memory WorkItem store, FR-WF-* IDs)
- `portal/` implements the **dev-workflow-platform.md** spec (SQLite FRs/Bugs/Cycles, FR-001-069)
- `Specifications/` contains specs for BOTH systems — do not assume all specs target `Source/`
- When inspecting, always check which spec targets which directory

### Traceability enforcer scope is narrow
- `tools/traceability-enforcer.py` auto-selects the most-recently-modified `Plans/*/requirements.md`
- It currently targets `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* IDs only)
- It does NOT scan `Specifications/` at all — two spec files with 79 requirements are invisible
- **Fix needed**: add `--spec-dir Specifications/` mode or extend auto-discovery

### FR-dependency-* IDs exist in BOTH codebases
- `Source/Backend/src/services/dependency.ts` implements FR-dependency-* for the workflow engine
- `portal/Backend/src/services/dependencyService.ts` implements FR-dependency-* for the portal app
- The Plans/dependency-linking/requirements.md delta table tracks portal/ status, not Source/

### Plans/dependency-linking has known open deltas (as of 2026-09-05)
- ❌ FR-dependency-api-types: `as any` cast in portal frontend DependencyPicker
- ❌ FR-dependency-seed: no `portal/Backend/src/database/seed.ts` exists

---

## Fast-Path File Locations

| What | Where |
|------|-------|
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Dependency plan requirements | `Plans/dependency-linking/requirements.md` |
| Workflow engine spec | `Specifications/workflow-engine.md` |
| Platform spec (portal/) | `Specifications/dev-workflow-platform.md` |
| Merge pipeline spec | `Specifications/tiered-merge-pipeline.md` |
| Backend metrics | `Source/Backend/src/metrics.ts` |
| Backend store | `Source/Backend/src/store/workItemStore.ts` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |

---

## Prior P1/P2 Findings (for re-verification on next run)

| ID | Severity | File | Claim | Status |
|----|----------|------|-------|--------|
| QO-001 | P1 | tools/traceability-enforcer.py | Enforcer covers only 13/108 requirements — 79 invisible | OPEN |
| QO-002 | P2 | Specifications/dev-workflow-platform.md | 69 FRs have zero Source/ implementation | OPEN |
| QO-003 | P2 | Specifications/tiered-merge-pipeline.md | 10 FR-TMP-* have zero Source/ implementation | OPEN |
| QO-004 | P2 | Source/Backend/src/metrics.ts:40 | dependencyCheckDuration histogram missing | OPEN |
| QO-005 | P2 | DependencyPicker.tsx + portal/Backend seed | FR-dependency-api-types (as any) + seed.ts missing | OPEN |

---

## Spec Coverage Trend

| Date | Coverage | Grade |
|------|----------|-------|
| 2026-09-05 | ~25% | D |
