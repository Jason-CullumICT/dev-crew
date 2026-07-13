# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit 2026-07-13 — Full Audit

### Architecture Overview
Two distinct product systems in this repo:
- **`Source/`** — Self-Judging Workflow Engine (WorkItem routing, assessment, dependency tracking). Spec: `Specifications/workflow-engine.md`. Plan-level FRs: `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013).
- **`portal/`** — Dev Workflow Platform debug UI (Feature Requests, Bugs, Cycles, Pipeline). Spec: `Specifications/dev-workflow-platform.md` (FR-001 to FR-069, FR-dependency-*, FR-070 to FR-089 image upload).
- **`platform/`** — Orchestrator infrastructure (solo-session only). Implements `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010).

### Spec Coverage Trend
- workflow-engine.md: 100% (FR-WF-001 to FR-WF-013 all traced)
- dev-workflow-platform.md: ~99% (FR-dependency-seed not implemented)
- tiered-merge-pipeline.md: 100% (in platform/)
- FR-090 to FR-095: 0% — referenced in portal code with NO spec definition

### Key File Paths for Fast Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` — scans `['Source', 'E2E']` only (not portal/)
- Source/Backend metrics: `Source/Backend/src/metrics.ts` (missing dependencyCheckDuration histogram)
- Portal metrics: `portal/Backend/src/metrics.ts` (complete — all 4 dependency metrics present)
- Portal route latency: `portal/Backend/src/middleware/metrics.ts` (http_request_duration_ms histogram ✅)
- Source/Backend route latency: NOT present (no latency middleware in `Source/Backend/src/app.ts`)
- Direct DB in routes: `portal/Backend/src/routes/teamDispatches.ts` lines 37, 41, 72
- Orphan FR IDs: FR-090 to FR-095 in portal/Frontend/src/components/orchestrator/ and portal/Frontend/src/api/client.ts (no spec defined)

### Common Pattern Violations Found
1. FR IDs defined in Plans/ rather than Specifications/ (FR-WF-*, FR-DUP-*) — governance gap
2. Orphan FR references with no backing spec (FR-090 to FR-095)
3. Direct DB calls in one route handler (teamDispatches.ts)
4. Missing FR-dependency-seed implementation
5. Duplicate frontend test files (tests/WorkItemDetailPage.test.tsx vs tests/pages/WorkItemDetailPage.test.tsx)

### Spec ID Conventions Used
- FR-WF-XXX → workflow-engine.md features (defined in Plans/, not Specs/)
- FR-XXX (numeric) → dev-workflow-platform.md
- FR-TMP-XXX → tiered-merge-pipeline.md
- FR-DUP-XX → duplicate/deprecated status (defined in Plans/ only)
- FR-dependency-XXX → dev-workflow-platform.md dependency block
