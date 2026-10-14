# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-10-14 — Full Audit (first run)

**Spec Coverage Map**

| Spec File | FR Count | Implemented | Coverage |
|-----------|----------|-------------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 70 | 0 | **0%** — separate product roadmap |
| `Specifications/dev-workflow-platform.md` (FR-dependency-*) | 16 | 15 | **94%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** — future roadmap |

**Key Discovery:** The traceability enforcer (`tools/traceability-enforcer.py`) only targets `Plans/self-judging-workflow/requirements.md` — it does NOT check `Specifications/dev-workflow-platform.md` FRs (001-069) or FR-TMP-* at all. This means the enforcer passes while large swaths of spec are untracked.

**Useful File Paths**

- Specs: `Specifications/workflow-engine.md`, `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`
- Plans: `Plans/self-judging-workflow/requirements.md` — the only file scanned by enforcer
- Backend source: `Source/Backend/src/` (routes/, services/, store/, middleware/)
- Backend tests: `Source/Backend/tests/` — all have Verifies comments ✓
- Frontend source: `Source/Frontend/src/` — all have Verifies comments (except `vite-env.d.ts`, trivially exempt)
- Frontend tests: `Source/Frontend/tests/` — all have Verifies comments (except `tests/setup.ts`, trivially exempt)
- Metrics: `Source/Backend/src/metrics.ts` — missing `dependencyCheckDuration` Histogram

**Known Open Issues (P2)**

1. `GET /api/search` not registered in `app.ts` — FR-dependency-search unimplemented as endpoint
2. `BlockedBadge` missing amber state for `pending_dependencies` status — FR-dependency-blocked-badge partially implemented
3. `dependencyCheckDuration` Histogram missing from metrics.ts — FR-dependency-metrics incomplete
4. FR-dependency-dispatch-gating: dispatch returns 400 error instead of transitioning to `pending_dependencies` status; `pending_dependencies` not in `WorkItemStatus` enum
5. FR-dependency-seed: no seed data implemented

**Architecture Compliance**

- ✓ No `console.log` in production code
- ✓ No direct DB calls from route handlers (in-memory store used)
- ✓ All route files use logger abstraction
- ✓ `{data: T[]}` wrappers used consistently on list endpoints
- ✓ No hardcoded secrets found
- ~ Two `eslint-disable` comments in production code (hooks exhaustive-deps — likely legitimate)
