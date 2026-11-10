## Quality Oracle Findings — 2026-11-10

**Grade: D**

---

### Spec Coverage: 0% (domain specs) / 100% (active plan)

| Spec | FRs | Traced | Coverage |
|------|-----|--------|----------|
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0% ❌** |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | **0% ❌** |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100% ✅** |

---

### QO-001 — P1 · Verification Gate Is a False Green
`tools/traceability-enforcer.py`

The mandatory gate `python3 tools/traceability-enforcer.py` auto-discovers `Plans/self-judging-workflow/requirements.md` and reports green — but it **never reads `Specifications/`**. Running it against the main domain spec reveals 76/76 FRs untraced (100% failure). Every pipeline pass is a false signal. **Fix:** extend the enforcer to also scan all `Specifications/**/*.md`.

---

### QO-002 — P1 · `dev-workflow-platform.md` — 69 FRs Completely Unimplemented
`Specifications/dev-workflow-platform.md` (FR-001 — FR-069)

The primary domain spec describes a SQLite-backed platform (feature requests, bug reports, dev cycles, pipeline orchestration, cycle traceability). None of this exists in `Source/`. The implemented product is a different system (self-judging work item workflow engine). **Action needed:** governance decision — mark as backlog, link to a Plan, or archive.

---

### QO-003 — P1 · `tiered-merge-pipeline.md` — 10 FRs Completely Unimplemented
`Specifications/tiered-merge-pipeline.md` (FR-TMP-001 — FR-TMP-010)

Auto-PR creation, AI PR review, auto-merge, E2E test generation — none in `Source/`. Same governance gap as QO-002.

---

### QO-004 — P2 · Architecture Violation: Routes Call Store Directly
`Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:6`

Three route files call `store.*` (createWorkItem, findById, updateWorkItem, softDelete, findAll) directly, bypassing the service layer. Architecture rule: *"No direct DB calls from route handlers — use the service layer."* Only `dashboard.ts` follows the pattern correctly. **Fix:** create a `workItemService.ts` and route calls through it.

---

### QO-005 — P2 · OpenTelemetry Tracing Not Implemented
`Source/Backend/src/` (all files)

Architecture mandate + FR-021 require OTel HTTP instrumentation, custom spans on critical paths, and W3C `traceparent` header propagation. Zero OTel imports exist anywhere in source. **Fix:** add `@opentelemetry/sdk-node`, init module, inject trace/span IDs into logger.

---

### QO-006 — P3 · Enforcer Regex Drops All Lowercase FR IDs
`tools/traceability-enforcer.py:68`

Pattern `FR-[A-Z0-9-]+` cannot match `FR-dependency-service`, `FR-dependency-endpoints`, etc. (lowercase). The 15 `FR-dependency-*` IDs in `Plans/dependency-linking/requirements.md` are silently unenforceable. **Fix:** change to `FR-[A-Za-z0-9-]+`.

---

### QO-007 — P3 · `eslint-disable` Without Rationale (2 files)
`Source/Frontend/src/hooks/useWorkItems.ts:63`, `components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` with no explanation. Architecture rule requires documenting *why* a suppression is intentional. **Fix:** add inline comment explaining which dep is omitted and why.

---

### QO-008 — P3 · Hardcoded `localhost:4200` in Frontend
`Source/Frontend/src/pages/DebugPortalPage.tsx:5`

`VITE_PORTAL_URL || 'http://localhost:4200'` — the fallback points to localhost in production deployments. **Fix:** remove the fallback; show an informational message if the env var is unset.

---

**Findings written to:** `Teams/TheInspector/findings/audit-2026-11-10-D.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
