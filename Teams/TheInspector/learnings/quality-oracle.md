# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-10-22 — First full audit

#### Project Structure
- Source code is in `Source/` (Backend, Frontend, Shared, E2E).
- The active implementation is the **Self-Judging Workflow Engine** (`workflow-engine.md`) using `FR-WF-XXX` IDs.
- The traceability enforcer auto-selects `Plans/self-judging-workflow/requirements.md` (most recently modified plan).

#### Spec Landscape
| Spec file | FR IDs | Status |
|-----------|--------|--------|
| `Specifications/workflow-engine.md` | FR-WF-001–013 | **IMPLEMENTED** — 100% coverage |
| `Plans/dependency-linking/requirements.md` | FR-dependency-* | **MOSTLY IMPLEMENTED** — seed missing |
| `Specifications/dev-workflow-platform.md` | FR-001–069 + FR-dependency-* | **NOT IMPLEMENTED** in Source/ (different product layer) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–010 | **NOT IMPLEMENTED** in Source/ (platform/ layer) |

#### Key Findings (P-ranked)
- **P1: Spec blindspot** — `dev-workflow-platform.md` (69 FRs) has zero implementation in `Source/`. Enforcer never catches this because it only runs against the most recently modified plan.
- **P2: Missing metric** — `dependencyCheckDuration` histogram required by FR-dependency-metrics not in `Source/Backend/src/metrics.ts`.
- **P2: Missing seed** — `FR-dependency-seed` (known dependency relationships for BUG-0010, FR-0004, FR-0005, FR-0007) has no implementation anywhere in `Source/`.
- **P2: Enforcer scope gap** — Default `python3 tools/traceability-enforcer.py` picks only the newest plan. Running it against `dev-workflow-platform` plan reveals 34 failing requirements. The verification gate silently misses these.
- **P3: Inline types** — `RouteResult` in `services/router.ts` and `AssessmentResult` in `services/assessment.ts` should live in `Source/Shared/` per architecture rules.
- **P3: eslint-disable** — Two suppressed react-hooks/exhaustive-deps rules in production code (DependencyPicker.tsx, useWorkItems.ts).

#### False-positive watch
When running the enforcer against `Plans/dependency-linking/requirements.md`, it reports `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085` as missing. These are **NOT** real requirement IDs — they are domain data references in the seed description text (e.g., `FR-0004 blocked_by FR-0003`). Do NOT create source comments for these.

#### Useful file paths
- Traceability enforcer: `tools/traceability-enforcer.py`
- Backend metrics: `Source/Backend/src/metrics.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Plans with requirements.md: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`, `Plans/dev-workflow-platform/`
