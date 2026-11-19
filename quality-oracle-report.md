---

## Quality Oracle Findings

**Audit date:** 2026-11-19 | **Grade: D** | **Config:** `Teams/TheInspector/inspector.config.yml`

---

### Spec Coverage: ~11%

| Scope | FRs defined | FRs traced in source | Coverage |
|-------|-------------|----------------------|----------|
| Domain Specifications (`Specifications/`) | 77 | 0 | **0%** |
| Plan: `self-judging-workflow` | 13 | 13 | **100%** |
| Plan: `dependency-linking` | 16 | ~10 (partial) | ~63% — but **not enforced** |
| Plan: `dev-workflow-platform` | 32 | 0 | **0%** |
| Plan: `orchestrated-dev-cycles` | 17 | 0 | **0%** |
| Plan: `dev-cycle-traceability` | 20 | 0 | **0%** |
| Plan: `image-upload` | 20 | 0 | **0%** |
| Plan: `orchestrator-cycle-dashboard` | 7 | 0 | **0%** |
| Plan: `duplicate-deprecated-status` | 13 | 0 | **0%** |
| **ALL PLANS TOTAL** | **~138** | **~23** | **~17%** |

Grading thresholds: Grade A ≥ 80%, B ≥ 60%, C ≥ 40%. **Score 17% → Grade D.**

---

### QO-001: Route Handlers Access Store Directly — Architecture Rule Violated
- **Severity:** P1
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/intake.ts:4` — 2 direct store calls
  - `Source/Backend/src/routes/workItems.ts:12` — 6 direct store calls (`createWorkItem`, `findAll`, `findById`, `updateWorkItem`, `softDelete`, …)
  - `Source/Backend/src/routes/workflow.ts:15` — 10 direct store calls
- **Detail:** CLAUDE.md mandates *"No direct DB calls from route handlers — use the service layer."* Only `dashboard.ts` follows this rule. The other three routes bypass the service layer entirely, mixing business logic, state mutation, and HTTP concerns in the same function. This makes the route handlers non-unit-testable in isolation and defeats the abstraction boundary.
- **Recommendation:** Create `Source/Backend/src/services/workItemService.ts` and `intakeService.ts`; move all `store.*` calls there; have routes call services only.
- **Cross-ref:** TheFixer for remediation; api-contract for shared-type coordination.

---

### QO-002: Traceability Enforcer Has a Critical Blind Spot
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (enforcer design)
- **Detail:** The enforcer uses `max(req_files, key=os.path.getmtime)` — it checks **only the most recently modified `requirements.md`** across all plans. With 8 plans in `Plans/`, the enforcer currently only validates `self-judging-workflow` (13 FRs). The other 7 plans (125 FRs) are never verified. CLAUDE.md's "run verification gates before marking done" is functionally incomplete for all non-active plans.

  Additionally, the enforcer regex `FR-[A-Z0-9-]+` is **uppercase-only**. The `dependency-linking` plan uses IDs like `FR-dependency-types`, `FR-dependency-service` (lowercase descriptive) — these are silently skipped when running against that plan.

- **Recommendation:** Add `--all` flag that iterates over all `Plans/*/requirements.md` files; fix the regex to `FR-[A-Za-z0-9-]+` to handle both naming conventions. Alternatively, enforce the `FR-WF-NNN` naming convention project-wide.
- **Cross-ref:** [ESCALATE → TheFixer] for tooling fix.

---

### QO-003: 7 Plans (106+ FRs) Have Zero Traceability in Source
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `Plans/dev-workflow-platform/requirements.md` (FR-001..032), `Plans/orchestrated-dev-cycles/requirements.md` (FR-033..049), `Plans/dev-cycle-traceability/requirements.md` (FR-050..069), `Plans/image-upload/requirements.md` (FR-070..089), `Plans/orchestrator-cycle-dashboard/requirements.md` (FR-070..076), `Plans/duplicate-deprecated-status/requirements.md` (FR-DUP-*), `Plans/dependency-linking/requirements.md` (FR-dependency-* — partially traced, not enforced)
- **Detail:** No `// Verifies: FR-001` through `// Verifies: FR-089` appears anywhere in `Source/`. These plans represent completed or in-progress features (dashboard, work-item CRUD, workflow engine, intake, assessments, routing) that ARE implemented in source, but the implementations carry no traceability links back to the original requirements. The spec-first principle is structurally violated for these plans.
- **Recommendation:** Backfill `// Verifies: FR-XXX` comments in the relevant source files; run `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` (after fixing QO-002) to enforce coverage.
- **Cross-ref:** QO-002 (enforcer must be fixed first).

---

### QO-004: Four Frontend Components Have No Tests
- **Severity:** P2
- **Category:** untested
- **Files:**
  - `Source/Frontend/src/components/Layout.tsx` — no `Layout.test.tsx`
  - `Source/Frontend/src/components/PriorityBadge.tsx` — no `PriorityBadge.test.tsx`
  - `Source/Frontend/src/components/StatusBadge.tsx` — no `StatusBadge.test.tsx`
  - `Source/Frontend/src/components/TypeBadge.tsx` — no `TypeBadge.test.tsx`
- **Detail:** All four files were modified within the last 14 days (repo initialized 2026-11-19). The three badge components (`Priority`, `Status`, `Type`) render different visual states based on enum values — regressions in display logic (wrong color, wrong label) would go undetected. `Layout.tsx` renders the navigation shell.
- **Recommendation:** Create `Source/Frontend/tests/components/PriorityBadge.test.tsx`, `StatusBadge.test.tsx`, `TypeBadge.test.tsx`, `Layout.test.tsx`; include `// Verifies:` comments linking to their relevant FRs.
- **Cross-ref:** TheFixer → frontend-coder.

---

### QO-005: FR ID Naming Convention Is Fragmented Across Plans
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `Plans/dev-workflow-platform/requirements.md`, `Plans/dependency-linking/requirements.md`, `Plans/self-judging-workflow/requirements.md`
- **Detail:** Three distinct FR ID formats coexist with no documented standard:
  - **Legacy numeric:** `FR-001` through `FR-089` (dev-workflow-platform, image-upload, etc.)
  - **Lowercase descriptive:** `FR-dependency-types`, `FR-dependency-service` (dependency-linking plan)
  - **Namespace-prefixed numeric:** `FR-WF-001` through `FR-WF-013` (self-judging-workflow — the only format the enforcer handles)

  The traceability enforcer regex `FR-[A-Z0-9-]+` silently drops all lowercase IDs, creating phantom coverage gaps that are invisible to the gate.
- **Recommendation:** Establish a convention: `FR-{NAMESPACE}-{NNN}` (e.g., `FR-DEP-001`). Migrate legacy plans on next edit. Update enforcer regex to `FR-[A-Za-z0-9-]+`.

---

### QO-006: `eslint-disable` Suppressions in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both suppressions silence the exhaustive-deps rule, which guards against stale closures in `useCallback`/`useEffect`. Each should carry a comment explaining why the dependency is intentionally excluded; currently neither does. The suppression in `DependencyPicker.tsx` is in a `useCallback` with `[currentItemId]` — if other captured variables change, the callback silently uses stale values.
- **Recommendation:** Add an inline explanation comment above each suppression, or refactor to eliminate the need (e.g., use a ref for stable callbacks). Do not suppress without documentation.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-19",
  "grade": "D",
  "spec_coverage_pct": 17,
  "domain_spec_coverage_pct": 0,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Route handlers access store directly" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer only checks 1 of 8 plans; uppercase-only regex misses lowercase FR IDs" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "7 plans (106+ FRs) have zero Verifies in source" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "4 frontend components (Layout, PriorityBadge, StatusBadge, TypeBadge) have no test files" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR ID naming fragmented across 3 incompatible conventions" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable suppressions without rationale comments" }
  ],
  "totals": { "P1": 2, "P2": 3, "P3": 1 },
  "escalations": [
    { "finding": "QO-002", "team": "TheFixer", "reason": "tooling fix" }
  ]
}
```

---

**What passes cleanly:**
- ✅ `self-judging-workflow` plan — 100% traced, enforcer passes
- ✅ No `console.log` in production source (logger abstraction in use)
- ✅ No hardcoded secrets or credentials found
- ✅ No files exceed 500 lines (largest: `WorkItemDetailPage.tsx` at 426 lines)
- ✅ No TODO/FIXME/HACK comments in source
- ✅ No disabled tests (skipped/xdescribe/xit)
- ✅ All backend test files carry `Verifies:` comments
- ✅ `DependencyPicker.tsx` empty catch is documented (`// Search errors are intentionally suppressed`)
- ✅ `dashboard.ts` route correctly routes through service layer
