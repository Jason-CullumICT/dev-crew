# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Architecture: Two Implementation Layers

This project has **two separate application implementations**:
- `Source/` — implements the **Self-Judging Workflow Engine** spec (`Specifications/workflow-engine.md`, plan: `Plans/self-judging-workflow/requirements.md`). Uses FR-WF-* and FR-dependency-* IDs.
- `portal/` — implements the **Dev Workflow Platform** spec (`Specifications/dev-workflow-platform.md`). Uses FR-001 through FR-079+ IDs.
- `platform/` — orchestrator infrastructure. Implements **Tiered Merge Pipeline** (`Specifications/tiered-merge-pipeline.md`). Uses FR-TMP-* IDs.

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. It does NOT scan `portal/` or `platform/`. Running the enforcer against Specifications files will report false failures for FR-001...FR-069 and FR-TMP-* — those are implemented in their correct layers.

### Known Open Issues (as of 2026-09-27)

1. **FR-dependency-search not wired in Source/Backend**: The GET /api/search route is documented in `Source/Backend/tests/routes/search.test.ts` with an explicit NOTE that it is not wired into app.ts. The test intentionally fails. This is a deferred implementation gap.

2. **dependencyCheckDuration histogram missing in Source/Backend**: FR-dependency-metrics requires 4 Prometheus metrics including a histogram. Source/Backend/src/metrics.ts only has 3 (counters). The histogram exists in portal/Backend/src/metrics.ts but not Source/Backend.

3. **OpenTelemetry not implemented in Source/Backend**: CLAUDE.md mandates OTel as a non-negotiable rule. Source/Backend has no @opentelemetry instrumentation.

4. **Two eslint-disable suppressions in Source/Frontend**: DependencyPicker.tsx:82 and useWorkItems.ts:63 suppress `react-hooks/exhaustive-deps`.

5. **Duplicate test files**: WorkItemDetailPage.test.tsx and WorkItemListPage.test.tsx exist in both `Source/Frontend/tests/` (top-level) and `Source/Frontend/tests/pages/`.

### Useful File Paths

- Traceability enforcer: `tools/traceability-enforcer.py`
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`
- Source backend metrics: `Source/Backend/src/metrics.ts`
- Search test (intentionally failing): `Source/Backend/tests/routes/search.test.ts`
- Portal metrics (with histogram): `portal/Backend/src/metrics.ts`

### Spec Coverage Trend (First Audit)

- Source/ vs self-judging-workflow plan: **100%** (13/13 FR-WF-* covered)
- Source/ vs FR-dependency-* spec: **~96%** (FR-dependency-search missing route)
- portal/ vs dev-workflow-platform spec: Not measured (enforcer scope gap)
- platform/ vs tiered-merge-pipeline spec: Not measured (enforcer scope gap)
