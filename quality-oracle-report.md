## Quality Oracle Findings — 2026-07-12

**Overall Grade: C** | Spec Coverage: ~73% (69/95 canonical requirements traced)

---

### Summary

The codebase divides into two separate applications: the **workflow engine** in `Source/` and the **dev-workflow platform** in `portal/`. Both have good internal traceability hygiene — all test files carry `// Verifies:` comments, no `console.log` exists in production code, and the service layer is used correctly everywhere except one file. However, **two P1 structural defects** drop the grade to C.

---

### P1 — Must Fix

**QO-001 — Enforcer blind spot (`tools/traceability-enforcer.py:69`)**
`source_dirs = ["Source", "E2E"]` is hardcoded. `portal/` (which implements FR-001 to FR-069 + FR-070 to FR-089 + dependency requirements) is **never scanned**. The CI gate reports `PASSED` while 86% of the codebase is uninspected. Fix: add `"portal"` to `source_dirs`; pin the plan with `--file Plans/dev-workflow-platform/requirements.md`.

**QO-002 — 6 orphaned FR IDs with no spec (`portal/Frontend/src/components/orchestrator/`)**
FR-090, FR-091, FR-092, FR-093, FR-094, FR-095 are referenced in `RunsTab.tsx`, `RunDetailRow.tsx`, `types.ts`, and `api/client.ts` — but exist in **neither `Specifications/` nor any `Plans/*/requirements.md`**. These orchestrator runs-view features were built without writing a spec first, violating the project's core mandate. Fix: create `Plans/orchestrator-ui-runs/requirements.md` defining these 6 requirements.

---

### P2 — High Priority

**QO-003 — Direct DB calls in route handler (`portal/Backend/src/routes/teamDispatches.ts:37`)**
Both GET and POST handlers call `db.prepare().all()` / `db.prepare().run()` directly. It is the only route without a corresponding service. Violates: *"No direct DB calls from route handlers — use the service layer."*

**QO-004 — Three silent `.catch(() => {})` blocks**
`RepoSelector.tsx:20`, `FeatureRequestDetail.tsx:80`, `BugDetail.tsx:82` — all swallow `repos.list()` failures with zero logging, zero user feedback, and no explanatory comment. Violates: *"Never swallow errors silently."* (The `fetchImages` catches nearby have `// Image fetch failure is non-blocking` comments and are borderline-acceptable.)

**QO-005 — `Specifications/tiered-merge-pipeline.md` has 0% traceability**
FR-TMP-001–010 define the full risk-classification/Playwright/auto-PR/auto-merge pipeline. Zero `// Verifies: FR-TMP-*` comments appear anywhere in `Source/` or `portal/`. If this feature lives in `platform/`, that should be documented in the spec.

---

### P3 — Medium Priority

| ID | File | Issue |
|----|------|-------|
| QO-006 | `tools/traceability-enforcer.py:47` | Auto-detection is non-deterministic when all plan files share the same mtime |
| QO-007 | `Specifications/workflow-engine.md` | No FR IDs defined; Source/ code traces to Plans-level FR-WF-* IDs (two-hop chain) |
| QO-008 | `portal/Backend/src/services/cycleService.ts` | Three files exceed 500 lines: cycleService.ts (526), api/client.ts (525), featureRequestService.ts (506) |
| QO-009 | `portal/Backend/tests/` | FR-0001 (4-digit) vs FR-001 (3-digit) — formats don't cross-reference; both satisfy the enforcer regex |
| QO-010 | `Source/Frontend/src/hooks/useWorkItems.ts:63` | 3× `eslint-disable react-hooks/exhaustive-deps` in hooks — potential stale closure risk |

---

Learnings written to `Teams/TheInspector/learnings/quality-oracle.md`.
