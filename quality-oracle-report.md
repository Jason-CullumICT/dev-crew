## Quality Oracle Findings — 2026-10-20

**Grade: D** — 27.6% spec coverage (below 40% minimum for grade C), 4× P2 findings, 3× P3.

---

### Spec Coverage: 27.6%

| Spec / Plan | FRs | Traced | Coverage |
|---|---|---|---|
| `Specifications/dev-workflow-platform.md` | 69 | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` | 16 | 14 | **87.5%** |
| **Total** | **98** | **27** | **27.6%** |

---

### QO-001 — Specification Identity Crisis `P2 · spec-drift`

**File:** `Specifications/dev-workflow-platform.md`

`dev-workflow-platform.md` defines 69 FRs (FR-001–069) for a FeatureRequest / BugReport / DevelopmentCycle platform. The actual codebase implements a **completely different system** — the Self-Judging Workflow Engine (WorkItem, WorkRouter, AssessmentPod) — whose requirements live in `Plans/self-judging-workflow/requirements.md`. The FR ID format is also entirely different (`FR-WF-001` vs `FR-001`), making automated cross-checking impossible. **0 of 69 primary-spec FRs are implemented.** CLAUDE.md's "Specs are source of truth" rule is violated.

**Recommendation:** Archive `dev-workflow-platform.md` to `Specifications/archived/` and write a spec that describes the workflow engine that was actually built — OR determine the main spec is aspirational and formally mark in-scope vs out-of-scope sections.

---

### QO-002 — `FR-dependency-search` Unimplemented `P2 · spec-drift`

**File:** `Source/Backend/src/app.ts` + `Source/Backend/tests/routes/search.test.ts`

`GET /api/search?q=` is not registered in `app.ts`. The test file documents this explicitly (`search.test.ts:1–6`: *"NOT wired into app.ts — tests will FAIL until implemented"*). The DependencyPicker typeahead component calls this endpoint.

**Escalate → TheFixer** — backend implementation gap.

---

### QO-003 — OpenTelemetry / `traceparent` Not Implemented `P2 · architecture-violation`

CLAUDE.md requires OTel distributed tracing with W3C `traceparent` propagation. `@opentelemetry/api` is present only as a **transitive dependency** and is never imported. Zero spans, traces, or `traceparent` reads exist in the entire `Source/Backend/src/` tree. Prometheus + structured logging are fine — only tracing is missing.

**Escalate → TheFixer** — add `@opentelemetry/sdk-node`, auto-instrumentation, and a `src/tracing.ts` bootstrap.

---

### QO-004 — Traceability Enforcer Returns False PASSED `P2 · architecture-violation`

**File:** `tools/traceability-enforcer.py`

Running `python3 tools/traceability-enforcer.py` reports **PASSED** — but it auto-selects `Plans/self-judging-workflow/requirements.md` (the most-recently-modified file) and checks only its 13 FRs, all of which are implemented. The 69-FR main spec and 2 unimplemented dependency FRs are silently ignored. This is a mandatory verification gate per CLAUDE.md, and its false-positive masks real drift.

---

### QO-005 — `FR-dependency-seed` Has No Implementation `P3 · spec-drift`

**File:** `Plans/dependency-linking/requirements.md` — `FR-dependency-seed`

No `seed.ts`, no `// Verifies: FR-dependency-seed` comment, no seed call in `app.ts`. The FR references a `portal/` path (from a prior architecture) that doesn't match `Source/Backend/` — it was likely carried over verbatim without adaptation.

---

### QO-006 — `eslint-disable` Without Explanation `P3 · pattern-violation`

- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Both suppress `react-hooks/exhaustive-deps` with no comment explaining why. Both files were modified within the last 14 days.

---

### QO-007 — 5 Frontend Components Lack Tests `P3 · test-coverage`

Recently-modified files with no test file: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`. The badge components have conditional rendering paths used on every list page.

---

### Clean Checks ✅

- No `console.log` in production source (logger abstraction used throughout)
- No hardcoded secrets or credentials
- No silent catch blocks (all either surface errors or document intent)
- `{data:[]}` list wrapper used correctly in all list endpoints
- No Express imports in services/store layer
- No files exceed 500 lines (largest: `WorkItemDetailPage.tsx` at 426 lines)

Report saved to: `Teams/TheInspector/findings/audit-2026-10-20-D.md`
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
