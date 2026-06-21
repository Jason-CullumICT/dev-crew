# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-06-21

### Spec Coverage Trend

| Spec Scope | Coverage |
|---|---|
| Source/ — FR-WF-* (workflow-engine plan) | 100% ✅ |
| Source/ — FR-dependency-* (dependency-linking plan) | 87.5% ⚠️ (2 missing) |
| Source/ — FR-TMP-* (tiered-merge-pipeline spec) | 0% ❌ |
| portal/ — FR-001–FR-095+ (dev-workflow-platform) | unscanned |

### Key Findings

**P1**
- `GET /api/search` route is NOT registered in `Source/Backend/src/app.ts`. Test file `Source/Backend/tests/routes/search.test.ts` self-documents this gap (line 5). Tests WILL FAIL. DependencyPicker typeahead is broken at runtime. Fix: add search route and register in app.ts.

**P2**
- Route handlers in `workItems.ts`, `intake.ts`, and `workflow.ts` call `store.*` directly — violates "no direct DB calls from route handlers" CLAUDE.md rule. `dashboard.ts` uses a service layer correctly (the pattern to follow).
- `dependencyCheckDuration` Histogram is missing from `Source/Backend/src/metrics.ts`. FR-dependency-metrics requires 4 metrics; only 3 exist. Missing: `dependency_check_duration_seconds`.
- Traceability enforcer (`tools/traceability-enforcer.py`) scans only `["Source", "E2E"]` and targets only the single most-recently-modified `requirements.md`. Running it against `Plans/dependency-linking/requirements.md` produces 7 FAILURES. FR-TMP-* from `Specifications/tiered-merge-pipeline.md` is never checked.
- `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010) has zero implementation anywhere. `Source/E2E/playwright.pipeline.config.ts` may be partial but has no FR-TMP-* traceability.
- Duplicate test files: `tests/WorkItemListPage.test.tsx` and `tests/pages/WorkItemListPage.test.tsx` (same for WorkItemDetailPage). Keep only the `tests/pages/` variants — they are more complete.

**P3**
- No OpenTelemetry instrumentation in `Source/Backend/src/app.ts`. CLAUDE.md requires OTel tracing for all new code.
- Two `eslint-disable-next-line react-hooks/exhaustive-deps` without explanatory comments: `Source/Frontend/src/hooks/useWorkItems.ts:63` and `Source/Frontend/src/components/DependencyPicker.tsx:82`.
- `portal/` app contains 112 FR IDs that the traceability enforcer never scans. Three open dependency FR items for portal/ remain unconfirmed (FR-dependency-api-types, FR-dependency-seed, FR-dependency-frontend-tests).

### Useful File Paths for Future Audits

| Purpose | Path |
|---|---|
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Backend app entry point | `Source/Backend/src/app.ts` |
| Backend metrics | `Source/Backend/src/metrics.ts` |
| Backend routes | `Source/Backend/src/routes/` |
| Frontend tests | `Source/Frontend/tests/` |
| Dev-workflow-platform spec | `Specifications/dev-workflow-platform.md` |
| Tiered merge pipeline spec | `Specifications/tiered-merge-pipeline.md` |
| Workflow engine spec | `Specifications/workflow-engine.md` |
| Self-judging plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Dependency plan requirements | `Plans/dependency-linking/requirements.md` |
| Portal app (unscanned) | `portal/Backend/`, `portal/Frontend/` |

### Patterns to Check on Re-Audit

1. Is `/api/search` route registered in `app.ts`? (`grep "/api/search" Source/Backend/src/app.ts`)
2. Is `dependencyCheckDurationHistogram` present in `metrics.ts`? (`grep "dependencyCheckDuration" Source/Backend/src/metrics.ts`)
3. Are the duplicate test files removed? (`ls Source/Frontend/tests/*.test.tsx`)
4. Is OTel initialized in `app.ts`? (`grep "opentelemetry" Source/Backend/src/app.ts`)
5. Run enforcer against dependency plan: `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md`

### Common Pattern Violations

- Direct store calls from route handlers (all routes except dashboard.ts). Service-layer bypass is the dominant architecture violation.
- Metric completeness: always verify all metric instruments from a spec are actually created in `metrics.ts`.
- Two-level test structure (tests/ and tests/pages/ and tests/components/) can produce duplicates — grep for identical describe() blocks.
