# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-28 (Grade C)

### Spec Coverage Trend
- First audit. Baseline: **79% compliance** (22/28 Source/ requirements fully compliant).
- FR-WF-* (self-judging workflow): **100% traced, 100% compliant**.
- FR-dependency-*: **100% traced, 73% compliant** (3 deviations + 1 unimplemented route).

### Key Findings (P1/P2 for re-verification next run)

| ID | Severity | Finding | File |
|----|----------|---------|------|
| QO-001 | P1 | `GET /api/search` NOT registered in `app.ts`; 5 tests intentionally failing | `Source/Backend/src/app.ts` |
| QO-002 | P2 | `dependencyCheckDuration` histogram missing from `metrics.ts` | `Source/Backend/src/metrics.ts` |
| QO-003 | P2 | `BlockedBadge` missing amber `pending_dependencies` state; no `status` prop | `Source/Frontend/src/components/BlockedBadge.tsx` |
| QO-004 | P2 | dispatch-gating returns 400 instead of transitioning to `pending_dependencies` status | `Source/Backend/src/routes/workflow.ts:230-245` |
| QO-005 | P2 | Traceability enforcer uses most-recently-modified plan fallback; misses FR-dependency-* | `tools/traceability-enforcer.py` |
| QO-008 | P2 | portal/ missing `blocked_by` in UpdateBugInput/UpdateFeatureRequestInput and seed.ts | `portal/Shared/api.ts`, `portal/Backend/src/database/` |

### Useful File Paths for Future Audits
- **Specs**: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- **Active plan requirements**: `Plans/self-judging-workflow/requirements.md` (FR-WF-*), `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- **Enforcer**: `tools/traceability-enforcer.py` — always run with explicit `--plan` args; default fallback is unreliable
- **Source metrics**: `Source/Backend/src/metrics.ts` — 3/4 FR-dependency-metrics implemented (missing histogram)
- **Source app wiring**: `Source/Backend/src/app.ts` — check this first for any "route exists in tests but not app" gaps
- **Portal shared types**: `portal/Shared/api.ts` — dependency field gaps confirmed here

### Common Pattern Violations Found
1. **Unregistered routes with tests**: The `search.test.ts` explicitly documents the gap. Pattern: check `app.ts` for every route file in `src/routes/`; any route file NOT imported in `app.ts` is a gap.
2. **Spec component props**: Check that component props match ALL spec states, not just the primary one. `BlockedBadge` is a clean example of "implement the easy half and leave the edge case".
3. **Metric completeness**: Always verify all metric types (Counter, Histogram, Gauge) — Histograms are more expensive and are the most likely to be skipped.
4. **Enforcer scope**: The enforcer is powerful but targeted. Running it against one plan gives false confidence about overall compliance. Always run against all active plans.

### Architecture Notes
- `Source/` implements the **workflow engine** spec (`workflow-engine.md` + `Plans/self-judging-workflow/`). It uses an in-memory store, NOT SQLite.
- `portal/` implements the **dev-workflow-platform** spec (`dev-workflow-platform.md`). It uses SQLite with better-sqlite3.
- `platform/` implements the **tiered-merge-pipeline** spec. Do NOT touch this directory.
- FR-dependency-* IDs appear in BOTH specs but were separately adapted for each app. The Source/ adaptation differs from the portal/ implementation (no `pending_dependencies` status in Source/).
- `Source/Shared/types/workflow.ts` is the shared type source for Source/Backend and Source/Frontend. `portal/Shared/` is separate.
