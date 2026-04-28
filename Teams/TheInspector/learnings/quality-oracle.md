# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-04-28 — Full Audit

### Spec Coverage Trend

**First run — establishing baseline.**

The project contains THREE distinct specifications, each targeting a different layer:

| Spec | File | FR IDs | Implementation Layer | Traceability Gate? |
|------|------|--------|---------------------|-------------------|
| Workflow Engine | `Specifications/workflow-engine.md` | FR-WF-001..013 | `Source/` | ✅ Plans gate (enforcer passes) |
| Dev Workflow Platform | `Specifications/dev-workflow-platform.md` | FR-001..069, FR-dependency-* | `portal/` | ❌ NOT checked by enforcer |
| Tiered Merge Pipeline | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001..010 | `platform/orchestrator/` | ❌ NOT checked by enforcer |

**The traceability enforcer only checks Plans/, not Specifications/.** It targets the most recently modified `requirements.md` in Plans/. On this run it picked `Plans/self-judging-workflow/requirements.md` (13 FRs for the workflow engine). The portal (85+ FRs) and pipeline (10 FRs) are entirely outside its scope.

### Coverage Numbers (2026-04-28)

- **Source/ (workflow engine):** 13/13 FR-WF-* verified = **100%** (via enforcer gate)
- **portal/ (dev-workflow-platform):** ~82/85 verified (3 items from dependency delta still open) = **~96%** (manual estimate, no gate)
- **platform/orchestrator/ (tiered-merge):** ~4/10 FR-TMP-* tested = **~40%** (no gate)

### Known Open Findings (from this run)

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| `GET /api/search` not wired in workflow engine app.ts | P1 | `Source/Backend/src/app.ts` | OPEN — 5 tests failing |
| Traceability enforcer blind to portal + pipeline specs | P2 | `tools/traceability-enforcer.py` | OPEN |
| `dependencyCheckDuration` histogram missing from Source metrics | P2 | `Source/Backend/src/metrics.ts` | OPEN |
| Portal `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by?` | P2 | `portal/Shared/api.ts` | OPEN |
| Portal `seed.ts` not created | P2 | `portal/Backend/src/database/` | OPEN |
| Portal `DependencySection.test.tsx` + `BlockedBadge.test.tsx` missing | P2 | `portal/Frontend/tests/` | OPEN |
| Dual logger abstraction in Source/Backend | P3 | `Source/Backend/src/logger.ts` | OPEN |
| eslint-disable in production frontend | P3 | `DependencyPicker.tsx:82`, `useWorkItems.ts:63` | OPEN |

### Useful File Paths for Future Audits

- Spec files: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Enforcer: `tools/traceability-enforcer.py` — reads Plans/, not Specifications/
- Plan reqs for workflow engine: `Plans/self-judging-workflow/requirements.md` (13 FRs)
- Plan reqs for dependency linking: `Plans/dependency-linking/requirements.md` (implementation delta table at end of file)
- Source metrics: `Source/Backend/src/metrics.ts` (3 counters, missing histogram)
- Portal api types: `portal/Shared/api.ts` (missing `blocked_by?` in Update types)
- Portal db layer: `portal/Backend/src/database/` (schema.ts ✅, connection.ts ✅, seed.ts ❌)
- Portal frontend tests: `portal/Frontend/tests/` (DependencyPicker.test.tsx ✅, missing Section + Badge tests)
- Failing tests: `Source/Backend/tests/routes/search.test.ts` (5 tests, all 404 because route not mounted)

### Common Pattern Violations Found

- eslint-disable-next-line react-hooks/exhaustive-deps appears in production code without explanation
- Two logger abstractions (src/logger.ts wraps src/utils/logger.ts) — creates interface divergence
- Verifies comments use free-text in DebugPortalPage.tsx rather than FR-XXX format

### Grading Calibration (inspector.config.yml)

- A grade: max_p1=0, max_p2=3, min_spec_coverage=80%
- Current: 1 P1 (search route), 5 P2s → **Grade: C** (P1 exists → max_p1 exceeded for A/B)
- Fix the search route → no P1, 5 P2s → Grade: B
- Fix search + 3 portal items → 2 P2s → Grade: A
