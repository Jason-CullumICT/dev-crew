---

## Quality Oracle Findings

### Spec Coverage: ~15%
| Source | FRs Defined | FRs Traced to Source | Coverage |
|--------|------------|---------------------|----------|
| `Plans/self-judging-workflow/requirements.md` (active plan) | 13 (FR-WF-001..013) | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` (canonical spec) | 74 numeric + 16 FR-dependency-* | 15 FR-dependency-* only | **20%** |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001..010) | 0 | **0%** |
| `Specifications/workflow-engine.md` | 0 formal IDs (narrative only) | — | **N/A** |
| **TOTAL vs `Specifications/`** | **~100** | **~15** | **~15%** → Grade **D** |

---

### QO-001: Catastrophic Spec Drift — Implementation Uncoupled from `Specifications/`
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Specifications/dev-workflow-platform.md` vs `Source/`
- **Detail:** The `Specifications/` directory (the canonical truth per `inspector.config.yml` and `CLAUDE.md`) defines an SQLite-backed feature-request management platform (FR-001..069, covering voting, dev cycles, bug reports, pipeline orchestration, etc.). The actual implementation is a wholly different application — an in-memory workflow engine — traced only to `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013). Zero of the 74 numeric spec FRs (FR-001..069) are referenced anywhere in `Source/`. The architecture rule "Specs are source of truth" is violated: implementation does not trace to `Specifications/`.
- **Recommendation:** Formally supersede the old specs. Either (a) move FR-WF-001..013 from the plan into `Specifications/workflow-engine.md` with proper IDs, or (b) annotate `Specifications/dev-workflow-platform.md` as `[SUPERSEDED by workflow-engine plan]`. The `Specifications/workflow-engine.md` itself must be augmented with formal FR IDs so it becomes enforceable.
- **Cross-ref:** This is a structural gap that blocks all other traceability enforcement.

---

### QO-002: `/api/search` Route Unimplemented — FR-dependency-search Open
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/tests/routes/search.test.ts:3–6`, `Source/Backend/src/app.ts`
- **Detail:** `GET /api/search` (FR-dependency-search) is not registered in `app.ts`. The test file explicitly documents this: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests … will FAIL until the route is implemented."* The frontend API client (`Source/Frontend/src/api/client.ts:100`) calls this endpoint for the DependencyPicker typeahead — meaning the dependency picker search is silently broken in production.
- **Recommendation:** Wire a search route in `app.ts` that delegates to the existing `workItemStore.findAll()` with title/description filtering. Route registration is the only missing piece; the test contract already exists.
- **Cross-ref:** Escalate to TheFixer (backend-coder scope).

---

### QO-003: Traceability Enforcer Blind to `Specifications/` — False "PASSED" Signal
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py`, `Teams/TheInspector/inspector.config.yml`
- **Detail:** The enforcer scans only the most recently modified `Plans/*/requirements.md`, not the `Specifications/` directory configured as `specs.dir` in `inspector.config.yml`. Running `python3 tools/traceability-enforcer.py` reports "TRACEABILITY PASSED" after checking 13 requirements from the self-judging-workflow plan — while 84+ requirements in `Specifications/` go entirely unchecked. The verification gate in `CLAUDE.md` citing this tool provides false assurance.
- **Recommendation:** Add a `--dir Specifications/` flag or second scan mode to the enforcer so the full specification corpus is checked. Until then, the gate cannot be trusted for spec-level coverage.
- **Cross-ref:** [ESCALATE → team leaders, pipeline gate owners]

---

### QO-004: `Specifications/workflow-engine.md` Has No Formal FR IDs
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Specifications/workflow-engine.md`
- **Detail:** The conceptual spec for the current implementation is pure narrative — no `FR-XXX` IDs at all. This means the workflow engine's requirements cannot be traced at the spec level, only at the plan level (`Plans/self-judging-workflow/requirements.md`). The architecture rule "implementation traces to specs" is only partially met (traces to plan, not to Specifications/).
- **Recommendation:** Either promote the plan requirements into `workflow-engine.md` with matching FR-WF-* IDs, or add a formal requirements table to `workflow-engine.md`.

---

### QO-005: 12 Frontend Test Files Have Zero `// Verifies:` Comments
- **Severity:** P2  
- **Category:** untested (traceability gap)
- **Files:** All 12 files in `Source/Frontend/tests/` — `App.test.tsx`, `CreateWorkItemPage.test.tsx`, `DashboardPage.test.tsx`, `WorkItemDetailPage.test.tsx`, `WorkItemListPage.test.tsx`, `integration.test.tsx`, `api-client.test.ts`, `components/BlockedBadge.test.tsx`, `components/DependencyPicker.test.tsx`, `components/DependencySection.test.tsx`, `pages/WorkItemDetailPage.test.tsx`, `pages/WorkItemListPage.test.tsx`
- **Detail:** Architecture rule: "Every FR needs a test with `// Verifies: FR-XXX` traceability comments." 100% of frontend test files violate this rule. The backend test suite is fully traced (all 14 files have Verifies comments). The frontend test suite is entirely untraced, making it impossible to verify FR-WF-009..012 and all FR-dependency-frontend-* requirements through the test suite.
- **Recommendation:** Add `// Verifies: FR-WF-XXX` header comment to each frontend test file. Most mappings are straightforward (e.g., `App.test.tsx` → FR-WF-009, `WorkItemListPage.test.tsx` → FR-WF-010, `DashboardPage.test.tsx` → FR-WF-009, `CreateWorkItemPage.test.tsx` → FR-WF-012, etc.).

---

### QO-006: `FR-dependency-seed` — Only Dependency FR with No Source Reference
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-dependency-seed requirement)
- **Detail:** 15 of 16 `FR-dependency-*` requirements are referenced in source via `// Verifies:`. The sole exception is `FR-dependency-seed` (idempotent seed data: BUG-0010 blocked-by chain, FR-dependency chain). There is no seed file or `// Verifies: FR-dependency-seed` anywhere in `Source/`. Seed data may exist but is untraceable.
- **Recommendation:** If seed data exists, add a `// Verifies: FR-dependency-seed` comment. If absent, create a seed script or mark the requirement as out-of-scope for the workflow engine app.

---

### QO-007: Two `eslint-disable` Suppressions Without Justification
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. The `useWorkItems.ts` instance is intentional (dependency array is explicitly spelled out, avoiding stale closure — a known valid pattern). The `DependencyPicker.tsx` instance is unreviewed. Architecture rule: disabled linting rules must be documented.
- **Recommendation:** Add an inline comment explaining *why* the exhaustive-deps rule is bypassed for each instance (e.g., `// intentional: fetchItem is stable, adding it would cause infinite loop`).

---

### QO-008: Hardcoded `localhost:4200` in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`
- **Detail:** `const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200'` hardcodes a development URL as a production fallback. While guarded by an env var, hardcoded URLs in production source are listed as a pattern-violation in the codebase's own architecture rules.
- **Recommendation:** The fallback is acceptable for a debug page, but add a comment documenting the intent: `// Dev-only fallback; set VITE_PORTAL_URL in production`. Consider whether the debug portal should be disabled entirely in production.

---

```json
{
  "audit_date": "2026-09-03",
  "spec_coverage": {
    "specifications_dir": 15,
    "specifications_total": 100,
    "specifications_pct": 15,
    "active_plan_coverage_pct": 100,
    "grade": "D"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Implementation uncoupled from Specifications/ — 0% of FR-001..069 traced"},
    {"id": "QO-002", "severity": "P1", "category": "untested", "title": "GET /api/search unimplemented — FR-dependency-search open, frontend broken"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer ignores Specifications/ — false PASSED signal"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "workflow-engine.md has no formal FR IDs — unenforceable"},
    {"id": "QO-005", "severity": "P2", "category": "untested", "title": "All 12 frontend test files missing // Verifies: comments"},
    {"id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed has no source reference"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable suppressions without justification comment"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Hardcoded localhost:4200 fallback in DebugPortalPage"}
  ],
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 3,
  "escalations": [
    "QO-002 → TheFixer (wire /api/search route)",
    "QO-003 → pipeline gate owners (traceability enforcer scope)"
  ]
}
```

---

**Summary:** Two P1 blockers — the most critical being that the entire `Specifications/` corpus is effectively orphaned from the implementation (the codebase traces to `Plans/`, not `Specifications/`), and one endpoint (`/api/search`) is confirmed unimplemented with a failing test suite. The traceability enforcer reports a false "PASSED" because it only checks the active plan (100% covered) while ignoring the canonical spec directory (15% covered). Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
