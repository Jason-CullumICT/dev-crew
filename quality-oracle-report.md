---

## Quality Oracle Findings

### Spec Coverage: 81%
**36 FRs** across active Source/-scoped plans | **29 traced** | **7 untraced** (all in one unimplemented plan)

---

### QO-001: FR Identifier Namespace Collision
- **Severity:** P1
- **Category:** architecture-violation
- **Files:** `Plans/orchestrator-cycle-dashboard/requirements.md` and `Plans/image-upload/requirements.md`
- **Detail:** Both plans independently assigned FR-070 through FR-076 to completely different features. `Plans/orchestrator-cycle-dashboard` uses FR-070 = OrchestratorCyclesPage; `Plans/image-upload` uses FR-070 = ImageAttachment shared type. If either is implemented in Source/, `// Verifies: FR-070` comments will falsely satisfy both plans simultaneously in the enforcer.
- **Recommendation:** Create a `Plans/fr-registry.md` flat table mapping every FR ID to its owning plan. Rename orchestrator-cycle-dashboard IDs to a non-colliding range (e.g., `FR-OCD-001` to `FR-OCD-007`).

---

### QO-002: Three Approved Plans Unimplemented in Source/
- **Severity:** P2
- **Category:** spec-drift

| Plan | FRs | Source/ Implementation |
|------|-----|-----------------------|
| `Plans/orchestrator-cycle-dashboard` | 7 (FR-070–076) | 0% — no OrchestratorCyclesPage, CycleCard, CycleLogStream |
| `Plans/image-upload` | 20 (FR-070–089) | 0% in Source/; partial in portal/ only |
| `Plans/duplicate-deprecated-status` | 13 (FR-DUP-01–13) | 0% in Source/; schema only in portal/ |

- **Recommendation:** Route orchestrator-cycle-dashboard to TheFixer for implementation. Clarify whether image-upload/duplicate-deprecated-status target Source/ or portal/ exclusively; annotate requirements accordingly.

---

### QO-003: Traceability Enforcer Leaves Active Plans Unvalidated
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer picks `max(req_files, key=os.path.getmtime)` — currently locks to `Plans/self-judging-workflow/requirements.md`. The three plans above silently bypass the CI gate.
- **Recommendation:** Update enforcer to iterate all `requirements.md` files containing `Verdict: APPROVED` and validate each one.

---

### QO-004: Specifications/ Disconnected from Source/
- **Severity:** P2
- **Category:** spec-drift
- **Detail:** `Specifications/dev-workflow-platform.md` (482 lines, FR-001–069) describes `portal/` not `Source/`. `Specifications/workflow-engine.md` (162 lines) covers `Source/` but has **no FR IDs** — it is untraceable. The inspector.config.yml `specs.dir: Specifications/` creates a false impression of coverage.
- **Recommendation:** Retrofit `workflow-engine.md` with FR-WF-XXX IDs, or explicitly annotate `Specifications/` as applying to `portal/` only.

---

### QO-005: Frontend Hooks and Badge Components Untested
- **Severity:** P3
- **Category:** untested
- **Files:** `useDashboard.ts`, `useWorkItems.ts`, `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`
- **Recommendation:** Add `renderHook()` unit tests for hooks; snapshot/assertion tests for badge components.

---

### QO-006: Silent Error Swallow in API Client
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `.catch(() => ({}))` swallows JSON parse failures — callers receive `{}` instead of an error on malformed responses. Violates the "never swallow errors silently" architecture rule.

---

### QO-007: eslint-disable Without Justification
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `DependencyPicker.tsx:82`, `useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` with no explanation of intent.

---

### QO-008: Dual Logger Modules
- **Severity:** P4
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/logger.ts` (compat wrapper) + `Source/Backend/src/utils/logger.ts` (real impl)
- **Recommendation:** Consolidate to one module with one import path.

---

**Overall Grade: C** — 1 P1 (ID collision), 3 P2s (spec-drift + enforcement gap), 81% coverage. The active implementation is internally clean; the risk is entirely in plan management and future-work drift.

Full report saved to `Teams/TheInspector/findings/audit-2026-04-17-quality-oracle.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
