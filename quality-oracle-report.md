Now the full audit report:

---

## Quality Oracle Findings — Full Audit (2026-08-26)

---

### Spec Coverage: **15.1%**

| Spec file | Requirements | Traced to source | Coverage |
|-----------|-------------|-----------------|----------|
| `Specifications/workflow-engine.md` | 13 (FR-WF-001..013) | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` | 70 (FR-001..069 + FR-dependency-seed) | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 3 (NFR-1..3) | 0 | **0%** |
| **Total** | **86** | **13** | **15.1%** |

---

### QO-001: `dev-workflow-platform.md` — 70 Requirements with Zero Implementation

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 through FR-069 + FR-dependency-seed)
- **Detail:** This spec describes a completely different product from what is built. The spec covers feature-request management, bug reports, development cycles, a pipeline orchestration system, and a React SPA — all backed by SQLite. The actual codebase is a self-judging in-memory workflow engine (FR-WF-001..013). Not a single `// Verifies: FR-XXX` comment referencing any of the 70 requirements appears anywhere in `Source/`. This represents either: (a) a dead specification for a decommissioned product that was replaced by the current implementation, (b) a future roadmap spec for a product not yet started, or (c) an abandoned implementation that was replaced mid-stream. In all cases, the spec is currently generating massive false negative in coverage metrics and will mislead any future agent that reads it as authoritative.
- **Recommendation:** Determine intent, then act:
  1. If the spec is a planned future product → move it to `Plans/` with a plan shell, tag it `[status: planned]`, and note it is not yet started
  2. If it was superseded by the workflow-engine → archive it to `docs/archive/` and update `CLAUDE.md` to reflect the single authoritative spec
  3. If it should be implemented → treat every FR as an open requirement and create a pipeline to build it
- **Cross-ref:** Any new pipeline execution that reads `Specifications/` as truth will plan against FR-001..069 and build the wrong product.

---

### QO-002: Traceability Enforcer Scans `Plans/` Not `Specifications/` — False Assurance

- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:30-50` / `Teams/TheInspector/inspector.config.yml:36-37`
- **Detail:** The enforcer reports `TRACEABILITY PASSED: All requirements have implementation references` by scanning the most recently modified `Plans/*/requirements.md` (currently `Plans/self-judging-workflow/requirements.md`) for FR-WF-001..013. The `inspector.config.yml` configures `specs.dir: "Specifications/"` and `patterns.traceability: "FR-\\d+"` — but the enforcer **ignores `inspector.config.yml` entirely**. It does not read the inspector config; it uses its own internal logic. Two mismatches compound:
  1. The enforcer targets `Plans/` (13 FRs), not `Specifications/` (86 requirements).
  2. The config regex `FR-\\d+` matches `FR-001` format, but the codebase uses `FR-WF-001` format — so the config's pattern would fail to match any of the actual traceability comments if it were used.
  The verification gate always passes and says nothing about 73 unimplemented requirements.
- **Recommendation:**
  1. Either extend the enforcer to also accept a `--specs` flag pointing to `Specifications/` and enumerate all FRs there, OR
  2. Update `inspector.config.yml` to reflect the actual enforcer behaviour (i.e., change `specs.dir` to `Plans/self-judging-workflow/` and `traceability: "FR-WF-\\d+"`) so the config documents what is actually enforced.

---

### QO-003: Route Handlers Directly Call the Data Store (Service Layer Bypassed)

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** All three route files contain `import * as store from '../store/workItemStore'` and call store functions (e.g., `store.createWorkItem()`, `store.findById()`, `store.findAll()`, `store.softDelete()`) directly from within request handlers. CLAUDE.md is explicit: **"No direct DB calls from route handlers — use the service layer."** The store (`workItemStore.ts`) is the data/persistence layer. Service files exist (`services/assessment.ts`, `services/router.ts`, `services/dependency.ts`, `services/dashboard.ts`, `services/changeHistory.ts`) but core CRUD has no service wrapper. Route handlers also contain inline validation logic (type/priority/source enum checks) that belongs in a service layer.
- **Failure scenario:** If the store needs to be swapped (e.g., adding SQLite persistence), every route file must be edited instead of one service file. Inline validation also cannot be unit-tested without hitting the HTTP layer.
- **Recommendation:** Introduce a `workItemService.ts` that wraps the store (create, findById, findAll, update, softDelete) and moves the enum validation into the service. Routes then call the service and handle only HTTP-level concerns (parsing, status codes, logging).
- **Cross-ref:** [ESCALATE → TheFixer] for refactor; low risk since tests cover all routes.

---

### QO-004: `metrics.test.ts` Uses `FR-dependency-metrics` Instead of `FR-WF-013`

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/tests/routes/metrics.test.ts:1`
- **Detail:** The metrics test file covers Prometheus counter behaviour — which is FR-WF-013 ("Observability: structured logging and metrics"). However, every `// Verifies:` comment in `metrics.test.ts` references `FR-dependency-metrics`, an ad-hoc identifier that does not appear in any spec file. The enforcer reports FR-WF-013 as covered because *production* source files carry the tag (`metrics.ts`, `assessment.ts`, `app.ts`) — but no *test* file formally traces to FR-WF-013. The `FR-dependency-metrics` ID exists only in comments; it is not enforceable.
- **Recommendation:** Add `// Verifies: FR-WF-013` to `metrics.test.ts:1` (alongside `FR-dependency-metrics` if the dependency metric aspect should be preserved). Standardise all non-standard IDs against the spec table.

---

### QO-005: Silent `catch` in API Client Not Documented

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` silently swallows the JSON parse error and falls back to an empty object. CLAUDE.md: **"Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."** No comment explains the intent. A future reader cannot distinguish intentional fallback from oversight.
- **Recommendation:** Add an explanatory comment:
  ```ts
  // JSON parsing may fail if the error response has no body (e.g., 502 from a proxy).
  // Fall back to {} so the outer error path still returns a typed ApiError.
  const body = await response.json().catch(() => ({}));
  ```

---

### QO-006: `eslint-disable` in Production Hook Without Justification

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses a lint rule that protects against stale closures in `useEffect`/`useCallback`. No comment explains why the dependency is intentionally excluded. CLAUDE.md lists `eslint-disable` as a code pattern to flag.
- **Recommendation:** Either fix the dependency array (add the missing dep) or add an inline comment explaining the deliberate omission and its safety guarantee, e.g., `// omit 'fetchItems' — stable function ref guaranteed by useCallback`.

---

### QO-007: `DebugPortalPage.tsx` Uses Non-Standard Verifies Format

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file carries `// Verifies: dev-crew debug portal — embedded container-test viewer`. This is a prose description, not a spec ID. The traceability enforcer pattern (`FR-WF-\d+` or `FR-\d+`) will never match it, leaving the page unlinked in any automated coverage report.
- **Recommendation:** If a formal spec requirement covers the debug portal, use that ID. If none exists (i.e., this is infrastructure added without a spec), either write a spec entry or accept it as an explicitly unlinked implementation and note it in the spec as `FR-WF-014` or similar.

---

### Overall Health Grade: **D**

| Dimension | Value | Threshold |
|-----------|-------|-----------|
| Spec coverage | 15.1% | ≥40% for C |
| P1 findings | 1 | 0 for A/B |
| P2 findings | 2 | ≤3 for A |
| Grade | **D** | — |

The grade is driven entirely by **QO-001**: 70 requirements in the primary specification have no implementation. Once the spec-vs-implementation relationship is resolved (archive, plan, or build), the enforcer should be re-scoped accordingly — the actual workflow-engine implementation is at **100% coverage** for its own spec and passes all verification gates cleanly.

---

```json
{
  "audit_date": "2026-08-26",
  "grade": "D",
  "spec_coverage_pct": 15.1,
  "requirements_total": 86,
  "requirements_traced": 13,
  "p1_count": 1,
  "p2_count": 2,
  "p3_count": 4,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform.md: 70 FRs with zero implementation"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer scans Plans/ not Specifications/ — false assurance"},
    {"id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers directly access the data store, bypassing service layer"},
    {"id": "QO-004", "severity": "P3", "category": "spec-drift", "title": "metrics.test.ts uses FR-dependency-metrics instead of FR-WF-013"},
    {"id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "Silent catch() in api/client.ts not documented"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable in useWorkItems.ts without justification comment"},
    {"id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "DebugPortalPage.tsx uses non-enforceable Verifies format"}
  ],
  "positive_signals": [
    "FR-WF-001..013 all 100% traced to source — enforcer PASSES",
    "123 Verifies comments across backend tests, all major test files covered",
    "No console.log in production source — logger abstraction in use",
    "No hardcoded secrets detected",
    "No skipped or todo tests",
    "All frontend test files carry Verifies traceability",
    "API response shape (data wrapper + PaginatedResponse) consistently applied in store/findAll"
  ]
}
```
