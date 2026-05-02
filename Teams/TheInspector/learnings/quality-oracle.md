# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-05-02 — First full audit

#### Spec / Plan / Code ID Architecture (critical context)

This project has **three distinct levels** of requirement IDs:

| Level | Location | ID format | Enforced? |
|-------|----------|-----------|-----------|
| Canonical Domain Specs | `Specifications/*.md` | `FR-001…FR-069`, `FR-TMP-001…FR-TMP-010` | ❌ Not enforced |
| Plan-level Requirements | `Plans/{feature}/requirements.md` | `FR-WF-001…FR-WF-013`, `FR-dependency-*` | ✅ Partially (one file at a time) |
| Source Verifies comments | `Source/**/*.ts` | same as plan IDs | ✅ Checked against active plan |

**Key insight**: Specifications/ maps to *different apps*:
- `Specifications/workflow-engine.md` → Source/ (plan uses FR-WF-*)
- `Specifications/dev-workflow-platform.md` → portal/ (plan uses FR-001…FR-069)
- `Specifications/tiered-merge-pipeline.md` → platform/ orchestrator (FR-TMP-*)

The `tools/traceability-enforcer.py` defaults to the **most recently modified** `Plans/*/requirements.md`.
As of 2026-05-02 that is `Plans/self-judging-workflow/requirements.md` (FR-WF-001…FR-WF-013).
`Plans/dependency-linking/requirements.md` (FR-dependency-*) is NOT automatically checked.

#### Known Open Issues (as of this run)

- **P1**: `GET /api/search` endpoint not wired into `Source/Backend/src/app.ts` — acknowledged in search.test.ts with explicit comment
- **P2**: `dependencyCheckDuration` Histogram missing from `Source/Backend/src/metrics.ts` (exists in portal/Backend)
- **P2**: `workItems.ts` and `intake.ts` routes call store directly (bypass service layer)
- **P2**: `FR-dependency-dispatch-gating` deviation — spec requires `pending_dependencies` status transition; Source/ returns 400 without status change
- **P2**: Canonical Specifications/ FR IDs (FR-001…FR-069, FR-TMP-*) have 0 `Verifies:` matches in Source/ (by design — different apps)

#### Useful file paths for future audits

- Active plan being enforced: `Plans/self-judging-workflow/requirements.md`
- Dependency plan: `Plans/dependency-linking/requirements.md`
- Metrics: `Source/Backend/src/metrics.ts`
- App entry + route registrations: `Source/Backend/src/app.ts`
- Search test (with intentional failure note): `Source/Backend/tests/routes/search.test.ts`
- Dual logger issue: `Source/Backend/src/logger.ts` + `Source/Backend/src/utils/logger.ts`

#### Spec coverage trend

- FR-WF-* (13 req): **100%** covered
- FR-dependency-* (16 req): **~87.5%** covered (search endpoint and histogram missing in Source/)
- Canonical Specifications/ FR IDs: not applicable to Source/ (different app domains)

#### Pattern violations common in this codebase

- Route handlers calling store directly (intake.ts, workItems.ts) — look for `import * as store from '../store/'` in route files
- The `eslint-disable-next-line react-hooks/exhaustive-deps` in hooks — scan hooks/ directory
