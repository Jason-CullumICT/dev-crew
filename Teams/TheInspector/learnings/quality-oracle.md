# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-04-15 — Grade B

### Project Architecture (Critical Context)

This repo has **three distinct application layers**, each with its own spec and implementation:

| Layer | Spec | Implementation | Traceability | Enforcer Scans? |
|-------|------|----------------|--------------|----------------|
| `Source/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/` | FR-WF-001–013 | ✅ Full | ✅ Yes |
| `portal/` | `Specifications/dev-workflow-platform.md` + `Plans/dev-workflow-platform/` | FR-001–069 | ✅ 1068 Verifies comments | ❌ No |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–010 | ❌ None | ❌ No |

Never confuse the three layers. `Source/` is the self-judging workflow engine (in-memory store, no DB). `portal/` is the full dev-workflow-platform app (SQLite DB). `platform/` is the orchestrator infrastructure.

### Key File Paths (fast lookups for future audits)

- Spec FR inventory: `Specifications/dev-workflow-platform.md` (FR-001–069), `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md` (FR-TMP-*)
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-013 items), `Plans/dependency-linking/requirements.md` (16 items)
- Traceability enforcer: `tools/traceability-enforcer.py` — scans `["Source", "E2E"]` only
- Portal test suite: `portal/Backend/tests/` (14 files) + `portal/Frontend/tests/` (16 files)
- Logger abstraction: `Source/Backend/src/utils/logger.ts` (canonical) + `Source/Backend/src/logger.ts` (compat wrapper, tech debt)

### Traceability Enforcer Behavior

- **Default mode** picks most-recently-modified `requirements.md` under `Plans/` — unreliable, always pass `--plan` explicitly.
- **Regex `FR-[A-Z0-9-]+`** is too broad — matches seed data references like "FR-0002" in prose. Dependency-linking plan triggers 7 false-failures because the plan's "Implementation Delta" table refers to items like "FR-0004 blocked_by FR-0003".
- **Portal coverage is unverified** — 1068 Verifies comments exist but the enforcer never validates them. A PR that deletes half those comments would pass all gates.
- **False-pass risk**: A `// Verifies:` comment in a test file satisfies the enforcer even if the production route is missing (as with `GET /api/search` — test exists, route does not).

### Open Implementation Gaps (as of 2026-04-15)

From `Plans/dependency-linking/requirements.md` implementation delta:
1. **FR-dependency-api-types** — `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by?: string[]` in `portal/Shared/`; `DependencyPicker.tsx` uses `as any` cast as workaround.
2. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist; demo environment shows no seeded dependency examples.
3. **FR-dependency-frontend-tests** — `portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist.

Route `GET /api/search` in `Source/Backend/` is **documented as intentionally missing** — test file says "will FAIL until the route is implemented."

### Spec Coverage Trend

- First audit: **82%** (58/71 traced requirements across all specs/plans)
- Self-judging workflow: 100% ✅
- Dev-workflow-platform (portal): ~100% but enforcer-blind ⚠️
- Dependency-linking: 81% (3 gaps open)
- Tiered-merge-pipeline: 0% verified (implemented in platform/ which enforcer doesn't scan)

### Pattern Violations Found

- **eslint-disable suppressions** (P3): `DependencyPicker.tsx:82` and `useWorkItems.ts:63` both suppress `react-hooks/exhaustive-deps`. Check these files first in future hook-related reviews.
- **Dual logger files** (P3): `Source/Backend/src/logger.ts` is a compat re-export of `src/utils/logger.ts`. Should be consolidated.
- **Non-canonical FR IDs in portal** (P3): Portal uses `FR-dependency-linking`, `FR-dependency-cycle-detection`, etc. instead of the plan's `FR-dependency-service`, `FR-dependency-schema`, etc.

### What's Clean

- Zero `console.log` in production source (both Source/ and portal/Backend/)
- Zero empty/swallowed catch blocks — all catch paths log with full context
- Zero hardcoded secrets detected
- Zero large files (>500 lines) in Source/
- `{data: T[]}` wrapper pattern followed consistently
- No direct DB calls from route handlers in Source/ (in-memory store accessed via service layer)
