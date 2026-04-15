---

## Quality Oracle Findings

**Grade: D** · 0 P1 · 4 P2 · 4 P3 · 2 P4

Report saved → `Teams/TheInspector/findings/audit-2026-04-15-D.md`

---

### Spec Coverage: ~27% (107 total requirements across 3 specs)

| Spec | FRs | Implemented | Coverage |
|------|-----|-------------|----------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | ~13 | **~100%** |
| `dev-workflow-platform.md` (FR-001–069 + FR-dependency-*) | ~84 | ~16 (deps only) | **~19%** |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** |

> **Nuance:** If scope is officially limited to `workflow-engine.md`, the effective grade rises to **B** (0 P1, 3 P2: QO-001/002/004). The D reflects the full `Specifications/` surface area.

---

### QO-001 · P2 · Architecture-Violation
**Route handlers bypass the service layer — direct store calls**  
`workItems.ts`, `workflow.ts`, and `intake.ts` all call `store.findById`, `store.updateWorkItem`, etc. directly from Express handlers. CLAUDE.md is explicit: *"No direct DB calls from route handlers — use the service layer."* A `workItemService.ts` should mediate. → **TheFixer**

---

### QO-002 · P2 · Spec-Drift
**`GET /api/search` not registered — 5 tests intentionally failing**  
`FR-dependency-search` requires cross-entity typeahead. `client.ts:101` calls `/api/search`, `search.test.ts` has 5 tests, and the test file itself acknowledges the route doesn't exist yet. The `DependencyPicker` UI is broken at runtime. → **TheFixer**

---

### QO-003 · P2 · Spec-Drift
**`dev-workflow-platform.md` — 69 FRs with zero source coverage**  
FR-001 to FR-069 specify a full development platform (feature request intake, bug reports, development cycles, 7-page React frontend, pipeline orchestration). No endpoint, model, or component from this spec exists in `Source/`. The traceability enforcer is blind to all 69. Either schedule them as planned work or annotate the spec as `[PLANNED]`.

---

### QO-004 · P2 · Architecture-Violation
**OpenTelemetry tracing absent**  
CLAUDE.md, FR-021, and the observability rules require OTel spans, `traceparent` header propagation, and span IDs injected into logs. No `@opentelemetry/*` package is installed. Logging (✅) and Prometheus metrics (✅) are in place, but the distributed tracing pillar is completely missing. → **TheFixer**

---

### QO-005 · P3 · Spec-Drift
**Traceability enforcer scope: 13 of ~107 requirements**  
The enforcer targets `Plans/self-judging-workflow/requirements.md` (FR-WF-*) only, reports "PASSED", and is silent about the remaining 94 requirements. This is a false-green signal in CI. The enforcer should be extended to scan `Specifications/dev-workflow-platform.md`. → Solo session (tools/ scope).

---

### QO-006 · P3 · Pattern-Violation
**Logger always emits JSON — no dev pretty-printing**  
`utils/logger.ts` unconditionally calls `JSON.stringify()` regardless of `NODE_ENV`. FR-003 requires pretty-print in development. One-line fix: branch on `process.env.NODE_ENV`.

---

### QO-007 · P3 · Test-Hygiene
**Duplicate test files: `tests/` and `tests/pages/` for same components**  
`WorkItemListPage.test.tsx` and `WorkItemDetailPage.test.tsx` each exist at two paths. Ambiguous canonical; may double-run in CI. Delete the superseded copy.

---

### QO-008 · P3 · Pattern-Violation
**`eslint-disable-next-line react-hooks/exhaustive-deps` x2 without justification**  
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` suppress a stale-closure guard with no comment explaining why. Either fix the hook dependency or add a justification comment.

---

### QO-009 · P4 · Spec-Drift
**`tiered-merge-pipeline.md` FR-TMP-001–010 unimplemented**  
Risk classification, Playwright E2E runner, auto-PR, AI review, auto-merge — all in `Specifications/` but none in `Source/`. Likely platform/ scope; annotate or move accordingly.

---

### QO-010 · P4 · Pattern-Violation
**Two logger abstractions coexist**  
`src/logger.ts` is a compatibility shim wrapping `src/utils/logger.ts`. Consolidate into one file.

---

**Architecture rules passing:** shared types ✅ · no hardcoded secrets ✅ · list endpoints use `{data}` wrapper ✅ · errors not swallowed ✅ · business logic pure (no framework imports in services) ✅  
**Architecture rules failing:** service layer bypass ❌ · OTel tracing ❌ · dev logger format ⚠️
