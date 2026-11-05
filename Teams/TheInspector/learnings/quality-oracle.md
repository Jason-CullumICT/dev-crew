# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-11-05

### Spec Coverage Trend

- **Self-Judging Workflow Engine** (FR-WF-001–FR-WF-013): **100%** traced — traceability enforcer confirms PASSED
- **Dependency Linking** (FR-dependency-*): **87.5%** (14/16 requirements traced)
  - Missing: `FR-dependency-search` (endpoint not wired), `FR-dependency-metrics` histogram
- **dev-workflow-platform.md** (FR-001–FR-069): **0%** — no Source/ implementation (different product, may be intentional)
- **tiered-merge-pipeline.md** (FR-TMP-001–FR-TMP-010): **0%** — no Source/ implementation (platform/ scope, not Source/)

### Confirmed Open Findings (from first audit)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| QO-001 | P1 | `GET /api/search` not registered in `app.ts` (FR-dependency-search) | OPEN |
| QO-002 | P2 | `dependencyCheckDuration` histogram absent from `metrics.ts` (FR-dependency-metrics) | OPEN |
| QO-003 | P2 | Route handlers import `workItemStore` directly — bypasses service layer | OPEN |
| QO-004 | P3 | Traceability enforcer only targets FR-WF-* (misses FR-dependency-* requirements) | OPEN |
| QO-005 | P3 | Two untracked specs in `Specifications/` with 0% Source/ coverage | OPEN |
| QO-006 | P3 | Two `eslint-disable-next-line` in production source files | OPEN |

### Key File Paths for Future Audits

- Traceability enforcer target: `Plans/self-judging-workflow/requirements.md`
- Dependency requirements: `Plans/dependency-linking/requirements.md`
- Backend metrics: `Source/Backend/src/metrics.ts`
- App route registration: `Source/Backend/src/app.ts`
- Route files with store bypass: `Source/Backend/src/routes/workItems.ts`, `intake.ts`, `workflow.ts`
- Search test (documents known gap): `Source/Backend/tests/routes/search.test.ts`

### Common Pattern Violations

- Route handlers calling `store.*` directly (architecture rule violation)
- Traceability enforcer does not auto-discover all requirement files — it must be pointed at a specific requirements.md

### Useful Notes

- The `workflow-engine.md` spec has no numbered FR-WF-* IDs in the spec file itself — the IDs live in `Plans/self-judging-workflow/requirements.md`. Future audits should check both.
- The `dev-workflow-platform.md` and `tiered-merge-pipeline.md` specs describe the portal system and orchestrator features — they are intentionally out-of-scope for the Source/ workflow engine. Confirm this with the team if unclear.
- `Source/Backend/tests/routes/search.test.ts` explicitly documents that the endpoint is not wired — this is a known gap, not a test framework issue.
