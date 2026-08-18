# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-18

### Spec Coverage Trend
- **Active plans (self-judging-workflow + dependency-linking):** 93.8% — healthy
- **Specifications/ directory:** 0% — the `Specifications/dev-workflow-platform.md` describes a SQLite-backed feature-request/bug system; `Source/` implements an in-memory work-item workflow engine. These are different applications. Either the spec is obsolete (needs archiving) or this is catastrophic drift.

### Key Structural Findings

1. **The spec/source application mismatch is the #1 issue.** `Specifications/dev-workflow-platform.md` (74 FRs, FR-001 to FR-069+) covers a completely different app than what `Source/` implements. Before any future spec-coverage metric can be meaningful, this must be resolved: archive the old spec or pivot the implementation.

2. **Traceability enforcer only checks the most-recently-modified plan.** Running it vanilla passes, but this is misleading. When explicitly run against `Plans/dependency-linking/requirements.md`, it fails — but also produces **false positives** because the regex `FR-\d+` matches item IDs embedded in seed data descriptions (e.g., "FR-0004 blocked_by FR-0003"). The tool needs:
   - Multi-plan scanning mode
   - Smarter ID extraction that ignores numeric domain IDs

3. **FR-dependency-search is the only unimplemented plan requirement in Source/.** Test file `Source/Backend/tests/routes/search.test.ts` self-documents this as intentional but unfixed.

4. **Route handlers directly import store.** `workItems.ts`, `workflow.ts`, `intake.ts` all do `import * as store from '../store/workItemStore'`. This violates the service-layer architecture rule. No service functions wrap the store for work-item CRUD.

5. **Duplicate logger shim.** `src/logger.ts` wraps `src/utils/logger.ts`. All code imports from `src/logger.ts`. The shim is unnecessary complexity.

### Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | Currently enforced plan (FR-WF-001 to FR-WF-013) |
| `Plans/dependency-linking/requirements.md` | 16 FR-dependency-XXX requirements; NOT auto-scanned by enforcer |
| `Source/Backend/src/app.ts` | Express mount points — check for missing router registrations |
| `Source/Backend/tests/routes/search.test.ts` | Intentionally-failing test; search route not yet implemented |
| `Source/Backend/src/routes/workItems.ts` | Direct store import — architecture violation |
| `Source/Backend/src/routes/workflow.ts` | Direct store import — architecture violation |
| `Source/Backend/src/routes/intake.ts` | Direct store import — architecture violation |
| `Source/Backend/src/logger.ts` | Compatibility shim — consolidate with utils/logger.ts |
| `Specifications/dev-workflow-platform.md` | Spec for DIFFERENT app (74 FRs) — needs archive or pivot decision |

### Common Pattern Violations

- `eslint-disable react-hooks/exhaustive-deps` appears in `DependencyPicker.tsx:82` and `hooks/useWorkItems.ts:63` without justification comments
- Frontend pages (`DashboardPage`, `WorkItemListPage`, `WorkItemDetailPage`) have no test files

### Plans Not Yet in Source/

These plans are APPROVED but have zero implementation in `Source/`:
- `Plans/dev-workflow-platform/` (FR-001 to FR-032) — different tech stack/app
- `Plans/orchestrated-dev-cycles/` (FR-033 to FR-049)
- `Plans/dev-cycle-traceability/` (FR-050 to FR-069)
- `Plans/image-upload/` (FR-070 to FR-079+)
- `Plans/orchestrator-cycle-dashboard/` (FR-070 to FR-074 — ID conflict with image-upload)
- `Plans/duplicate-deprecated-status/` (FR-DUP-01 to FR-DUP-05)

### Grading Calibration

Under current grading config:
- **Grade A:** 0 P1, ≤3 P2, ≥80% spec coverage (active plans only — not Specifications/ dir)
- This run: 1 P1, 3 P2 → **Grade C**
- Archiving `Specifications/dev-workflow-platform.md` removes the P1 and would push toward **Grade B**
