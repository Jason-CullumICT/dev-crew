## Quality Oracle Audit — 2026-10-27

**Overall Grade: B** (0 confirmed P1s, 3 P2s, 93% spec coverage)

---

### Spec Coverage: 93%
- FR-WF-001 — FR-WF-013 (workflow engine): **13/13 — 100%** ✅
- FR-dependency-* (dependency tracking): **14/16 — 87.5%** ⚠️
- `dev-workflow-platform.md` FR-001 — FR-069: **0/69 — 0%** (legacy portal spec, not in scope for `Source/`)

The traceability enforcer reports PASSED — but this masks two real gaps where code references exist without working implementation.

---

### QO-001 — P1: `GET /api/search` not registered in `app.ts`
**File:** `Source/Backend/src/app.ts`
**Requirement:** FR-dependency-search

`Source/Backend/tests/routes/search.test.ts` contains 5 test cases and explicitly documents: *"these tests will FAIL until the route is implemented."* The route is never registered in `app.ts` — meaning the `DependencyPicker` typeahead (which calls `GET /api/search`) will always 404 in production.

**Fix:** Create `Source/Backend/src/routes/search.ts`, implement `GET /api/search?q=` against the in-memory store, and register it in `app.ts`.

---

### QO-002 — P2: `dependency_check_duration` histogram missing from metrics
**File:** `Source/Backend/src/metrics.ts`
**Requirement:** FR-dependency-metrics (specifies 4 metrics; only 3 implemented)

The spec requires a histogram for dependency check duration. Only the 3 counters exist (`dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`). The `dependency_check_duration_seconds` histogram is absent.

---

### QO-003 — P2: `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing
**File:** `Source/Frontend/tests/`
**Requirement:** FR-dependency-frontend-tests

FR-dependency-frontend-tests requires dedicated component test files. Coverage exists in `integration.test.tsx` only. A meta-test in integration claims "all three component test files are registered" — but no actual files exist. `DependencyPicker.tsx` also has no unit tests.

---

### QO-004 — P2: `Specifications/dev-workflow-platform.md` defines 69 orphaned requirements
**File:** `Specifications/dev-workflow-platform.md`

This doc defines FR-001 — FR-069 for the legacy `portal/` app (Feature Requests, Bug Reports, Dev Cycles platform). None are implemented in `Source/`. Having it in `Specifications/` alongside `workflow-engine.md` confuses future agents about which spec governs the current app. Recommend moving it to `Plans/dev-workflow-platform/` or adding a `STATUS: LEGACY` header.

---

### QO-005 — P3: `workflow-engine.md` has no formal FR IDs
The specification is prose-only; FR-WF-001 — FR-WF-013 IDs exist only in `Plans/`, not in `Specifications/`. Violates the spec-is-source-of-truth principle.

### QO-006 — P3: `eslint-disable` suppressions without rationale
`useWorkItems.ts:63` and `DependencyPicker.tsx:82` both suppress `react-hooks/exhaustive-deps` with no comment explaining why the omission is safe.

### QO-007 — P4: `DebugPortalPage.tsx` has no formal FR traceability
Uses `// Verifies: dev-crew debug portal` which is not an FR ID. No backing requirement in any spec or plan.

---

**Report written to:** `Teams/TheInspector/findings/quality-oracle-2026-10-27.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
