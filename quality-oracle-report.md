---

## Quality Oracle Findings — 2026-09-17

**Grade: B** | 0 P1 · 4 P2 · 4 P3 · 2 P4

---

### Spec Coverage

| Scope | Coverage |
|-------|----------|
| Main spec FR-001–FR-069 (manual) | **100%** — all 69 IDs traced in portal/ or Source/ |
| Enforcer-automated (Plans/self-judging-workflow only) | **19%** — only 13 of ~82 plan FRs are gated |
| **Critical structural gap** | Enforcer selects 1 plan by mtime; 7 of 8 plans with requirements.md are silently unenforced |

---

### P2 Findings

**QO-001 — Traceability enforcer blind to 7 of 8 plans** (`tools/traceability-enforcer.py`)  
`max(..., key=os.path.getmtime)` always targets one plan. Plans like `dependency-linking`, `dev-cycle-traceability`, `orchestrated-dev-cycles`, `image-upload` receive no automated enforcement. Regressions in those plans pass the verification gate silently.  
→ **Fix:** Add `--all-plans` mode or read a manifest.

**QO-002 — FR-dependency-api-types still open** (`portal/Shared/api.ts:32,59`)  
`UpdateBugInput` and `UpdateFeatureRequestInput` both lack `blocked_by?: string[]`. Documented as ❌ Missing in plan delta — still unimplemented. Portal frontend must use `as any` to call PATCH.

**QO-003 — FR-dependency-seed still open** (`portal/Backend/src/database/`)  
`seed.ts` does not exist. 4 known dependency relationships never loaded on startup. Documented as ❌ Missing in plan delta.

**QO-004 — FR-dependency-frontend-tests still open** (`portal/Frontend/tests/`)  
`DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing. Only `DependencyPicker.test.tsx` exists. Both components (core dependency UI) are untested.

---

### P3 Findings

**QO-005 — Logger never pretty-prints in development** (`Source/Backend/src/utils/logger.ts`)  
Always outputs compact JSON. FR-003 and FR-WF-013 require pretty-printing in development. NODE_ENV check missing.

**QO-006 — FR-WF-013 WF metrics lack explicit test** (`Source/Backend/tests/routes/metrics.test.ts`)  
`workflow_items_created/routed/assessed/dispatched_total` counters defined in `metrics.ts` are never verified in a test carrying `// Verifies: FR-WF-013`.

**QO-007 — Error discrimination by string matching** (`Source/Backend/src/routes/workflow.ts:330-348`)  
Dependency endpoint catch block calls `.includes('self')`, `.includes('cycle')` on error messages to pick 400/404/409/500. Brittle: a message reword silently changes HTTP status. Recommend typed error subclasses.

**QO-008 — Dual logger API** (`Source/Backend/src/store/workItemStore.ts:10`)  
`workItemStore` uses named import `{ logger }` from `utils/logger` (two-arg API). All other backend files use default `logger` from `'../logger'` (single-object API). Two incompatible calling conventions in the same codebase.

---

### P4 Findings

**QO-009** — Two `eslint-disable-next-line react-hooks/exhaustive-deps` without justification comments (`useWorkItems.ts:63`, `DependencyPicker.tsx:82`).  
**QO-010** — 12 of 20 plans have no `requirements.md`, making their work unverifiable against acceptance criteria.

---

Full report saved to `Teams/TheInspector/findings/audit-2026-09-17-B.md`.  
Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
