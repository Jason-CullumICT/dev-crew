Now the full report:

---

## Quality Oracle Findings — 2026-07-08

### Spec Coverage

| Spec | Requirements | Enforcer Tracks | Implementation |
|------|-------------|-----------------|----------------|
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 (13) | ✅ All 13 | ✅ Source/ |
| Implicit: FR-dependency-* (11) | FR-dependency-service, -endpoints, etc. | ❌ Not in enforcer | ✅ Source/ (with Verifies) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 (10) | ❌ | ⚠️ platform/ (outside Source/) |
| `Specifications/dev-workflow-platform.md` | FR-001 to FR-069 + more (~80) | ❌ | ℹ️ portal/ (different app) |

**Source/ spec coverage (enforcer-verified): 100%** (13/13 FR-WF-* requirements traced)
**Enforcer blind spot: 11 FR-dependency-* requirements** — implemented but unenforced

---

### QO-001: Direct Store Access from Route Handlers
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- **Detail:** Three route files call `store.*` functions directly — `store.createWorkItem`, `store.findAll`, `store.findById`, `store.updateWorkItem`, `store.softDelete`, `store.createWorkItem` — bypassing the service layer entirely. This violates CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* The service layer (router.ts, assessment.ts, changeHistory.ts) exists for workflow actions, but pure CRUD routes skip it. The `workflow.ts` approve/reject handlers even mutate `item.changeHistory` inline in the route handler rather than delegating to `changeHistory.ts`.
- **Recommendation:** Extract a `workItemService.ts` wrapping CRUD store calls; route handlers should call service functions only. Move the changeHistory mutation in approve/reject/dispatch into the service layer.
- **Cross-ref:** TheFixer (code quality), TheATeam (if extending routes)

---

### QO-002: FR-dependency-search — GET /api/search Not Wired
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts:1`, `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` requires a `GET /api/search` cross-entity typeahead endpoint. A test file exists (`tests/routes/search.test.ts`) that explicitly states *"GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No route file for search exists in `src/routes/`, and `app.ts` has no search route registration. **These tests will fail if run.**
- **Recommendation:** Implement `src/routes/search.ts` with `GET /api/search?q=` querying the store by title/description, register it in `app.ts`, return `{data: WorkItem[]}`.
- **Cross-ref:** TheFixer to implement; verify with `npm test`

---

### QO-003: Missing Prometheus Metric — dependencyCheckDuration Histogram
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts:40`
- **Detail:** `FR-dependency-metrics` specifies 4 metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `dependencyCheckDuration` histogram ❌, `cycleDetectionEvents` counter ✅. The histogram `dependency_check_duration` is missing from `metrics.ts`. The metrics test (`tests/routes/metrics.test.ts`) also does not verify this histogram, meaning the gap goes untested.
- **Recommendation:** Add `dependencyCheckDurationHistogram = new Histogram({ name: 'dependency_check_duration_seconds', ... })` to `metrics.ts`; instrument `isReady()` in `dependency.ts`; add a test case to `metrics.test.ts`.
- **Cross-ref:** TheFixer

---

### QO-004: Traceability Enforcer Blind Spot — FR-dependency-* Requirements Unenforced
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:1`, `Plans/self-judging-workflow/requirements.md:1`
- **Detail:** 11 `FR-dependency-*` requirements (`FR-dependency-service`, `FR-dependency-endpoints`, `FR-dependency-dispatch-gating`, `FR-dependency-search`, `FR-dependency-metrics`, `FR-dependency-backend-tests`, `FR-dependency-api-client`, `FR-dependency-blocked-badge`, `FR-dependency-section`, `FR-dependency-picker`, `FR-dependency-integration`) are implemented in Source/ and have `// Verifies:` comments. However, the enforcer only scans `Plans/self-judging-workflow/requirements.md` which lists only FR-WF-001 to FR-WF-013. If any Verifies comment is removed or a dependency requirement lapses, the enforcer will not catch it. Combined with QO-002, this means `FR-dependency-search` can be missing from implementation but the enforcer still reports PASS.
- **Recommendation:** Add the 11 FR-dependency-* requirements to the requirements.md file (or create a new plan file) so the enforcer can track them. Also add a failing test assertion for `GET /api/search` to ensure QO-002 doesn't silently pass.
- **Cross-ref:** QO-002

---

### QO-005: Dual Logger Abstraction with Incompatible Calling Conventions
- **Severity:** P3
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/logger.ts:1`, `Source/Backend/src/utils/logger.ts:1`
- **Detail:** Two logger implementations coexist. `utils/logger.ts` is the canonical structured logger using `logger.info('message', { context })`. `src/logger.ts` is a compatibility shim wrapping it for `logger.info({ msg: 'text', key: val })` object-style calls used by routes. Both are imported by different source files (`workItemStore.ts` → utils/logger; routes → src/logger). This creates two calling conventions, maintenance confusion, and a subtle normalization layer that could mask log data if the `msg` key is missing.
- **Recommendation:** Standardise on one calling convention (preferably the structured object style); update `utils/logger.ts` to accept both forms natively; remove `src/logger.ts` and update all imports.
- **Cross-ref:** TheFixer

---

### QO-006: Duplicate Frontend Test Files at Two Locations
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both locations contain tests for the same components. The `tests/pages/` versions have more imports (typed enums from Shared, `within` from RTL) and are more complete. The root `tests/` versions have shallower mocks. With two test suites covering the same code, it's unclear which is authoritative, and they may diverge over time producing contradictory pass/fail signals.
- **Recommendation:** Canonicalise on `tests/pages/` (more complete); delete the root-level duplicates (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`).
- **Cross-ref:** TheFixer

---

### QO-007: OpenTelemetry Tracing Absent from Backend
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/package.json`
- **Detail:** CLAUDE.md mandates *"Use OpenTelemetry for distributed tracing — auto-instrument HTTP, database, and framework calls — add custom spans for critical paths — propagate W3C `traceparent` header."* The backend has zero `@opentelemetry` packages. Pino structured logging is in place (satisfying FR-WF-013 narrowly) but OTel spans and `traceparent` propagation are completely absent. For a single-process in-memory app this is lower impact, but the architecture rule is unconditional.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`; initialise in `src/app.ts` before route setup; propagate `traceparent` in response headers.
- **Cross-ref:** TheATeam

---

### QO-008: eslint-disable Suppressions Without Justification
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without an inline comment explaining why the rule is intentionally violated. Missing deps in `useEffect` are a common source of stale-closure bugs. Without justification, reviewers cannot determine if the suppression is a deliberate design choice or an oversight.
- **Recommendation:** Add a comment next to each suppression explaining the rationale (e.g., *"// intentionally omit fetchItems to avoid re-fetch loop"*). If the omission is unintentional, fix the hook to include the missing dependency.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-08",
  "spec_coverage": {
    "enforcer_scope": "FR-WF-001 to FR-WF-013",
    "enforcer_pass": true,
    "coverage_pct": 100,
    "blind_spots": ["FR-dependency-* (11 reqs)", "FR-TMP-* (10 reqs, platform/)", "FR-001 to FR-069 (portal/)"]
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "architecture-violation", "title": "Direct store access from route handlers", "files": ["routes/workItems.ts", "routes/workflow.ts", "routes/intake.ts"] },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "GET /api/search not wired — FR-dependency-search unimplemented", "files": ["app.ts"] },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "Missing dependencyCheckDuration histogram metric", "files": ["metrics.ts"] },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer blind to 11 FR-dependency-* requirements", "files": ["tools/traceability-enforcer.py"] },
    { "id": "QO-005", "severity": "P3", "category": "architecture-violation", "title": "Dual logger abstraction with incompatible calling conventions", "files": ["src/logger.ts", "src/utils/logger.ts"] },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage", "title": "Duplicate frontend test files at two directory locations", "files": ["tests/WorkItemDetailPage.test.tsx", "tests/WorkItemListPage.test.tsx"] },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "OpenTelemetry tracing absent from backend", "files": ["package.json"] },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions without justification", "files": ["DependencyPicker.tsx:82", "useWorkItems.ts:63"] }
  ],
  "grade": "B",
  "p1_count": 0,
  "p2_count": 4,
  "p3_count": 4
}
```

---

**Grade: B** — 0 P1s, 4 P2s. The enforcer passes (100% of tracked requirements), but four genuine gaps remain: three routes bypass the service layer, the search endpoint is acknowledged-missing, a metric is absent from the spec, and the enforcer itself has a blind spot that allowed the search gap to go undetected. OTel is the largest architecture rule violation but lowest urgency for a single-process in-memory system.

**Escalation:** No security triggers found — nothing to route to TheGuardians. All findings are code-quality/spec-drift → TheFixer.
