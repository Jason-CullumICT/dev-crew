---

## Quality Oracle Findings — 2026-10-16

**Overall grade: D** — 3 P1 findings, spec coverage ~15% across `Specifications/`.

---

### Spec Coverage

| Source | Requirements | Covered | % |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` — FR-dependency-* | 14 | 14 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` — FR-001–FR-069 | 69 | 0 | **0%** ❌ |
| `Specifications/tiered-merge-pipeline.md` — FR-TMP-001–010 | 10 | 0 | **0%** ❌ |

---

### QO-001 · P1 · spec-drift
**`Specifications/dev-workflow-platform.md` describes a product that doesn't exist.**  
FR-001–FR-069 define a Feature Request tracking platform (Feature Requests, Bug Reports, Dev Cycles, Pipeline Orchestration, Frontend pages for all of these). **Zero of these are implemented.** The actual codebase is a Self-Judging Workflow Engine (work items `WI-XXX`, assessment pod, team dispatch). Running the enforcer against this spec confirms: `FAIL — 76 requirements missing`.  
**Fix:** Archive this spec or annotate it as aspirational. Add explicit FR-WF-* identifiers to `Specifications/workflow-engine.md` so it becomes the formal source of truth for the existing product.

---

### QO-002 · P1 · spec-drift / architecture-violation
**The traceability enforcer never reads `Specifications/` — it always passes green.**  
`tools/traceability-enforcer.py` auto-selects the most-recently-modified `requirements.md` in `Plans/`. `Specifications/` is never scanned. The enforcer shows ✅ while 89 spec requirements are untraced. This inverts the "specs are source of truth" rule.  
**Fix:** Extend the enforcer (or add a wrapper) to also validate active `Specifications/` documents. Track this as a tooling gap.

---

### QO-003 · P1 · spec-drift
**`Specifications/tiered-merge-pipeline.md` — all 10 FR-TMP-* requirements unimplemented.**  
Risk classification, Playwright E2E phases, auto-PR, AI PR review, auto-merge, worker container prerequisites — all absent from `Source/`. The Playwright config files in `Source/E2E/` carry no `// Verifies: FR-TMP-*` traceability.  
**Fix:** Either implement or formally de-scope these requirements. Add traceability to any E2E files that partially satisfy them.

---

### QO-004 · P2 · spec-drift
**FR-WF-001–013 live only in `Plans/`, not `Specifications/`.** All source Verifies comments trace to IDs defined at the plan level, not the formal spec level. `Specifications/workflow-engine.md` has no FR identifiers.  
**Fix:** Add an explicit requirements table with FR-WF-* IDs to `Specifications/workflow-engine.md`.

---

### QO-005 · P2 · architecture-violation
**Route handlers call the store layer directly** — 18 call-sites across `workItems.ts`, `workflow.ts`, and `intake.ts` (`store.findById`, `store.createWorkItem`, `store.updateWorkItem`, `store.softDelete`, `store.findAll`). CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."*  
**Failure scenario:** When the in-memory store is replaced with SQLite, every route file requires surgery. A service layer would have isolated that change.  
**Fix → TheFixer:** Extract a `workItemService.ts` wrapper; routes call the service, not the store.

---

### QO-006 · P3 · pattern-violation
**2 `eslint-disable` suppressions** in production source (`DependencyPicker.tsx:82`, `useWorkItems.ts:63`) — both suppress `react-hooks/exhaustive-deps`, hiding potential stale closure bugs.

---

### QO-007 · P3 · observability
**Dashboard routes have no Prometheus metrics.** All three dashboard endpoints (`/summary`, `/activity`, `/queue`) log at `debug` level but emit no counters or histograms. The summary endpoint scans all work items on every call — an unbounded operation with zero observability.

---

### QO-008 · P4 · traceability hygiene
**`Source/Frontend/tests/setup.ts` missing `// Verifies:` comment.**

---

Full report saved to `Teams/TheInspector/findings/audit-2026-10-16-quality-oracle.md`.  
Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
