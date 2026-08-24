---

## Quality Oracle Findings

### Spec Coverage: ~14% (Plans-only enforcer: 100%)

| Scope | FRs Found | Traced | Coverage |
|-------|-----------|--------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` | 16 | 13–16 | **~85%** |
| `Specifications/dev-workflow-platform.md` | 69 | 0 | **0%** ❌ |
| `Specifications/workflow-engine.md` | 0 (no FR IDs) | — | **N/A** |

---

### QO-001: Specifications/dev-workflow-platform.md describes a product that was never built
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:337`
- **Detail:** This file contains 69 formal FRs (FR-001 through FR-069) describing a SQLite-backed platform with feature requests, bug reports, development cycles, pipeline runs, and a portal UI. The project pivoted to a Self-Judging Workflow Engine with an in-memory store, WorkItems, and routing/assessment pods. Zero source files reference FR-001 through FR-069. The traceability enforcer targets only `Plans/**/requirements.md`, so it never discovers this gap. The grading threshold (A-grade requires ≥80% spec coverage) cannot be met when 69 of ~98 total spec FRs are 0% covered.
- **Recommendation:** One of two resolutions: (a) Archive `dev-workflow-platform.md` as a superseded spec (rename to `_archived/`), or (b) acknowledge it as future-backlog and mark it `[DEFERRED]` in a header comment. Either way, the traceability enforcer config (`specs.dir`) should be updated to reflect the active spec set.
- **Cross-ref:** Requirements Reviewer should own this reconciliation.

---

### QO-002: Traceability enforcer is scoped to Plans only — Specifications/ is blind spot
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:48`
- **Detail:** The enforcer auto-selects the most recently modified `requirements.md` under `Plans/`. It never reads `Specifications/`. The `inspector.config.yml` sets `specs.dir: "Specifications/"` and `specs.patterns.traceability: "FR-\\d+"`, but the enforcer ignores both. This means any FR ID defined in `Specifications/` is structurally exempt from enforcement — a silent coverage gap masking as a passing gate.
- **Recommendation:** Extend enforcer to accept a `--specs-dir` flag or a list of files, and add `Specifications/` to the CI gate. Alternatively, migrate all active FRs into `Plans/` and formally deprecate/archive `Specifications/dev-workflow-platform.md`.
- **Cross-ref:** Escalate to solo session for `tools/` changes.

---

### QO-003: `Plans/dependency-linking/requirements.md` delta table is stale
- **Severity:** P2
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md:39`
- **Detail:** The implementation delta table shows three items as ❌ Missing: `FR-dependency-api-types`, `FR-dependency-seed`, and `FR-dependency-frontend-tests`. However, `Source/Frontend/tests/components/BlockedBadge.test.tsx`, `Source/Frontend/tests/components/DependencySection.test.tsx`, and `Source/Frontend/tests/api-client.test.ts` all exist and carry proper `// Verifies: FR-dependency-*` comments. The plan document was not updated after the work was completed, creating misleading open-work indicators.
- **Recommendation:** Update the delta table to reflect ✅ Done for implemented items. Confirm `FR-dependency-seed` and `FR-dependency-api-types` status vs the current codebase (the self-judging-workflow app uses a different domain model so these may not directly apply).
- **Cross-ref:** Requirements Reviewer.

---

### QO-004: Dual logger import paths — `workItemStore.ts` bypasses the compat wrapper
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/store/workItemStore.ts:10`
- **Detail:** All backend files import from `../logger` (the compat wrapper that normalises object-style `{msg: '...'}` calls). `workItemStore.ts` imports directly from `../utils/logger`, which only accepts `(string, context?)` — the raw API. This works today because `workItemStore` happens to use string-style calls, but the inconsistency means a future refactor that switches store logging to object style would fail silently at runtime (TypeScript won't catch it because both forms match the compat type).
- **Recommendation:** Change `workItemStore.ts` line 10 to `import logger from '../logger';` for consistency. The utils/logger should be treated as an internal implementation detail, not a public import surface.

---

### QO-005: `eslint-disable-next-line react-hooks/exhaustive-deps` without justification comment
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions lack an explanation for why the suppression is safe. Architecture rules prohibit undocumented lint suppressions. Missing exhaustive-deps can cause stale closure bugs that are hard to debug — the suppression may be legitimate but must be justified inline.
- **Recommendation:** Add a `// Safe: <reason>` comment on the suppression line (e.g., "Safe: intentional mount-only effect; filters update via separate handler").

---

### QO-006: `Specifications/workflow-engine.md` has no formal FR IDs — untraceable
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/workflow-engine.md`
- **Detail:** This spec describes the workflow engine domain model and API endpoints using prose, but contains no `FR-XXX` identifiers. Implementation can't formally trace back to it. The `Plans/self-judging-workflow/requirements.md` re-expresses these requirements with FR-WF-XXX IDs, creating a two-hop dependency (code → Plans → Spec) with no formal link at the Spec level.
- **Recommendation:** Either add FR-WF-XXX anchors to `workflow-engine.md` sections, or add a header to each Plan requirements file explicitly referencing its parent spec section (e.g., `Spec-ref: Specifications/workflow-engine.md#work-routing-rules`).

---

### QO-007: `workflow.ts` route handler approaching 500-line limit
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Backend/src/routes/workflow.ts`
- **Detail:** At 374 lines, this file is at 75% of the 500-line soft limit. It handles route, assess, approve, reject, dispatch, and all dependency endpoints for workflow actions. If dependency management grows, this file will exceed the limit.
- **Recommendation:** Monitor. If another feature adds endpoints here, split dependency-related routes into a separate `dependencies.ts` route file.

---

### Summary JSON

```json
{
  "audit_date": "2026-08-24",
  "spec_coverage": {
    "plans_enforcer_scope": "100%",
    "full_specifications_scope": "~14%",
    "unimplemented_fr_ids_count": 69,
    "active_fr_ids_fully_traced": 13
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift",           "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift",           "file": "tools/traceability-enforcer.py" },
    { "id": "QO-003", "severity": "P2", "category": "doc-stale",            "file": "Plans/dependency-linking/requirements.md" },
    { "id": "QO-004", "severity": "P3", "category": "architecture-violation","file": "Source/Backend/src/store/workItemStore.ts" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation",    "file": "Source/Frontend/src/hooks/useWorkItems.ts" },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift",           "file": "Specifications/workflow-engine.md" },
    { "id": "QO-007", "severity": "P4", "category": "pattern-violation",    "file": "Source/Backend/src/routes/workflow.ts" }
  ],
  "grade": "C",
  "grade_rationale": "0 P1s at code level, but QO-001 is a structural gap (0% coverage of primary Specifications/) that means the project cannot demonstrate spec compliance to its own stated source of truth. P2 enforcer blind-spot compounds this. No hardcoded secrets. No console.log. No empty catch blocks. Active Plans-level requirements 100% traced.",
  "no_violations": [
    "console.log in production source",
    "hardcoded secrets",
    "empty catch blocks",
    "skipped tests",
    "inline type re-definitions across layers",
    "direct DB calls in route handlers (in-memory store only)"
  ]
}
```

---

**Positives worth noting:** The active codebase (self-judging workflow engine) is in excellent shape — 100% Plans-level traceability, consistent use of structured logging (no `console.log`), no empty catch blocks, no hardcoded secrets, no inline type re-definitions, and all 169 test cases have 342 assertions (healthy ratio). The P1 finding is a documentation/governance problem, not a code quality problem.
