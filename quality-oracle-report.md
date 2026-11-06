---

## Quality Oracle Findings — 2026-11-06

**Grade: D** | Spec Coverage: **0%** | P1: 3 | P2: 2 | P3: 2

---

### Spec Coverage: 0 of 95 Specifications/ requirements traced

The project has three FR namespaces. Only one is covered by the enforcer:

| Namespace | Location | Count | Coverage |
|-----------|----------|-------|----------|
| `FR-001…FR-069` + `FR-dependency-*` | `Specifications/dev-workflow-platform.md` | 85 | **0%** |
| `FR-TMP-001…FR-TMP-010` | `Specifications/tiered-merge-pipeline.md` | 10 | **0%** |
| `FR-WF-001…FR-WF-013` | `Plans/self-judging-workflow/requirements.md` | 13 | **100%** ✓ |

The traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans `Plans/*/requirements.md`. It reports **PASSED** while the authoritative `Specifications/` documents are entirely untraced — a false-green gate.

---

### QO-001 — P1 · Architecture Violation
**Routes bypass service layer — direct store access in 3 route files**

`workflow.ts:15`, `workItems.ts:12`, `intake.ts:4` all do `import * as store from '../store/workItemStore'` and call `store.findById`, `store.update`, etc. directly from route handlers. CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* `workflow.ts` additionally mixes direct store calls with service calls (`routeWorkItem`, `assessWorkItem`) in the same handler.

**Fix:** Create a `workItemService.ts` that owns CRUD; route handlers call services; services call the store.

---

### QO-002 — P1 · Spec Drift
**Traceability enforcer scope gap — Specifications/ completely ignored**

`tools/traceability-enforcer.py` auto-selects the most-recently-modified `Plans/*/requirements.md` and scans for `FR-WF-XXX`. It has no knowledge of `Specifications/` despite `inspector.config.yml` setting `specs.dir: "Specifications/"`. Running the gate today shows PASSED while 95 domain requirements are untraced.

**Fix:** Extend enforcer to also scan `Specifications/` for `FR-\d+` and `FR-TMP-\d+`, or formally document that Specifications/ are aspirational and update CLAUDE.md accordingly.

---

### QO-003 — P1 · Spec Drift
**95 Specifications/ requirements entirely unimplemented**

`Specifications/dev-workflow-platform.md` describes a full platform (SQLite backend, AI voting, human approval, dev cycle management, feature browser, bug reports, pipeline runner, dependency graph — FR-001…FR-069 + FR-dependency-*). `Specifications/tiered-merge-pipeline.md` describes 10 more (FR-TMP-001…010). Zero of these 95 requirements are implemented in Source/. The source implements a self-judging workflow engine (FR-WF-001…013) described only in Plans/, not in the main Specifications/.

**Decision required:** (a) Retro-spec the workflow engine into Specifications/ and deprecate unbuilt FRs; OR (b) scope a plan to implement FR-001…FR-069 incrementally from the existing foundation.

---

### QO-004 — P2 · Architecture Violation
**Duplicate logger modules**

`src/utils/logger.ts` (primary implementation) and `src/logger.ts` (compatibility default-export wrapper) coexist. Intentional per QA report, but creates two valid import paths — future contributors may import from either without warning.

**Fix:** Add a default export to `utils/logger.ts` and delete `src/logger.ts`; update all imports to one canonical path.

---

### QO-005 — P2 · Pattern Violation
**`eslint-disable` suppresses exhaustive-deps without documented justification**

`useWorkItems.ts:63` and `DependencyPicker.tsx:82` both suppress `react-hooks/exhaustive-deps`. This rule catches stale-closure bugs in effects. Neither suppression has a comment explaining why the omitted dependency is safe.

**Fix:** Add an inline comment justifying each suppression, or refactor to satisfy the lint rule.

---

### QO-006 — P3 · Architecture Violation
**3 files approaching 500-line split threshold**
- `WorkItemDetailPage.tsx` — 426 lines
- `DependencyPicker.tsx` — 376 lines
- `workflow.ts` — 374 lines

Flag for extraction on next edit: custom hooks from pages; sub-routers from workflow.ts.

---

### QO-007 — P3 · Untested
**`vite.config.ts` modified recently, lacks Verifies comment**

Modified within the 14-day window; no `// Verifies:` traceability. Add `// Verifies: FR-WF-010` (or appropriate frontend setup FR) at the top.

---

### Clean Checks ✓
- No `console.log` in production source (logger abstraction used everywhere)
- No hardcoded secrets or credentials
- No skipped/todo/disabled tests
- All 14 backend test files contain assertions
- Services do not import Express types (business logic is framework-free)
- No truly empty catch blocks
- Plans-level traceability: 13/13 FR-WF IDs traced, enforcer passes

---

**Findings written to:** `Teams/TheInspector/findings/audit-2026-11-06-D.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
