# Quality Oracle Findings — 2026-11-08

## Spec Coverage: ~16%

| Metric | Value |
|--------|-------|
| FR IDs in Specifications/ | 77 unique (FR-001 to FR-069, FR-0002 to FR-0007, FR-1 to FR-3) |
| FR IDs referenced in Source/ | 28 unique (FR-WF-001 to FR-WF-013, FR-dependency-*) |
| Namespace overlap | **0** — completely disjoint ID sets |
| Traceability enforcer scope | Plans/self-judging-workflow/requirements.md (13 FRs only) |
| Specifications/ FRs with implementation trace | **0 of 77** |

> **Note:** The enforcer reports "TRACEABILITY PASSED" but it only validates the 13 FRs in
> `Plans/self-judging-workflow/requirements.md`. It is completely blind to the 77 FRs in
> `Specifications/`. This creates a false sense of coverage.

---

## QO-001: FR Namespace Entirely Disconnected from Specifications

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` / `Source/` (all files)
- **Detail:** The domain specifications (`Specifications/dev-workflow-platform.md`) define
  77 functional requirements using the ID scheme `FR-001` through `FR-069` (plus sub-spec FRs).
  Every `// Verifies:` comment in the entire Source/ codebase uses a *different* namespace:
  `FR-WF-001` through `FR-WF-013` and `FR-dependency-*` — IDs that come from
  `Plans/self-judging-workflow/requirements.md`, not from `Specifications/`.

  The two namespaces have **zero overlap**. This means:
  - No source file traces back to any requirement in `Specifications/`.
  - The traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans `Plans/`
    for the most recently modified requirements file. It never reads `Specifications/`.
  - Calling `python3 tools/traceability-enforcer.py` returns "TRACEABILITY PASSED" for 13 FRs,
    but the 69 FRs in the main spec (`Specifications/dev-workflow-platform.md`) are completely
    unchecked.

- **Recommendation:**
  1. Decide which is authoritative: `Specifications/` or `Plans/self-judging-workflow/requirements.md`.
  2. If `Specifications/` is the truth (as CLAUDE.md states), update all `// Verifies:` comments
     in Source/ to use `FR-001`–`FR-069` IDs.
  3. Update `tools/traceability-enforcer.py` to also scan `Specifications/` for FR IDs, or
     add a `--spec` flag that reads from `Specifications/` as well as `Plans/`.
  4. Alternatively, if the self-judging workflow is the current scope, update the enforcer
     config to target Plans/ explicitly and add a note in CLAUDE.md that
     `Specifications/dev-workflow-platform.md` describes a future/deprecated system.

- **Cross-ref:** TheFixer for enforcer fix; requirements-reviewer for spec resolution.

---

## QO-002: Architecture Violation — Route Handlers Bypass Service Layer

- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workflow.ts`, `workItems.ts`, `intake.ts`
- **Detail:** CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."*

  Three of four route files import and call `workItemStore` directly:

  | File | Direct Store Calls |
  |------|--------------------|
  | `routes/workflow.ts:15` | `import * as store from '../store/workItemStore'` → 10 direct calls (`findById`, `updateWorkItem`) |
  | `routes/workItems.ts:12` | `import * as store from '../store/workItemStore'` → `createWorkItem`, `findById`, `updateWorkItem`, `deleteWorkItem` |
  | `routes/intake.ts:4` | `import * as store from '../store/workItemStore'` → `createWorkItem` |

  Only `routes/dashboard.ts` correctly goes through `dashboardService`. The violation is
  pervasive: all business logic for CRUD, state transitions, and intake is wired directly
  between HTTP layer and storage layer with no service abstraction.

  - `intake.ts` performs domain operations (default-value assignment, work item construction)
    entirely within the route handler with no service function.
  - `workflow.ts` applies state transitions directly in route handler code without delegating
    to a workflow service (the `assessment.ts` and `router.ts` services exist but are bypassed
    for the actual store mutations).

- **Recommendation:**
  1. Create `services/workItemService.ts` exposing `createWorkItem`, `getWorkItem`,
     `listWorkItems`, `updateWorkItem`, `deleteWorkItem`.
  2. Create `services/intakeService.ts` for intake-specific logic (source tagging,
     default value assignment).
  3. Move all `store.*` calls out of route handlers; routes should only handle HTTP
     concerns (request parsing, response shaping, error codes).
  4. Route through team pipeline (TheFixer) since this requires Source/ changes.

- **Cross-ref:** [ESCALATE → TheFixer] for refactoring; architecture-violation is non-negotiable.

---

## QO-003: Traceability Enforcer is Blind to Specifications/

- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer is designed to scan `Plans/*/requirements.md` for FR IDs and then
  verify those IDs appear as `// Verifies: FR-XXX` in `Source/`. It never reads
  `Specifications/`. Running it always produces a "PASSED" result even when every requirement
  in `Specifications/` is unimplemented.

  With 77 FR IDs defined in `Specifications/` and 0 of them referenced in Source/, the true
  spec coverage is approximately **0%** against the domain specification. The enforcer metric
  is misleading.

- **Recommendation:**
  Add a `--spec-dir` scan mode to `tools/traceability-enforcer.py` that:
  1. Reads all `FR-\d+` patterns from `Specifications/*.md`.
  2. Cross-checks them against `// Verifies: FR-XXX` in `Source/`.
  3. Reports separately from Plans-scoped enforcement.
  Alternatively, update `inspector.config.yml` to point `specs.dir` enforcer command at
  `Specifications/` and document the distinction between Plan-FRs and Spec-FRs.

- **Cross-ref:** Ties directly to QO-001.

---

## QO-004: Spec/Implementation Domain Mismatch (dev-workflow-platform.md)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** `Specifications/dev-workflow-platform.md` describes a full development platform:
  - Feature Requests (potential → voting → approved/denied)
  - Bug Reports with lifecycle
  - Development Cycles with CI/CD simulation
  - AI voting (≥3 agent votes, majority logic)
  - SQLite persistence with migrations
  - OpenTelemetry tracing

  The current `Source/` implements a *completely different system*: a work item workflow
  engine (intake → route → assess → approve/reject → dispatch) backed by an in-memory store
  with no SQL, no AI voting, no dev cycles.

  Historical context from `Plans/dev-workflow-platform/traceability-report.md` shows the
  platform spec *was once implemented* (388 tests, FR-001 to FR-032 fully covered), but
  that implementation has been replaced with the self-judging workflow engine. The spec was
  never updated to reflect this pivot.

  Impact: Any agent reading `Specifications/dev-workflow-platform.md` as the system source
  of truth will build the wrong thing, trace to wrong FR IDs, and fail code review.

- **Recommendation:**
  Either:
  a. Archive `Specifications/dev-workflow-platform.md` as `Specifications/archive/` and
     write a new spec reflecting the current work-item workflow domain; OR
  b. Add a prominent `## Status: SUPERSEDED` header at the top of
     `Specifications/dev-workflow-platform.md` with a pointer to the current spec/plan.
  Also, update `inspector.config.yml` `specs.dir` to point at whichever spec is authoritative.

- **Cross-ref:** requirements-reviewer owns Specifications/; solo session may edit directly.

---

## QO-005: eslint-disable Suppressions in Production Source (No Justification)

- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two recently modified production source files suppress the
  `react-hooks/exhaustive-deps` lint rule with no explanatory comment:

  ```ts
  // Source/Frontend/src/hooks/useWorkItems.ts:63
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Source/Frontend/src/components/DependencyPicker.tsx:82
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ```

  CLAUDE.md architecture rule: *"Never swallow errors silently"* applies equally to silencing
  static analysis. The `exhaustive-deps` rule guards against stale closure bugs — suppressing
  it without explanation hides a potential correctness issue.

  Both files were modified within the last 14 days (recently active), making these P2 rather
  than P3.

- **Recommendation:**
  For each suppression, either:
  a. Fix the missing dependency (preferred — add the dep, verify effect behaviour); OR
  b. Add a code comment explaining *why* the dep is intentionally excluded and confirming
     the stale-closure risk is accepted (e.g.,
     `// eslint-disable-next-line react-hooks/exhaustive-deps — fetchFn ref is stable, adding it would cause infinite loop`).
  Route through TheFixer.

---

## QO-006: DebugPortalPage Uses Non-Standard Verifies Comment

- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file header comment reads:
  ```ts
  // Verifies: dev-crew debug portal — embedded container-test viewer
  ```
  This does not follow the `// Verifies: FR-XXX` traceability format defined by the
  architecture rules. It has no requirement ID, so the enforcer cannot link it to any FR.
  Debug portal UI is listed in CLAUDE.md as owned by `frontend-coder` with no special
  spec exemption.

- **Recommendation:** Either assign this feature a proper FR in the active requirements
  file and update the comment, or if this is intentionally infrastructure-adjacent
  (not user-facing spec), document the exception explicitly.

---

## Summary JSON

```json
{
  "audit_date": "2026-11-08",
  "spec_coverage_percent": 0,
  "specs_dir": "Specifications/",
  "specs_fr_count": 77,
  "source_verifies_fr_count": 28,
  "namespace_overlap": 0,
  "enforcer_scope": "Plans/self-judging-workflow/requirements.md",
  "enforcer_result": "PASSED (13 FRs only — does not cover Specifications/)",
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "FR namespace entirely disconnected from Specifications"},
    {"id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Route handlers bypass service layer (3 of 4 route files)"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer blind to Specifications/"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md describes superseded system"},
    {"id": "QO-005", "severity": "P2", "category": "pattern-violation", "title": "eslint-disable suppressions without justification (2 occurrences)"},
    {"id": "QO-006", "severity": "P4", "category": "spec-drift", "title": "DebugPortalPage uses non-standard Verifies comment"}
  ],
  "grade": "D",
  "grade_rationale": "2 P1 findings; grading table requires max_p1=0 for A/B/C. D applies.",
  "escalation": {
    "QO-002": "TheFixer — service layer refactor",
    "QO-001-003-004": "requirements-reviewer + solo session — spec resolution"
  }
}
```
