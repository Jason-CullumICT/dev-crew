## Quality Oracle Findings — 2026-09-24

**Grade: B** · 0 P1 · 1 P2 · 4 P3 · 1 P4

---

### Spec Coverage

| Spec | FRs | Traced | Coverage |
|------|-----|--------|----------|
| `Plans/self-judging-workflow/requirements.md` (active) | 13 | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` (separate system) | 85 | 0 | 0% ⚠️ |

Traceability enforcer: **PASSED** (all 13 FR-WF requirements have `// Verifies:` coverage).

---

### QO-001 · P2 · Spec Drift
**`Specifications/dev-workflow-platform.md` describes an unimplemented, different system**

85 functional requirements (FR-001 – FR-069) covering SQLite, feature-request voting, development cycles, pipeline runs, and cycle traceability — none of which exist in the codebase. The active implementation is the self-judging workflow engine (FR-WF-001–013, in-memory store). The traceability enforcer never checks this file, so the gap is invisible to CI gates.

**Risk:** New agents reading this document will conclude the codebase has massive regressions, or will build against the wrong spec.
**Fix:** Add a `> **Status: PLANNED / NOT YET IMPLEMENTED**` header to `dev-workflow-platform.md`, or move it to `Specifications/planned/`. Route to `requirements-reviewer`.

---

### QO-002 · P3 · Test Coverage
**Duplicate frontend test files — ambiguous canonical version**

`WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` each exist in two locations:
- `Source/Frontend/tests/` (root — older, simpler mocks)
- `Source/Frontend/tests/pages/` (newer — imports directly from `Shared/types/workflow`)

Both run in the test suite. Delete the root-level files; keep `tests/pages/` as canonical.

---

### QO-003 · P3 · Pattern Violation
**`DebugPortalPage.tsx` uses free-text `Verifies:` comment, not an FR ID**

`// Verifies: dev-crew debug portal — embedded container-test viewer` does not match the `FR-WF-XXX` pattern. File was recently added with no valid FR linkage. Assign the correct FR-WF ID or document explicitly as infrastructure.

---

### QO-004 · P3 · Pattern Violation
**`Source/E2E/playwright.pipeline.config.ts` references a non-existent generated test directory**

`testDir: "./tests/cycle-run-1774659927912-8dd3ac77"` — directory doesn't exist. A pipeline run committed its ephemeral config. Running this config fails immediately. Either delete the file or reset it to a valid state; add pipeline-generated configs to `.gitignore`.

---

### QO-005 · P3 · Pattern Violation
**Undocumented `eslint-disable` suppressions in recently-modified production files**

- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Both suppress `react-hooks/exhaustive-deps` without explanation. Add an inline comment explaining *why* the dependency is intentionally omitted to convert silent suppression into documented intent.

---

### QO-006 · P4 · Pattern Violation
**`Source/Frontend/tests/setup.ts` has no `Verifies:` comment**

Minor — test framework setup file. Add a documentation comment consistent with project convention.

---

### Architecture Compliance

All green: no `console.log` in production, no direct DB calls from routes, no inline type redefinitions, no hardcoded secrets, no silent catch blocks, Prometheus metrics at `metrics.ts`, structured logging in `utils/logger.ts`.

Full findings saved to `Teams/TheInspector/findings/audit-2026-09-24-B.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
