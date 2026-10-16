# Quality Oracle Findings — 2026-10-16

**Audit scope:** Full spec-drift analysis + pattern enforcement  
**Grade:** **D** (P1 findings present; spec coverage ~0% for two of three Specification documents)  
**Enforcer gate:** `python3 tools/traceability-enforcer.py` → PASSES (plans-level only)  
**Enforcer against Specifications:** → FAILS: 76 missing in dev-workflow-platform.md, 13 missing in tiered-merge-pipeline.md

---

## Spec Coverage Summary

| Spec Document | Requirements | Implemented | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` FR-dependency-* | 14 | 14 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` FR-001–FR-069 | 69 | 0 | **0%** ❌ |
| `Specifications/tiered-merge-pipeline.md` FR-TMP-001–FR-TMP-010 | 10 | 0 | **0%** ❌ |
| `Specifications/workflow-engine.md` | 0 (no FR IDs) | — | n/a |

**Overall Specifications coverage: ~12%** (only FR-dependency-* out of ~93 spec requirements).

---

## QO-001: Catastrophic Spec-Drift — `Specifications/dev-workflow-platform.md` Defines a Product That Doesn't Exist

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (lines 337–482)
- **Detail:**  
  `dev-workflow-platform.md` defines 69 numbered requirements (FR-001–FR-069) for a **Feature Request tracking platform** — Feature Request APIs, Bug Report CRUD, Development Cycle management, Pipeline Orchestration stages, Dev Cycle Traceability, and Frontend pages for all of these.  
  
  **None of these are implemented.** The actual codebase implements a completely different product: a **Self-Judging Workflow Engine** (work items: `WI-XXX`, status lifecycle backlog→routing→proposed→approved→in-progress, assessment pod, team dispatch). This product is not described by FR-001–FR-069 at all.  
  
  Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` reports **76 requirements missing** (FR-001–FR-069 plus two placeholder IDs).

- **Recommendation:**  
  Either (a) archive/deprecate `dev-workflow-platform.md` as a legacy/aspirational document with a header note, OR (b) document it as a planned future product and mark all FRs as "status: not-started". The active product is the workflow engine — its spec lives in `Specifications/workflow-engine.md` and `Plans/self-judging-workflow/requirements.md`.  
  
  The workflow-engine spec (`Specifications/workflow-engine.md`) should gain explicit FR-WF-* identifiers to serve as the canonical spec for the current implementation.

- **Cross-ref:** TheFixer (clarification), requirements-reviewer (spec ownership)

---

## QO-002: Traceability Enforcer Doesn't Check `Specifications/` — False Green Signal

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py` (lines 49–57)
- **Detail:**  
  The enforcer auto-selects the most-recently-modified `requirements.md` in `Plans/`. It never reads from `Specifications/`. This means `npm run gates` or `python3 tools/traceability-enforcer.py` reports **PASSED** while 89 requirements across two Specification documents (FR-001–FR-069 and FR-TMP-001–FR-TMP-010) have zero implementation coverage.  
  
  The architecture rule states "Specs are source of truth." If the enforcer doesn't check `Specifications/`, it cannot enforce that rule. The current setup enforces `Plans/` only — a weaker, narrower contract.

- **Recommendation:**  
  Add a second enforcer mode or extend the default to also scan `Specifications/` active documents. Alternatively: add a `specifications:` key to `inspector.config.yml` that lists which spec files the enforcer must pass before any merge.

- **Cross-ref:** QO-001 (same root cause)

---

## QO-003: `Specifications/tiered-merge-pipeline.md` — 10 Requirements Entirely Unimplemented

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:**  
  FR-TMP-001 (Risk Classification), FR-TMP-002 (Playwright E2E), FR-TMP-003 (Live E2E Runner), FR-TMP-004 (Auto-PR), FR-TMP-005 (AI PR Review), FR-TMP-006 (Auto-Merge Logic), FR-TMP-007 (Configuration), FR-TMP-008 (Worker Container Prerequisites), FR-TMP-009 (Run JSON Extensions), FR-TMP-010 (Error Handling) — all 10 are absent from `Source/`.  
  
  The Playwright config files exist (`Source/E2E/playwright.config.ts`, `Source/E2E/playwright.pipeline.config.ts`) but carry no `// Verifies: FR-TMP-*` traceability comments. It's unclear whether the E2E infrastructure partially satisfies FR-TMP-002/003 — but without traceability comments, that cannot be asserted.

- **Recommendation:**  
  If tiered-merge-pipeline is in scope: add `// Verifies: FR-TMP-XXX` to all E2E and pipeline files that implement these requirements. If not in scope for the current codebase (it lives in `platform/`), annotate the spec with the location of the implementation and exclude it from the `Source/` enforcer scan.

- **Cross-ref:** QO-001, QO-002

---

## QO-004: FR-WF-* Requirements Not Defined in `Specifications/` — Plans Drive Source of Truth

- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Plans/self-judging-workflow/requirements.md`
- **Detail:**  
  The 13 active requirements (FR-WF-001–FR-WF-013) that all source `// Verifies:` comments trace to are defined only in `Plans/self-judging-workflow/requirements.md`, not in any `Specifications/` document. CLAUDE.md mandates: "Specs are source of truth — implementation traces to specs, never the other way around."  
  
  `Specifications/workflow-engine.md` IS the domain truth for the workflow engine, but it contains no explicit FR identifiers. As a result, source files trace to plan-level IDs that live outside the canonical `Specifications/` tree.

- **Recommendation:**  
  Add explicit FR-WF-001–FR-WF-013 identifiers to `Specifications/workflow-engine.md` as a requirements table (similar to how `dev-workflow-platform.md` is structured). Then the enforcer can point at the spec file as source of truth.

---

## QO-005: Architecture Violation — Route Handlers Call Store Layer Directly

- **Severity:** P2
- **Category:** architecture-violation
- **Files:**  
  - `Source/Backend/src/routes/workItems.ts:44,73,79,89,134,142`  
  - `Source/Backend/src/routes/workflow.ts:44,71,99,119,155,175,217,269,317,359`  
  - `Source/Backend/src/routes/intake.ts:19,42`
- **Detail:**  
  CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer." All three route files import and call `store.*` functions directly (`store.findById`, `store.createWorkItem`, `store.findAll`, `store.updateWorkItem`, `store.softDelete`). While the store is in-memory (not a SQL DB), the architectural separation principle is violated: route handlers mix HTTP concerns with data-access concerns.  
  
  The `workflow.ts` does correctly use `routeWorkItem`, `assessWorkItem`, `assignTeam`, and `dependency.*` services for domain logic, but it bypasses the service layer for all raw store reads and writes.

- **Failure scenario:** When the store is replaced with a persistent backend (SQLite is mentioned in FR-002), every route file will need to be rewritten to remove direct store calls — a ripple change that a service layer would have prevented.

- **Recommendation:**  
  Extract data-access operations into a `workItemService.ts` that wraps the store. Route handlers should only call the service.

- **Cross-ref:** TheFixer for remediation

---

## QO-006: `eslint-disable` Suppression in Production Source — 2 Occurrences

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**  
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` (`react-hooks/exhaustive-deps`)
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` (`react-hooks/exhaustive-deps`)
- **Detail:**  
  Both files silence the `react-hooks/exhaustive-deps` ESLint rule rather than fixing the underlying dependency array issue. Suppressing this rule risks stale closure bugs where effects reference outdated values.

- **Failure scenario:** A hook closure captures a stale callback ref; behavior changes when a dependency updates but the effect doesn't re-run.

- **Recommendation:**  
  Audit both callsites and either fix the dependency array (add the missing dep and confirm correctness) or use `useCallback` to stabilise the function reference before including it.

---

## QO-007: Dashboard Routes Missing Prometheus Metrics

- **Severity:** P3
- **Category:** pattern-violation (observability)
- **File:** `Source/Backend/src/routes/dashboard.ts`
- **Detail:**  
  CLAUDE.md: "New routes must have observability — structured logging (not console.log), Prometheus metrics for domain-significant operations." The dashboard routes (`/summary`, `/activity`, `/queue`) use `logger.debug` (correct) but expose **no Prometheus metrics**. Dashboard aggregation reads all work items on every call — an unbounded scan — which could become a performance hot spot with no visibility.

- **Recommendation:**  
  Add a `dashboard_requests_total` counter or reuse the existing metrics pattern. Tag by endpoint (`summary`/`activity`/`queue`). Also consider adding a `workitem_store_size_total` gauge to make the unbounded scan visible in production dashboards.

---

## QO-008: `setup.ts` Test File Missing `// Verifies:` Comment

- **Severity:** P4
- **Category:** untested (traceability hygiene)
- **File:** `Source/Frontend/tests/setup.ts:1`
- **Detail:**  
  Every test file is expected to carry a `// Verifies: FR-XXX` comment per architecture rules. The test setup file (`setup.ts`) has none. This is low-impact (setup files don't directly verify requirements), but creates a gap in audit completeness.

- **Recommendation:**  
  Add `// Verifies: (test infrastructure — no direct FR mapping)` or link to the relevant FR (e.g., `FR-WF-009` if the setup supports frontend tests).

---

## JSON Summary

```json
{
  "audit_date": "2026-10-16",
  "grade": "D",
  "spec_coverage": {
    "plans_requirements": { "total": 13, "covered": 13, "pct": 100 },
    "specifications_dev_workflow_platform_dependency": { "total": 14, "covered": 14, "pct": 100 },
    "specifications_dev_workflow_platform_numeric": { "total": 69, "covered": 0, "pct": 0 },
    "specifications_tiered_merge_pipeline": { "total": 10, "covered": 0, "pct": 0 },
    "overall_specifications": { "total": 93, "covered": 14, "pct": 15 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform.md defines unimplemented product (FR-001–FR-069: 0% coverage)" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer checks Plans/ only — Specifications/ never validated" },
    { "id": "QO-003", "severity": "P1", "category": "spec-drift", "title": "tiered-merge-pipeline.md: all 10 FR-TMP-* requirements unimplemented" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-WF-* defined only in Plans/ not Specifications/ — inverts source-of-truth rule" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store layer directly (workItems.ts, workflow.ts, intake.ts)" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable react-hooks/exhaustive-deps suppressions in production source" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Dashboard routes have no Prometheus metrics" },
    { "id": "QO-008", "severity": "P4", "category": "untested", "title": "setup.ts missing // Verifies: comment" }
  ],
  "p1_count": 3,
  "p2_count": 2,
  "p3_count": 2,
  "p4_count": 1,
  "escalations": [],
  "enforcer_gate": {
    "default_run": "PASS",
    "against_specifications_dev_workflow_platform": "FAIL (76 missing)",
    "against_specifications_tiered_merge_pipeline": "FAIL (13 missing)"
  }
}
```
