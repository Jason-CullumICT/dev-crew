---

## Quality Oracle Findings

### Re-Verification of Prior Findings
First audit — no prior P1/P2 findings to re-verify.

---

### Spec Coverage: ~93%

| Requirements Source | Total | Implemented | Missing/Broken |
|---------------------|-------|-------------|----------------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | 0 |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 16 | 14 | 2 |
| **Total (Source/ scope)** | **29** | **27** | **2** |

Traceability enforcer (auto-pick mode): **PASSES** (targets only the self-judging-workflow plan; dependency-linking plan is not auto-checked and would **FAIL** if targeted directly — see QO-006).

---

### QO-001: Search Route Implemented in Tests But Not in App
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:4-6` / `Source/Backend/src/app.ts`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for cross-entity typeahead. A test file exists and is self-annotated: *"these tests document the expected contract and will FAIL until the route is implemented."* There is no `Source/Backend/src/routes/search.ts`, and `app.ts` does not register any `/api/search` route. The `workItemsApi.searchItems()` frontend function calls this dead endpoint.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` filtering `store.getAllItems()` by title/description match, register it in `app.ts` as `app.use('/api/search', searchRouter)`.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-002: `dependencyCheckDuration` Histogram Missing From Metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 Prometheus instruments: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` **histogram**, and `cycleDetectionEvents` counter. Only 3 are present; the Histogram is absent. The test file `Source/Backend/tests/routes/metrics.test.ts` does not test for the histogram either, so this gap is undetected by CI.
- **Recommendation:** Add `export const dependencyCheckDurationHistogram = new Histogram({ name: 'dependency_check_duration_seconds', ... })` to `metrics.ts` and instrument `isReady` / `computeHasUnresolvedBlockers` calls.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-003: Frontend API Client Error Field Mismatch Silently Swallows Error Messages
- **Severity:** P2
- **Category:** pattern-violation / architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:27`
- **Detail:** Backend error responses follow the mandated pattern `{ error: "message" }` (CLAUDE.md architecture rule). The API client reads `body.message` — which will always be `undefined` for backend errors — so the fallback `Request failed: ${response.status}` is returned every time. No error text from the API (validation errors, 409 conflicts, 404 messages) ever reaches the UI.
  ```ts
  const body = await response.json().catch(() => ({}));
  throw new Error(body.message ?? `Request failed: ${response.status}`); // ← body.error never read
  ```
- **Recommendation:** Change `body.message` to `body.error ?? body.message` to support both patterns.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-004: Duplicate Frontend Test Files for Two Pages
- **Severity:** P2
- **Category:** untested / pattern-violation
- **File:** `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines); same for WorkItemDetailPage (368 vs 393 lines)
- **Detail:** Both test files for each component are active. Different test cases, different assertions — neither is simply a copy of the other. This creates ambiguity about which is authoritative, risks duplicate CI runs, and makes it easy to fix a bug in one while leaving it broken in the other.
- **Recommendation:** Consolidate into the `tests/pages/` location (which is more structured), delete the root-level duplicates, and verify test coverage is union of both files.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-005: Traceability Enforcer Only Auto-Selects One Plan; Dependency Plan Fails When Explicitly Run
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** The enforcer picks the **most recently modified** `requirements.md` across all plans. Running `python3 tools/traceability-enforcer.py` only checks `Plans/self-judging-workflow/requirements.md`. When explicitly targeting `Plans/dependency-linking/requirements.md`, the enforcer reports **7 MISSING** requirements. Of these, 5 are false positives (seed-data item IDs like `FR-0002` being matched by the `FR-[A-Z0-9-]+` regex), but **FR-070** and **FR-085** are genuinely referenced in that requirements file yet do not exist in `Specifications/dev-workflow-platform.md` (which ends at FR-069).
- **Recommendation 1:** Tighten the enforcer regex to `FR-[A-Z]{2,}-\d+` (requiring a multi-char prefix) to avoid matching item IDs like `FR-0002`.
- **Recommendation 2:** Remove or correct the references to FR-070 and FR-085 in `Plans/dependency-linking/requirements.md` — those IDs don't exist in the spec.
- **Cross-ref:** TheFixer (tooling)

---

### QO-006: OpenTelemetry Tracing Specified But Not Implemented
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/src/` (no OTel setup anywhere)
- **Detail:** CLAUDE.md architecture rule: *"Use OpenTelemetry for distributed tracing — auto-instrument HTTP, database, and framework calls — add custom spans for critical paths."* The workflow-engine spec also requires it. No `@opentelemetry/*` packages are installed, no SDK initialization exists, and no spans are added anywhere.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` and initialize in `app.ts` or a separate `telemetry.ts` module. Add `// Verifies: FR-WF-013` traceability comment.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-007: Logger Does Not Switch to Pretty-Printing in Development
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/utils/logger.ts:17-25`
- **Detail:** CLAUDE.md rule: *"Use structured JSON logging in production, pretty-printing in development."* `utils/logger.ts` unconditionally emits `JSON.stringify(entry)` to stdout regardless of `NODE_ENV`. Development sessions always produce machine-readable JSON, making local debugging harder.
- **Recommendation:** Add `const isProd = process.env.NODE_ENV === 'production'` guard; emit `JSON.stringify()` in production and a readable format (`[LEVEL] message ctx`) in development.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-008: Two `eslint-disable` Suppressions in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. In `useWorkItems.ts` the suppression is legitimate (intentional selective dependency array), but it's undocumented. CLAUDE.md architecture rules list "No disabled linting rules" as a pattern to check. Neither suppression has an inline explanation of why it's safe.
- **Recommendation:** Add a `// safe because: [reason]` comment next to each `eslint-disable` line to document intent and prevent future maintainers from treating it as technical debt to blindly remove.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-009: Dual Logger Architecture — Inconsistent Import Paths
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/store/workItemStore.ts:10` vs all other modules
- **Detail:** The store imports the logger directly from `'../utils/logger'` while every other module (routes, services, middleware) imports from `'../logger'` (the compatibility wrapper). Two logger surfaces for the same underlying implementation creates maintenance risk if the wrapper's normalization logic ever diverges from the direct import.
- **Recommendation:** Standardize on the wrapper (`import logger from '../logger'`) everywhere, including the store, so there is one consistent import path. The wrapper is the intended public API.

---

### QO-010: Non-Standard Verifies Comment in DebugPortalPage
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file contains `// Verifies: dev-crew debug portal` which is not a valid `FR-XXX` requirement ID. The traceability enforcer will not pick this up and it provides no spec linkage. The page is a legitimate feature (embedded debug iframe) but it's not traced to any formal requirement.
- **Recommendation:** Either add a formal FR ID in the requirements (FR-WF-014 or similar), or note in a comment that this is infrastructure and exempt from traceability, to prevent confusion.

---

### QO-011: Route Latency Histogram Missing From Observability Stack
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/src/metrics.ts`
- **Detail:** `FR-004` from `dev-workflow-platform.md` and CLAUDE.md both require *"route latency histogram; GET /metrics returns Prometheus text format with route latency histogram."* The `metrics.ts` file defines only counters (no Histogram). The middleware in `app.ts` logs requests but does not record timing. Without a latency histogram, SLO compliance against the `p95_default_ms: 200` budget defined in `inspector.config.yml` cannot be measured.
- **Recommendation:** Add `requestDurationHistogram = new Histogram({ name: 'http_request_duration_seconds', labelNames: ['method','route','status_code'] })` and wrap route handlers (or use express middleware) to record timing.
- **Cross-ref:** TheFixer (backend-coder)

---

### Summary JSON

```json
{
  "audit_date": "2026-04-25",
  "spec_coverage_percent": 93,
  "requirements_total": 29,
  "requirements_implemented": 27,
  "requirements_missing": 2,
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "Search route (FR-dependency-search) not implemented in app.ts" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration Histogram missing from metrics.ts" },
    { "id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "API client reads body.message instead of body.error — error text never surfaces" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "Duplicate test files for WorkItemListPage and WorkItemDetailPage" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer misses dependency-linking plan; enforcer regex matches non-FR IDs" },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "OpenTelemetry tracing not implemented despite being an architecture requirement" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "Logger always emits JSON; no pretty-printing in development" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Two undocumented eslint-disable suppressions in production source" },
    { "id": "QO-009", "severity": "P3", "category": "architecture-violation", "title": "Store imports logger from utils/logger directly; all other modules use wrapper" },
    { "id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "DebugPortalPage uses non-standard Verifies comment, not a valid FR ID" },
    { "id": "QO-011", "severity": "P3", "category": "spec-drift", "title": "Route latency histogram absent — p95 SLO cannot be measured" }
  ],
  "grade": "B",
  "grade_rationale": "0 P1s, 5 P2s (threshold for B is max_p2: 8), spec coverage 93% (B threshold: 60%). Search route gap and error-swallowing mismatch are the highest-priority fixes."
}
```

---

**Overall Grade: B** — No P1 findings. Five P2s sit well under the 8-finding ceiling. Spec coverage at 93% clears the 60% B-threshold comfortably. The two most actionable items are the missing `/api/search` route (actively breaking tests) and the error-field mismatch in the API client (silently degrading UX for all API failures).
