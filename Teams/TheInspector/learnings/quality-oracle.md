# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-11-03 — First Full Audit

#### Spec Layout (critical for future audits)
- **Three Specification files** exist in `Specifications/`: `workflow-engine.md`, `dev-workflow-platform.md`, `tiered-merge-pipeline.md`
- **Eight plan files** exist in `Plans/*/requirements.md`: self-judging-workflow, dependency-linking, image-upload, duplicate-deprecated-status, orchestrated-dev-cycles, orchestrator-cycle-dashboard, dev-cycle-traceability, dev-workflow-platform
- Source code ONLY traces back to FR-WF-* (from workflow-engine/self-judging-workflow) and FR-dependency-* (from dependency-linking) IDs
- `dev-workflow-platform.md` (70 FRs: FR-001..FR-069) and `tiered-merge-pipeline.md` (10 FRs: FR-TMP-001..FR-TMP-010) have **zero source coverage**

#### Traceability Enforcer Behavior
- `tools/traceability-enforcer.py` reads the **most-recently-modified** `Plans/*/requirements.md` — only ONE plan at a time
- It never reads `Specifications/` files directly
- Running it gives a false "PASSED" because it only checks FR-WF-001..013 from self-judging-workflow
- Fix needed: run enforcer with `--file` for each plan, or update enforcer to check all plans

#### Source Architecture (fast orientation for next run)
- Backend: `Source/Backend/src/` — Express/TypeScript, in-memory store, no DB
- Frontend: `Source/Frontend/src/` — React/Vite/TypeScript
- Shared types: `Source/Shared/types/workflow.ts`
- Test dirs: `Source/Backend/tests/`, `Source/Frontend/tests/`
- All backend production files have `// Verifies:` comments
- Frontend infrastructure files (`vite.config.ts`, `vite-env.d.ts`) are the only no-Verifies outliers (expected)

#### Known P1/P2 Open Findings (as of 2026-11-03)
- **QO-001 (P1)**: `dev-workflow-platform.md` 70 FRs with 0% source coverage — OPEN
- **QO-002 (P1)**: `tiered-merge-pipeline.md` 10 FRs with 0% source coverage — OPEN  
- **QO-003 (P2)**: Traceability enforcer blind spot — checks only 1 plan — OPEN
- **QO-004 (P2)**: `fastTrack` field silently dropped in work item creation — OPEN
- **QO-005 (P2)**: Duplicate test files in Frontend tests/ and tests/pages/ — OPEN

#### Spec Coverage Trend
- workflow-engine.md (via plan): 13/13 FRs = 100%
- dependency-linking (via plan): ~14/14 FR-dependency-* = ~100%
- dev-workflow-platform.md: 0/70 = 0%
- tiered-merge-pipeline.md: 0/10 = 0%
- **Overall cross-Specifications coverage: ~14%**
