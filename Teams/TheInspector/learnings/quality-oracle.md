# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## First Full Audit — 2026-05-20

### Spec Coverage Trend
- **97% combined** (Source + portal + platform) — healthy overall
- Trend: establishing baseline; no prior audit for comparison

### Architecture of the Repo (Critical for Future Audits)

The codebase has THREE distinct implementation zones — the enforcer and any static analysis MUST account for all three:

| Zone | Path | What it implements | Notes |
|------|------|-------------------|-------|
| Workflow engine | `Source/` | `workflow-engine.md` spec, FR-WF-*, FR-dependency-* | Only zone scanned by enforcer |
| Dev workflow portal | `portal/` | `dev-workflow-platform.md` spec, FR-001 to FR-095 | 1073 Verifies comments; NOT scanned by enforcer |
| Orchestrator | `platform/` | `tiered-merge-pipeline.md`, FR-TMP-* | Solo-session-only; NOT scanned by enforcer |

**Implication**: Running `python3 tools/traceability-enforcer.py` against any portal/ or platform/ plan always produces false failures. Only `Plans/self-judging-workflow/requirements.md` is scanned correctly.

### Common Pattern Violations Found

1. **Service layer bypass**: Both `Source/` and `portal/` routes import data stores/DB directly. `portal/Backend/src/routes/*.ts` ALL use `getDb()` inside handlers. `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` import `workItemStore` directly.

2. **console.log in platform/**: `platform/orchestrator/lib/workflow-engine.js` has 113 `console.log` calls. Platform has no logger abstraction. This is the main observability gap.

3. **ESLint suppressions**: `react-hooks/exhaustive-deps` suppressed in DependencyPicker.tsx and useWorkItems.ts. These should have explanatory comments.

4. **Duplicate test files**: Two pairs at `Source/Frontend/tests/` root level are superseded by `tests/pages/` versions. Root-level versions have wrong import paths.

### Active P1 Finding
- **QO-001**: `Source/Backend` — `/api/search` route (FR-dependency-search) has tests written but NO route file exists and nothing registered in `app.ts`. Causes 5 test failures in `tests/routes/search.test.ts`. **This must be fixed by TheFixer before next audit.**

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Spec for Source/ workflow engine | `Specifications/workflow-engine.md` |
| Spec for portal | `Specifications/dev-workflow-platform.md` |
| Spec for platform orchestrator | `Specifications/tiered-merge-pipeline.md` |
| Enforcer (Source/ only) | `tools/traceability-enforcer.py` |
| Portal backend routes (DB violation hotspot) | `portal/Backend/src/routes/` |
| Platform logger gap | `platform/orchestrator/lib/workflow-engine.js` |
| Canonical frontend tests | `Source/Frontend/tests/pages/` |
| Stale duplicate tests | `Source/Frontend/tests/WorkItemDetailPage.test.tsx`, `WorkItemListPage.test.tsx` |
| Missing search route | `Source/Backend/src/app.ts` (not registered) |

### Grading History

| Date | Grade | P1 | P2 | Spec Coverage |
|------|-------|----|----|--------------|
| 2026-05-20 | C | 1 | 4 | 97% |
