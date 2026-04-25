# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-04-25

### Spec Coverage Trend
- **FR-WF-*** (self-judging workflow): **13/13 — 100%** (enforcer passes)
- **FR-dependency-*** (dependency tracking in Source/): **14/16 — ~88%** (search route missing, metrics histogram missing)
- **Overall Source/ coverage: ~93%**

### Key File Paths for Future Audits
| Purpose | Path |
|---------|------|
| Shared types | `Source/Shared/types/workflow.ts` |
| Backend entry | `Source/Backend/src/app.ts` |
| Backend routes | `Source/Backend/src/routes/` (workItems.ts, workflow.ts, dashboard.ts, intake.ts) |
| Backend services | `Source/Backend/src/services/` (router, assessment, changeHistory, dashboard, dependency) |
| In-memory store | `Source/Backend/src/store/workItemStore.ts` |
| Metrics | `Source/Backend/src/metrics.ts` |
| Logger (canonical) | `Source/Backend/src/utils/logger.ts` (wrapper at `src/logger.ts`) |
| Frontend API client | `Source/Frontend/src/api/client.ts` |
| Frontend pages | `Source/Frontend/src/pages/` |
| Frontend hooks | `Source/Frontend/src/hooks/` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Active requirements | `Plans/self-judging-workflow/requirements.md` (auto-selected, most recent mtime) |

### Patterns and Gotchas

1. **Two separate applications in this repo**: `Source/` = self-judging workflow engine; `portal/` = dev-workflow-platform. The Specifications/ files cover BOTH but the traceability enforcer only scans `Source/` and `E2E/`.

2. **FR-dependency-* ID collision**: The dependency-linking plan (for `portal/`) uses the same `FR-dependency-*` ID namespace as the Source/ implementation. When running the enforcer against `Plans/dependency-linking/requirements.md`, it FAILS with 7 false positives because:
   - FR-0002..FR-0007 appear in that doc as *seed data item IDs*, not requirement IDs (the enforcer regex `FR-[A-Z0-9-]+` is too broad)
   - FR-070 and FR-085 are referenced but don't exist in `Specifications/dev-workflow-platform.md`

3. **Traceability enforcer picks only the most recently modified requirements.md** — run with `--file` to target a specific plan. The dependency-linking plan cannot be verified by the auto-picker.

4. **Two logger files**: `src/utils/logger.ts` (canonical) and `src/logger.ts` (compatibility wrapper). The store uses `utils/logger` directly; all routes/services use the wrapper. Both are fine for now.

5. **Error field mismatch (P2)**: Backend returns `{ error: "..." }` but frontend `client.ts` checks `body.message`. Error text from the API never surfaces in the UI.

6. **Search route not wired (P2)**: `GET /api/search` has tests (`Source/Backend/tests/routes/search.test.ts`) that self-annotate as intentionally failing until the route is implemented. No route file exists in `Source/Backend/src/routes/search.ts` and app.ts doesn't register it.

7. **Duplicate test files**: WorkItemListPage and WorkItemDetailPage each have two test files — one in `tests/` root and one in `tests/pages/`. Both are active. Consolidate to avoid confusion.

8. **`dependencyCheckDuration` histogram missing**: FR-dependency-metrics requires 4 metrics; only 3 are in `metrics.ts` (the Histogram is absent).

9. **Logger doesn't distinguish dev vs prod**: `utils/logger.ts` always emits JSON. Spec requires pretty-printing in development.

10. **OTel tracing unimplemented**: CLAUDE.md requires OpenTelemetry; no OTel packages installed anywhere in Source/.

### Common Violation Patterns
- `eslint-disable-next-line react-hooks/exhaustive-deps` used in 2 source files (DependencyPicker.tsx, useWorkItems.ts)
- Non-standard Verifies comment in DebugPortalPage.tsx (`// Verifies: dev-crew debug portal` — not an FR ID)
