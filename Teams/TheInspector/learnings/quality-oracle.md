# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit 2026-10-10 — Full Audit

### Spec Coverage Trend
- **Canonical spec coverage: ~0%** — `Specifications/dev-workflow-platform.md` (FR-001–FR-069, ~85 FRs) and `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–FR-TMP-010) have zero source `Verifies:` references.
- **Plans-level coverage: 100%** — `Plans/self-judging-workflow/requirements.md` (13 FRs: FR-WF-001 to FR-WF-013) are all traced in source and pass the traceability enforcer.
- **Critical gap**: Traceability enforcer only checks Plans/, not Specifications/. Reports PASSED but misses 95+ canonical spec FRs.

### Key Finding: Domain Pivot Mismatch
The codebase was built for `Specifications/workflow-engine.md` (in-memory Work Item workflow engine), but `Specifications/dev-workflow-platform.md` still defines a different system (SQLite, Feature Requests, Bug Reports, Dev Cycles, Pipeline Orchestration). These two specs describe different domains. The dev-workflow-platform spec appears to be an earlier design that was replaced by the workflow-engine design, but was never retired or updated. This creates a massive apparent spec drift.

### Non-Standard FR ID Pattern
The `FR-dependency-*` series (FR-dependency-service, FR-dependency-api, FR-dependency-search, FR-dependency-metrics, etc.) is used pervasively in source and tests but has no backing document in `Specifications/`. These are "organic" IDs invented during implementation. They need a proper spec document.

### Unimplemented Route (Known Gap)
`Source/Backend/tests/routes/search.test.ts` self-documents that `GET /api/search` is intentionally not wired. Tests exist and will fail until the route is implemented.

### eslint-disable Pattern
Two `react-hooks/exhaustive-deps` suppressions in frontend source lack explanatory comments:
- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

### Useful File Paths
- Canonical platform spec: `Specifications/dev-workflow-platform.md`
- Workflow engine spec: `Specifications/workflow-engine.md`
- Active requirements (enforcer target): `Plans/self-judging-workflow/requirements.md`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Missing route test: `Source/Backend/tests/routes/search.test.ts`
- All backend source files: `Source/Backend/src/` — all have Verifies: comments
- All frontend source files: `Source/Frontend/src/` — all except `vite-env.d.ts` have Verifies: comments

### Common Violations Found
1. Stale canonical spec not retired after domain pivot
2. Traceability enforcer scope too narrow (Plans/ only, not Specifications/)
3. Non-standard FR IDs without backing specs
4. eslint-disable without rationale comment
5. Catch block missing "intentional suppression" documentation

## Learnings

_(none yet — add discoveries here after your first run)_
