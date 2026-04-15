# QA Review and Tests — Learnings

## Cycle: dependency-linking (2026-04-14)

### Traceability Enforcer Regex Limitation
The enforcer uses `FR-[A-Z0-9-]+` (uppercase-only). FR IDs with lowercase letters
(e.g., `FR-dependency-types`) are silently skipped. Always run the enforcer with
`--plan <name>` and cross-check the "Scanning N requirements" count against the
actual FR count in requirements.md. If N is much lower than expected, the regex is
missing lower-case IDs.

The false positives from `Plans/dependency-linking/requirements.md` are:
- `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` — data item IDs in the
  seed description, not requirement IDs.
- `FR-070`, `FR-085` — parent spec reference numbers, not standalone FRs.

To pass the enforcer for this plan you would need to add `// Verifies: FR-0002`
etc. comments, which would be misleading. Instead, use manual grep to audit actual
coverage: `grep -rn "Verifies: FR-dependency" Source/`.

### Install Dependencies Before Running Tests
`Source/Backend` and `Source/Frontend` have their own `package.json` and require
`npm install` before tests will run. Running `npx jest` or `npx vitest` from the
repo root installs a fresh incompatible version. Always `cd` into the project
directory first.

- Backend: `cd Source/Backend && npm install && npx jest --forceExit --detectOpenHandles`
- Frontend: `cd Source/Frontend && npm install && npx vitest run`

### Store Initialisation of Dependency Fields
The in-memory WorkItem store does NOT pre-initialise `blockedBy`, `blocks`, or
`hasUnresolvedBlockers` on new items. They are `undefined` until `addDependency` or
`setDependencies` is called. Tests for schema coverage should verify state AFTER a
dependency operation, not on a freshly created item.

### FR-dependency-seed Out of Scope for Source/Backend
`FR-dependency-seed` targets `portal/Backend/src/database/seed.ts` (the portal
codebase), not `Source/Backend`. The work item ID format used there (`BUG-XXXX`,
`FR-XXXX`) differs from the `Source/Backend` format (`WI-XXXX`). Do not attempt to
write a seed test in `Source/Backend/tests/`.

### FR-dependency-search Not Implemented in Source/Backend
As of 2026-04-14 the `GET /api/search` route is missing from
`Source/Backend/src/app.ts`. The frontend client calls `/api/search?q=` but there
is no matching route. Tests in `Source/Backend/tests/routes/search.test.ts`
document the expected contract and intentionally fail until the route is wired up.

### Existing Detail Page Mock is Incomplete but Tests Still Pass
`tests/pages/WorkItemDetailPage.test.tsx` mocks `workItemsApi` without
`searchItems` or `setDependencies`. This works because `DependencySection` only
calls those functions on user interaction (typing in the picker, saving). Initial
render doesn't trigger API calls in those methods. New integration tests that render
the full page should include the complete mock to avoid future surprises.

## Cycle: pipeline-optimisations (2026-04-15)

### Infrastructure FRs Need Configuration Tests in Source/

When FRs target `platform/` files (Dockerfile, workflow-engine.js) or `Specifications/` docs
rather than application code in `Source/`, there is no natural home for traceability
comments. The traceability enforcer only scans `Source/` and `E2E/`. The solution is to
write "infrastructure configuration tests" in `Source/Backend/tests/infrastructure/` that:
- Read the actual file using `fs.readFileSync` and assert expected content
- Carry `// Verifies: FR-XXX` comments that satisfy the enforcer
- Serve as regression guards (fail if implementation is reverted)

These tests fail when the implementation is missing/incomplete — which is intentional and
the correct QA behavior. Do NOT skip or xfail them.

### platform/ Changes Require Solo Session — Enforce in QA Report

Per CLAUDE.md, `platform/` is solo-session only. If all FRs in a plan touch `platform/`,
the implementation MUST come from a solo session, not a pipeline coder. QA should
explicitly call this out in the verdict if implementation is missing.

### Cross-Referenced Parent-Plan FRs Are Picked Up by the Enforcer

The traceability enforcer matches ALL `FR-[A-Z0-9-]+` patterns in the requirements.md,
including parent-spec FRs that appear in the "Spec refs" header or "Current State" table
(e.g., FR-TMP-003, FR-TMP-008, FR-TMP-010). These must also have `// Verifies:` comments
in Source/. Add them to the infrastructure test file with appropriate test cases that
actually verify related behavior.

### Metrics Counters Are Module Singletons
`prom-client` counters are module-level singletons. Test files that import `app`
share the same counter state. Assertions that check counter values (not just label
presence) can be flaky when run alongside other test files. Prefer asserting that
counter names are present in the `/metrics` output rather than asserting specific
numeric values.
