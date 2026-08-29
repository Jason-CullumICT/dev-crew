---

## Quality Oracle Findings

**Audit date:** 2026-08-29 | **Grade: D**

---

### Spec Coverage

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| `Plans/self-judging-workflow` (FR-WF-001..013) | 13 | 13 | **100%** ← enforcer scope |
| `Specifications/dev-workflow-platform.md` (FR-001..069 + FR-dependency-*) | 89 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010) | 10 | 0 | **0%** |
| **Full corpus** | **112** | **~23** | **~20%** |

The traceability enforcer says "PASSED" — that's a **false positive**. It only validated 13 requirements in the most-recently-modified Plans file and ignored the other 99.

---

### QO-001 — P1 · Traceability config regex matches nothing in source

**File:** `Teams/TheInspector/inspector.config.yml:37`

The config defines `traceability: "FR-\\d+"` (digits-only suffix). Every `// Verifies:` comment in `Source/` uses `FR-WF-\d+`, `FR-dependency-*`, or `FR-TMP-\d+` — none of which match. The pattern validates a namespace that doesn't exist. The enforcer's 100% result is vacuously true.

**Fix:** Change pattern to `FR-(?:WF|TMP|dependency)-[\w-]+` to cover all three active namespaces.

---

### QO-002 — P1 · Main spec (FR-001..069) completely unimplemented

**File:** `Specifications/dev-workflow-platform.md`

74 numbered requirements define a Feature Request / Bug Report / Development Cycle system with SQLite. `Source/` instead implements a Work Item workflow engine (in-memory store). The specs describe different products. Zero `Verifies:` comments in `Source/` reference any of these FR-IDs.

**Fix:** Mark `dev-workflow-platform.md` as **superseded** at the top of the file, or reconcile which spec is authoritative.

---

### QO-003 — P2 · Tiered-merge-pipeline spec (FR-TMP-001..010) unimplemented

**File:** `Specifications/tiered-merge-pipeline.md`

10 requirements for risk classification, Playwright E2E generation, auto-PR, AI review, and auto-merge. No implementation in `Source/`. No Plan directory with `requirements.md` to gate it.

**Fix:** Add `Status: Planned / Not Started` frontmatter, or create a Plan that the enforcer can gate.

---

### QO-004 — P2 · Routes bypass service layer — direct store access

**Files:** `Source/Backend/src/routes/workItems.ts:12`, `intake.ts:4`, `workflow.ts:15`

CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* All three route files `import * as store from '../store/workItemStore'` and call CRUD operations directly. A service layer exists for assessment/router/dependency but not for basic CRUD.

**Fix:** Extract a `WorkItemService` wrapping store CRUD; route handlers call the service. → **[ESCALATE → TheFixer]**

---

### QO-005 — P2 · GET /api/search not wired; tests authored to fail

**File:** `Source/Backend/tests/routes/search.test.ts:1-10`

`FR-dependency-search` requires a cross-entity search endpoint. The test file's own comment says: *"these tests … will FAIL until the route is implemented."* The route is absent from `app.ts`. Running tests with these in the suite produces guaranteed failures that pollute CI signal.

**Fix:** Either wire `GET /api/search` (simple `store.findAll()` filtered on `q` param) or wrap in `describe.skip(...)` with a ticket reference. → **[ESCALATE → TheFixer]**

---

### QO-006 — P2 · FR-dependency-* (15 requirements) invisible to enforcer

**File:** `Specifications/dev-workflow-platform.md:461-482`

15 `FR-dependency-*` requirements are partially implemented (Verifies comments exist in `dependency.ts`, `api/client.ts`, etc.) but:
1. The enforcer regex `FR-\d+` won't match the alphanumeric suffix.
2. These requirements live in `Specifications/`, not in a `Plans/` file the enforcer scans.

Result: partially-implemented specs with zero enforcement coverage.

---

### QO-007 — P3 · eslint-disable suppressions without rationale

- `Source/Frontend/src/hooks/useWorkItems.ts:63`
- `Source/Frontend/src/components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` silently. Add a brief comment explaining why the omission is safe.

---

### QO-008 — P3 · Enforcer auto-selects most-recent plan only

**File:** `tools/traceability-enforcer.py:38-55`

19 Plans directories exist; the enforcer auto-selects the one most-recently modified (`self-judging-workflow`). 18 other plans — including dependency-linking and tiered-merge-pipeline work — are silently skipped every time the verification gate runs.

---

### What's clean ✅

- No `console.log` in production backend source (logger abstraction used everywhere)
- No hardcoded secrets or credentials
- No empty catch blocks
- No `@ts-ignore` / `@ts-nocheck`
- No files over 500 lines
- No skipped/todo tests (other than the anti-pattern in QO-005)
- All FR-WF-001..013 have `// Verifies:` comments and corresponding test files

Findings written to `Teams/TheInspector/findings/audit-2026-08-29-quality-oracle.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
