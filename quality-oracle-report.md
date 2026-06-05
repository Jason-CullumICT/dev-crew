---

## Quality Oracle Findings

### Spec Coverage: ~0% (Specifications/ as source of truth)

| Spec source | FR count | Traced | % |
|---|---|---|---|
| `Specifications/dev-workflow-platform.md` | 74 | 0 | **0%** |
| `Specifications/workflow-engine.md` | 0 formal IDs | N/A | unmeasurable |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` | 15 | not enforced | unknown |

**Overall grade: D** — 1 P1, 3 P2, 3 P3, 1 P4 findings. Findings written to `Teams/TheInspector/findings/audit-2026-06-05-D.md`.

---

### QO-001 — Specification Domain Mismatch · **P1 · spec-drift**
`Specifications/dev-workflow-platform.md` defines 74 FRs for a SQLite-backed platform (FeatureRequests, BugReports, DevelopmentCycles) that **does not exist in `Source/`**. The codebase implements the self-judging workflow engine. `Specifications/workflow-engine.md` covers the actual product but has **zero formal FR identifiers**, making machine-checkable traceability impossible from the canonical spec.

*Fix:* Archive/mark `dev-workflow-platform.md` as superseded. Add FR-WF-XXX IDs to `workflow-engine.md`. Formally define FR-070–FR-085 (dependency tracking) in `Specifications/`.

---

### QO-002 — Direct Store Access from Route Handlers · **P2 · architecture-violation**
Three route files violate the "no direct store calls from route handlers" rule:
- `routes/workItems.ts` — 10+ `store.*` calls
- `routes/workflow.ts` — 10+ `store.*` calls  
- `routes/intake.ts` — 2 `store.createWorkItem` calls

`routes/dashboard.ts` is the correct model (delegates to `dashboardService`). → **[ESCALATE → TheFixer]**

---

### QO-003 — Traceability Enforcer Covers Only 13/102 Requirements · **P2 · spec-drift**
The enforcer auto-selects the most-recently-modified plan file and reports **PASSED** — but it checks only 13 of ~102 known requirements. The 15 FR-dependency-* IDs are never enforced. `FR-dependency-seed` is **confirmed still unimplemented** (no seed file exists anywhere in `Source/`).

---

### QO-004 — Dependency Feature Has No Formal Spec · **P2 · spec-drift**
Full dependency tracking is live in `Source/` but `Specifications/workflow-engine.md` has no dependency section. `Plans/dependency-linking/requirements.md` still targets `portal/` paths (from a previous product generation) and is stale.

---

### QO-005 — Duplicate Test Files · **P3 · test hygiene**
`WorkItemDetailPage` and `WorkItemListPage` each have two test files (`tests/` top-level + `tests/pages/`). The `tests/pages/` variants appear canonical; top-level files are likely stale. → **[ESCALATE → TheFixer]**

---

### QO-006 — 7 Frontend Files + 1 Middleware File Untested · **P3 · untested**
No test coverage for: `PriorityBadge`, `StatusBadge`, `TypeBadge`, `Layout`, `DebugPortalPage`, `useWorkItems`, `useDashboard` (frontend) and `middleware/errorHandler.ts` (backend). Hooks are highest priority — they own all API-call and error-state logic. → **[ESCALATE → TheFixer]**

---

### QO-007 — Two Logger Files with Overlapping Verifies · **P3 · architecture-violation**
`src/logger.ts` (re-export shim) and `src/utils/logger.ts` (implementation) both carry `// Verifies: FR-WF-013`. Single-source-of-truth rule is blurred; clarify with a comment or consolidate.

---

### QO-008 — Unexplained `eslint-disable` Suppressions · **P4 · pattern-violation**
Two `react-hooks/exhaustive-deps` suppressions in `useWorkItems.ts:63` and `DependencyPicker.tsx:82` have no explanatory comment. Add inline reasoning to prevent future contributors from accidentally removing the suppression or re-introducing the dependency.
