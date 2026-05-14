# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-05-14

### Spec Coverage Trend
- **Active plan coverage (Plans/self-judging-workflow):** 13/13 = 100% ✅
- **Dependency plan coverage (Plans/dependency-linking):** ~14/15 ≈ 93% (FR-dependency-search route missing from app.ts)
- **Specifications/ coverage in Source/:** 0% — Specifications/ FRs use FR-001..FR-069 and FR-TMP-001..FR-TMP-010 IDs; Source/ references FR-WF-XXX IDs from Plans/. These are distinct namespaces and the enforcer only checks Plans/.

### Key Structural Discovery
There are **two separate application codebases**:
1. **`Source/`** — the "Self-Judging Workflow Engine" (in-memory, work items). Implemented per `Plans/self-judging-workflow/` using FR-WF-XXX IDs.
2. **`portal/`** — the "Dev Workflow Platform" (SQLite, feature requests/bugs/cycles). Implemented per `Specifications/dev-workflow-platform.md` using FR-001..FR-069 IDs.

The `inspector.config.yml` scans `Source/` only. The traceability enforcer also scans `Source/` + `E2E/`. This means `portal/` has zero inspector coverage.

### Common Pattern Violations Found
1. **Dual logger abstraction** — `src/logger.ts` is a compat wrapper around `src/utils/logger.ts`. Inconsistent call signatures across coders (object style vs. string+context style). The wrapper exists because different coders used different conventions.
2. **No pretty-print in development** — `utils/logger.ts` always emits JSON. FR-WF-013 requires pretty-printing in development; `NODE_ENV` is never checked.
3. **Frontend error field mismatch** — Backend returns `{error: "..."}` but `api/client.ts` reads `body.message`. Error messages from backend silently lost, user sees "Request failed: 4xx".
4. **eslint-disable react-hooks/exhaustive-deps** in DependencyPicker.tsx:82 and useWorkItems.ts:63.

### Confirmed Open Findings (carry forward)
- **QO-001 (P1):** `GET /api/search` not wired in app.ts — 5 tests failing intentionally documented, but unresolved
- **QO-002 (P1):** `body.message` vs `body.error` mismatch in api/client.ts — error messages silently dropped
- **QO-003 (P2):** `dependencyCheckDuration` histogram missing from metrics.ts (FR-dependency-metrics specifies 4 metrics, only 3 implemented)
- **QO-004 (P2):** Logger no dev pretty-print (architecture rule + FR-WF-013)
- **QO-005 (P2):** No OpenTelemetry tracing (CLAUDE.md architecture rule)
- **QO-006 (P2):** `Specifications/tiered-merge-pipeline.md` FR-TMP-001 to FR-TMP-010 — zero implementation anywhere
- **QO-008 (P2):** Traceability enforcer only covers active plan FRs, not all Specifications/ FRs

### Useful File Paths for Faster Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` (default picks most-recently-modified plan)
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`
- Dependency plan requirements: `Plans/dependency-linking/requirements.md`
- Backend metrics: `Source/Backend/src/metrics.ts`
- Logger abstraction: `Source/Backend/src/utils/logger.ts` + `Source/Backend/src/logger.ts` (compat wrapper)
- API client: `Source/Frontend/src/api/client.ts` (line 27: error field mismatch)
- Search test (failing): `Source/Backend/tests/routes/search.test.ts`
- Inspector config: `Teams/TheInspector/inspector.config.yml`
