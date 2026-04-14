---

## Quality Oracle Findings

### Spec Coverage: **17.6%**
| | |
|---|---|
| FR IDs in `Specifications/` | 85 total (FR-001–FR-069 + 16 FR-dependency-*) |
| Traced to `Source/` | 15 (FR-dependency-* only) |
| **Unimplemented / untraced** | **70** |

---

### QO-001 — Traceability Enforcer Targets Plans, Not Specifications
- **Severity:** P1 | **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** The enforcer auto-selects the *most recently modified* `requirements.md` under `Plans/`. It targeted `Plans/self-judging-workflow/requirements.md` (13 FRs) and reported **TRACEABILITY PASSED**, while all 85 requirements in `Specifications/dev-workflow-platform.md` remain unchecked. This is compliance theater — the gate is green while the authoritative spec is 82% uncovered.
- **Recommendation:** Point the enforcer at `Specifications/` or reconcile spec IDs with implementation IDs. The CLAUDE.md rule "*Specs are source of truth*" is inverted here.

---

### QO-002 — Specifications Describe a Completely Different Product
- **Severity:** P1 | **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 – FR-069)
- **Detail:** The spec defines a **SQLite-backed** platform for Feature Requests, Bug Reports, Dev Cycles, Votes, Learnings, and Features. The actual `Source/` implementation is an **in-memory workflow engine** for WorkItems with routing pods and assessment pods. Domain entities, persistence layer, API surface, and FR IDs are entirely different. **0 of 69 regular FRs have a `// Verifies:` comment anywhere in `Source/`.**
- **Recommendation:** Create `Specifications/workflow-engine.md` mapping to FR-WF-001–FR-WF-013 + FR-dependency-*. Archive the superseded spec.

---

### QO-003 — `GET /api/search` Route Not Wired — 5 Tests Will Fail
- **Severity:** P1 | **Category:** untested
- **File:** `Source/Backend/src/app.ts` / `Source/Backend/tests/routes/search.test.ts`
- **Detail:** `search.test.ts` contains 5 tests for `GET /api/search?q=` (FR-dependency-search). The file itself declares: *"these tests will FAIL until the route is implemented."* There is no `app.use('/api/search', ...)` in `app.ts`. Every test hits a 404.
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` (title/description match over the in-memory store) and register it. [ESCALATE → TheFixer]

---

### QO-004 — Route Handlers Call the Store Directly (Service Layer Bypass)
- **Severity:** P2 | **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44,73,79,134,141` / `routes/workflow.ts:44,119,175,269`
- **Detail:** CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* Both route files call `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` directly. Approve/reject/dispatch handlers in `workflow.ts` also build `changeHistory` entries inline — domain logic that belongs in a service.
- **Recommendation:** Extract into `workItemService.ts`. Route handlers should be: validate → call service → return. [ESCALATE → TheFixer]

---

### QO-005 — FR-dependency-seed Never Implemented
- **Severity:** P2 | **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:475`
- **Detail:** Plans status tracker (`Plans/dependency-linking/requirements.md:46`) explicitly marks this **"❌ Missing"**. No seed mechanism exists in `Source/`. `FR-dependency-seed` is the only FR-dependency-* ID with no `// Verifies:` comment in source.

---

### QO-006 — `eslint-disable` Without Justification (2 Files)
- **Severity:** P3 | **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Recommendation:** Add a one-line explanation above each suppression documenting *why* the full dependency array is deliberately excluded.

---

### QO-007 — Duplicate Test Files for WorkItemDetailPage
- **Severity:** P3 | **Category:** test quality
- **Files:** `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx`
- **Recommendation:** Consolidate into `tests/pages/`. Delete the root-level duplicate.

---

### QO-008 — 9 Source Files Without Test Coverage (All Recently Modified)
- **Severity:** P3 | **Category:** untested
- **Files:** `errorHandler.ts`, `utils/id.ts`, `utils/logger.ts`, `models/WorkItem.ts` (backend) + `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx` (frontend)
- **Detail:** All modified within the last 14 days. The error handler and WorkItem model are foundational paths.

---

### QO-009 — Two Logger Abstraction Files, Ambiguous Import Path
- **Severity:** P3 | **Category:** architecture-violation
- **Files:** `Source/Backend/src/logger.ts` (re-export shim) vs `Source/Backend/src/utils/logger.ts` (real implementation)
- **Recommendation:** Pick one canonical import path and delete the other.

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-04-14-D.md`
**Learnings saved to:** `Teams/TheInspector/learnings/quality-oracle.md`
