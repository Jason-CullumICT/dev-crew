# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-27 — Full Audit (Grade C)

### Spec Coverage Trend
- **71% overall** (38 tracked FRs, 27 traced)
- FR-WF-* (Plans): 100% — enforcer passes, implementation solid
- FR-dependency-* (Specifications): 93% — one gap: FR-dependency-seed
- FR-TMP-* (Specifications/tiered-merge-pipeline.md): 0% — entirely untraced

### Key Structural Findings (for future re-verification)

**P1 — `GET /api/search` not implemented:**
- Route test `Source/Backend/tests/routes/search.test.ts` explicitly notes the
  endpoint is NOT wired in `app.ts`. Frontend `DependencyPicker` silently degrades.
- Status to re-check: does `app.use('/api/search', ...)` exist in `app.ts`?

**P2 — `dependencyCheckDuration` histogram missing:**
- `metrics.ts` has 3 counters, spec requires 4 metrics including a Histogram.
- Re-check: does `Source/Backend/src/metrics.ts` export `dependencyCheckDurationHistogram`?

**P2 — OpenTelemetry entirely absent:**
- No `@opentelemetry/` imports anywhere in Source/. CLAUDE.md architecture rule.
- Re-check: does `Source/Backend/src/telemetry.ts` exist and is it called in `app.ts`?

**P2 — FR-dependency-seed unimplemented:**
- No seed script exists. No `// Verifies: FR-dependency-seed` comment anywhere.
- Re-check: does `Source/Backend/src/store/seed.ts` exist?

**P2 — Tiered Merge Pipeline (FR-TMP-*) zero coverage:**
- May be a platform/ concern not a Source/ concern — but no implementation exists
  anywhere. Stale `playwright.pipeline.config.ts` references nonexistent test dir.
- Re-check: are FR-TMP-* implemented in `platform/`? Or still unstarted?

**P2 — Enforcer false positive:**
- Enforcer only scans `Plans/self-judging-workflow/requirements.md` (13 IDs).
- Re-check: has the enforcer been extended to cover Specifications/ FR-TMP-* and
  FR-dependency-seed?

**P3 — Duplicate test files:**
- `WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` exist in both
  `tests/` (older, shallow mocks) and `tests/pages/` (newer, full mocks).
- Re-check: have older root-level test files been removed?

### Useful Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | The only file the enforcer currently checks |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 — enforcer blind spot |
| `Specifications/dev-workflow-platform.md` | FR-dependency-* (partially traced), FR-001 to FR-069 (different app) |
| `Source/Backend/src/app.ts` | Route registration — check for /api/search, OTel init |
| `Source/Backend/src/metrics.ts` | 3 counters (P2: missing histogram) |
| `Source/Backend/src/services/assessment.ts:141` | Local `AssessmentResult` interface (P3 arch violation) |
| `Source/Frontend/tests/` vs `tests/pages/` | Duplicate test files (P3) |
| `Source/Backend/tests/routes/search.test.ts` | Intentionally-failing contract tests for /api/search |

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` in 2 files — no explanation comments
- No OpenTelemetry at all (hard arch rule)
- No route latency Prometheus histogram (arch rule says "via middleware")
- Local interface definition instead of Shared/ (arch rule)

### Key Facts About Project Structure
- Source/ implements the **Self-Judging Workflow Engine** (in-memory store, WorkItem model)
- `Specifications/dev-workflow-platform.md` describes a DIFFERENT application (SQLite,
  Feature Requests, Bugs, Cycles) — FR-001 to FR-069 are NOT implemented in Source/
  (that's a separate product / platform layer)
- FR-dependency-* requirements from dev-workflow-platform.md WERE ported to the workflow
  engine (they're in Source/ and traced) — except FR-dependency-seed
- The traceability enforcer scans Plans/ not Specifications/ — always run with `--file`
  on specific spec files to get full coverage numbers
