# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-06-18

### Project Architecture

This repo has **two co-existing applications**, not one:

1. **`Source/`** — Self-judging workflow engine (Express + in-memory store). Specs live in `Specifications/workflow-engine.md`; FRs are tracked as `FR-WF-001..013` in `Plans/self-judging-workflow/requirements.md` and `FR-dependency-*` in `Plans/dependency-linking/requirements.md`.

2. **`portal/`** — Dev-workflow platform (Express + SQLite + React). This is the _production application_. Specs live in `Specifications/dev-workflow-platform.md`; FRs are tracked in `Plans/dev-workflow-platform/requirements.md`. Despite the name "portal", this is a full product with routes, services, migrations, and a React SPA.

The enforcer auto-selects the most recently modified `requirements.md` in `Plans/` — right now that is `Plans/self-judging-workflow/requirements.md`.

### Key Spec Structure

| Spec File | FR Namespace | Implementation Home |
|-----------|-------------|---------------------|
| Specifications/workflow-engine.md | FR-WF-001..013 | Source/Backend/, Source/Frontend/ |
| Specifications/dev-workflow-platform.md | FR-001..091+ | portal/Backend/, portal/Frontend/ |
| Specifications/tiered-merge-pipeline.md | FR-TMP-001..010 | Unimplemented (planned for platform/) |

### Critical Blind Spot: Enforcer ≠ Portal

`tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. It completely ignores `portal/`. Running it against `Plans/dev-workflow-platform/requirements.md` incorrectly reports ALL FRs as missing. This is a known gap (QO-001, P1). Do NOT trust a PASS result from the default enforcer run as proof that portal/ is compliant.

### Spec Coverage Trend

| Scope | Coverage | Trend |
|-------|----------|-------|
| Source/ (FR-WF-*) | 100% | ✅ Stable |
| Source/ (FR-dependency-*) | 87.5% | ⬇️ Missing search + seed |
| portal/ (FR-001..091+) | ~79% | Not measurable via default enforcer |
| Tiered merge pipeline | 0% | Planned only |

### Open P1/P2 Findings (for re-verification next run)

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| QO-001 | P1 | Enforcer blind to portal/ | tools/traceability-enforcer.py:70 |
| QO-002 | P1 | GET /api/search not implemented (5 tests fail) | Source/Backend/src/app.ts |
| QO-003 | P2 | dependencyCheckDuration histogram missing | Source/Backend/src/metrics.ts |
| QO-004 | P2 | Route handlers import store directly | Source/Backend/src/routes/*.ts |
| QO-005 | P2 | Duplicate frontend test files | Source/Frontend/tests/ |

### Useful Paths for Future Audits

- Traceability source of truth for Source/: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Traceability source of truth for portal/: `Plans/dev-workflow-platform/requirements.md`
- Architecture rules: `CLAUDE.md` §Architecture Rules
- Enforcer script: `tools/traceability-enforcer.py` (hardcodes Source/ + E2E/)
- Backend test entry: `Source/Backend/package.json` → `jest --forceExit`
- Frontend test entry: `Source/Frontend/package.json` → `vitest run`
- Portal test entry: `portal/Backend/package.json` → `vitest run`

### Common Pattern Violations Found

1. **Route-store coupling**: Routes import from `store/workItemStore` directly. Architecture rule says use service layer. Low severity in pure in-memory systems but non-compliant.
2. **eslint-disable without comment**: Two instances in DependencyPicker.tsx and useWorkItems.ts — suppress `react-hooks/exhaustive-deps` with no explanation.
3. **Test file duplication**: When test suites are split into subdirectories (tests/pages/, tests/components/), root-level copies can get stale. Check for both.
