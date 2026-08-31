Now the full audit report:

---

## Quality Oracle Findings — 2026-08-31

### Spec Coverage Summary

| Reference Scope | FRs Defined | Traced in Source | Coverage |
|----------------|-------------|-----------------|----------|
| `Specifications/` (canonical domain truth) | 87 FR-IDs | **0** | **0%** |
| `Plans/self-judging-workflow` (implementation FRs) | 13 FR-WF-* | 13 | **100%** |
| `Plans/dependency-linking` (ad-hoc IDs) | 15 FR-dependency-* | ~15 | **~100%** (not enforced) |

**Overall Grade: C/D (contested)** — The Plans/ FR coverage is 100% (enforcer passes), but Specifications/ coverage is 0%, and 2 architecture-rule violations are confirmed P1.

---

### QO-001: Specification/Implementation Namespace Divorce — Massive Spec Drift
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (77 FRs: FR-001 → FR-069)
- **Detail:** CLAUDE.md declares `Specifications/` the "most critical documents" and the domain source of truth. `inspector.config.yml` sets `specs.dir: Specifications/`. Yet zero lines in `Source/` contain `// Verifies: FR-NNN` (the `FR-001…FR-069` format). The `Specifications/dev-workflow-platform.md` describes a Feature Request + Bug Report + Development Cycle system; what `Source/` implements is a Work Item Workflow engine using a completely different ID namespace (`FR-WF-*` from `Plans/`). Either:
  - The platform spec describes an abandoned prior design (pivot never reflected in Specifications/)
  - Or `dev-workflow-platform.md` is a demo/target spec for a project the platform would build, not the platform itself — but this is undocumented
  - Either way, 77 requirements with 0% source traceability against the tool that is supposed to enforce "specs are source of truth" is a critical integrity failure.
- **Recommendation:** Either (a) archive `dev-workflow-platform.md` as a demo project spec and document the distinction clearly, or (b) add `// Verifies: FR-NNN` comments to source if these requirements are actually implemented under different IDs. Update `inspector.config.yml` to point `specs.dir` at the spec(s) that actually govern `Source/`.
- **Cross-ref:** Requirements-reviewer should triage whether FR-001 to FR-069 are abandoned, target specs, or mismapped.

---

### QO-002: Architecture Violation — Route Handlers Call Store Directly, No Service Layer
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** Both route files `import * as store from '../store/workItemStore'` and call `store.createWorkItem`, `store.findAll`, `store.findById`, `store.updateWorkItem`, `store.softDelete`, `store.updateWorkItem` directly from within Express route handlers. Architecture rule: **"No direct DB calls from route handlers — use the service layer."** The store is the data layer (equivalent to a DB in this in-memory system). While services exist for business logic (`assessment.ts`, `router.ts`, `dependency.ts`, `changeHistory.ts`), there is no service mediating basic CRUD between routes and store.
- **Failure scenario:** Future addition of caching, validation middleware, or audit hooks at the service level will be silently bypassed by any route that still calls the store directly. Tech debt compounds as the pattern spreads.
- **Recommendation:** Extract a `workItemService.ts` that wraps store CRUD operations. Route handlers call `workItemService.create(...)`, `workItemService.list(...)`, etc. The store becomes an implementation detail hidden behind the service boundary.
- **Cross-ref:** TheFixer; backend-coder module.

---

### QO-003: Traceability Enforcer Blind Spot — Specifications/ Never Validated
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:1`
- **Detail:** The enforcer auto-selects the most recently modified `Plans/*/requirements.md`. It correctly validates `FR-WF-*` (Plans/self-judging-workflow — all 13 pass) but **never checks** `Specifications/` at all. The verification gate listed in CLAUDE.md (`python3 tools/traceability-enforcer.py`) passes green while 87 spec-level FRs are completely untraced. This creates a false confidence signal.
- **Failure scenario:** An agent running verification gates sees "TRACEABILITY PASSED" and marks work done, while 87 domain requirements have zero coverage.
- **Recommendation:** Add a second enforcer mode: `python3 tools/traceability-enforcer.py --specs-dir Specifications/` that cross-checks spec FRs, or document in CLAUDE.md that the enforcer only covers Plans/ FRs. The current CLAUDE.md verification gate is misleadingly named.

---

### QO-004: FR Namespace Fragmentation — Three ID Schemes, Only One Enforced
- **Severity:** P2
- **Category:** spec-drift
- **File:** Multiple source and test files
- **Detail:** Three incompatible FR ID namespaces are in active use:
  1. `FR-NNN` — Specifications/dev-workflow-platform.md (77 IDs, 0% covered, never enforced)
  2. `FR-WF-NNN` — Plans/self-judging-workflow (13 IDs, 100% covered, enforced when most recent)
  3. `FR-dependency-*` — Plans/dependency-linking (15 informal slug IDs, ~100% covered, but NOT enforced when self-judging-workflow is more recently modified)
  
  Additionally, informal non-ID strings appear: `DebugPortalPage.tsx:1` has `// Verifies: dev-crew debug portal — embedded container-test viewer` which isn't a requirement ID at all.
- **Failure scenario:** When `dependency-linking` plan is not the most-recently-modified, its 15 FR-dependency-* requirements lose enforcement silently.
- **Recommendation:** Standardize on one namespace per active plan. Add all active plans to enforcer config. Remove freeform Verifies strings.

---

### QO-005: FR-WF-013 (Observability) Has Zero Test Coverage
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Backend/tests/` (no file contains `Verifies: FR-WF-013`)
- **Detail:** FR-WF-013 requires "structured JSON logging for all workflow transitions; Prometheus metrics for items created/routed/assessed/dispatched." Source files reference FR-WF-013 (app.ts, logger.ts, assessment.ts, errorHandler.ts, metrics.ts), but no test file has a `// Verifies: FR-WF-013` comment. `tests/routes/metrics.test.ts` exists but covers only `FR-dependency-metrics` (dependency counters), not the core observability FRs. The traceability enforcer therefore has a false positive — it finds Verifies comments in src (not tests) and counts them.
- **Failure scenario:** Observability regressions (logger stops emitting structured JSON, metrics counter removed) go undetected by the test suite.
- **Recommendation:** Add tests for: (a) logger emits JSON in production mode, (b) `/metrics` endpoint returns `items_created_total`, `items_routed_total`, `items_assessed_total`, `items_dispatched_total` counters. Tag with `// Verifies: FR-WF-013`.

---

### QO-006: Silent Error Swallow in api/client.ts
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:**
  ```ts
  const body = await response.json().catch(() => ({}));
  ```
  When an HTTP error response has a non-JSON body (e.g., HTML 502 from a proxy), `response.json()` rejects. The `.catch(() => ({}))` silently swallows this error and returns an empty object. The catch block neither re-throws, nor logs, nor documents why suppression is intentional. Architecture rule: **"Never swallow errors silently."**
- **Failure scenario:** A gateway returns `502 Bad Gateway` with an HTML body. `body` becomes `{}`, `body.message` is undefined, error message becomes `"Request failed: 502"` — acceptable. But the swallow also hides any console visibility into what network layer failed. In more complex cases this pattern could mask real structural failures.
- **Recommendation:** Either document the intentional suppression explicitly: `// intentional: fallback to status code when body is not JSON`, or log it: `console.error('Failed to parse error response body', err)` — though for a frontend client, a brief comment is the minimum acceptable.

---

### QO-007: Four Frontend Components Have No Tests (All Recently Modified)
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Frontend/src/components/`
- **Detail:** The following production components were modified in the last 14 days and have no corresponding test file:
  - `Layout.tsx` — application shell with sidebar/header
  - `PriorityBadge.tsx` — visual priority indicator
  - `StatusBadge.tsx` — visual status indicator
  - `TypeBadge.tsx` — visual work item type indicator
  
  Three dependency components (`BlockedBadge`, `DependencyPicker`, `DependencySection`) DO have tests. This is an inconsistency — the newer/simpler badge components are less tested than the more complex ones.
- **Recommendation:** Add Vitest/RTL unit tests for each badge component (trivial — just render + snapshot or text assertion). Layout.tsx should test sidebar links and responsive behavior.

---

### QO-008: `eslint-disable` Suppressing Hook Dependency Warnings in Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two production files suppress `react-hooks/exhaustive-deps` warnings. These warnings exist to prevent stale closure bugs — suppressing them without documented justification is a latent correctness risk.
- **Recommendation:** Either fix the dependency arrays to be complete (preferred), or add an inline comment explaining why the specific dependency is intentionally omitted (e.g., `// eslint-disable-next-line react-hooks/exhaustive-deps -- fetchItems is stable across renders`).

---

### QO-009: Non-Standard Verifies Comment in DebugPortalPage.tsx
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** `// Verifies: dev-crew debug portal — embedded container-test viewer` is not a requirement ID. It won't be matched by the traceability enforcer or any grep-based coverage report. If this page implements a real requirement, it should reference a proper FR ID.
- **Recommendation:** Either add a proper FR ID (e.g., `FR-WF-009` if the debug portal is part of the dashboard requirement), or remove the Verifies prefix and replace with a plain comment.

---

### QO-010: tiered-merge-pipeline.md Spec (FR-TMP-001 to FR-TMP-010) Completely Untraced
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 requirements for E2E test generation, AI PR review, and auto-merge logic (FR-TMP-001 to FR-TMP-010) exist in Specifications/ with zero `// Verifies:` references anywhere in Source/. These may be platform-level requirements implemented in `platform/` (which is outside Source/ and not scanned), or may be planned-but-unimplemented.
- **Recommendation:** Verify which directory implements these. If `platform/`, add a note in inspector.config.yml that tiered-merge-pipeline FRs live in `platform/`, not `Source/`. If unimplemented, track as a backlog gap.

---

### Grade

| Metric | Value | Threshold |
|--------|-------|-----------|
| P1 findings | 2 | C = max 2 |
| P2 findings | 4 | C = max 15 |
| Spec coverage (Specifications/) | **0%** | C = min 40% |
| Spec coverage (Plans/ via enforcer) | **100%** | A = min 80% |

**Formal grade: D** — P1 count is at the C ceiling and the `specs.dir`-referenced coverage is 0%, which falls below all thresholds. The D grade is driven by the structural gap between canonical specs (Specifications/) and source implementation.

**Context**: If Plans/ coverage is the intended measure (because Specifications/ describe projects TO BE built, not the current Source/ implementation), the grade rises to **A** (2 P1s exceeds A threshold → **B** with 2 P1s and 4 P2s, well within B's max_p2: 8 — but B also requires max_p1: 0, so formally **C** even on Plans/ coverage).

**True grade (recommended): C** — once the QO-001 spec-drift ambiguity is resolved by documenting that Specifications/dev-workflow-platform.md is a target project spec, not a Source/ implementation spec.

---

```json
{
  "audit_date": "2026-08-31",
  "grade": "D (contested — see context; likely C once spec scope clarified)",
  "spec_coverage": {
    "specifications_dir": "0%",
    "plans_self_judging_workflow": "100%",
    "plans_dependency_linking": "~100% (not currently enforced)"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Specifications/dev-workflow-platform.md 77 FRs with 0% source traceability" },
    { "id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Route handlers call store directly — no service layer" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer never checks Specifications/ — false confidence" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Three FR namespaces, only one enforced at a time" },
    { "id": "QO-005", "severity": "P2", "category": "untested", "title": "FR-WF-013 (Observability) zero test coverage" },
    { "id": "QO-006", "severity": "P2", "category": "architecture-violation", "title": "Silent error swallow in api/client.ts:26" },
    { "id": "QO-007", "severity": "P2", "category": "untested", "title": "4 frontend components (Layout, PriorityBadge, StatusBadge, TypeBadge) have no tests" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressing hook dependency warnings in 2 production files" },
    { "id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "Non-standard Verifies comment in DebugPortalPage.tsx" },
    { "id": "QO-010", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-001 to FR-TMP-010 (tiered-merge-pipeline) fully untraced" }
  ],
  "p1_count": 2,
  "p2_count": 4,
  "p3_count": 4,
  "enforcer_result": "PASSED (Plans/self-judging-workflow — 13/13 FR-WF-* covered)",
  "escalate": []
}
```
