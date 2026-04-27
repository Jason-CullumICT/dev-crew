# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-27 — Grade C

### Spec Coverage Trend
- First audit. Baseline established.
- **Active plan coverage (FR-WF-* + FR-dependency-*):** 97% (28/29 requirements traced)
- **Full Specifications/ coverage:** ~23% — because Specifications/ describes a different system (dev-workflow-platform) than what Source/ implements (workflow-engine)

### Key Architecture Insight
The repository has two layers of specs that DO NOT match:
- `Specifications/dev-workflow-platform.md` — describes a full development platform (feature requests, bug tracking, pipeline runs, learnings). NOT implemented in Source/.
- `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` — describes the work item routing engine + dependency gating. IS implemented in Source/.

**The traceability enforcer at `tools/traceability-enforcer.py` only checks `Plans/` (most recently modified plan), not `Specifications/`.** This creates a false-green: enforcer passes but Specifications/ is 77% unimplemented.

### Common Pattern Violations Found
1. **Dual logger abstraction**: `src/logger.ts` wraps `src/utils/logger.ts` for call-site compatibility. Different parts of the codebase import from different locations.
2. **Logger missing dev mode**: `utils/logger.ts` always emits JSON, no `NODE_ENV` check for pretty-print.
3. **Missing Prometheus histogram**: `dependencyCheckDuration` histogram specified in `FR-dependency-metrics` absent from `metrics.ts`.
4. **`pending_dependencies` status gap**: Specified in `FR-dependency-dispatch-gating` and in `api-contracts.md`, but missing from `WorkItemStatus` enum. The dispatch gating logic returns 400 instead of transitioning to this status.

### Known Open Issues (Re-verify Next Audit)
- **QO-001 (P1):** `GET /api/search` not wired in `app.ts` — tests in `search.test.ts` will fail. Check if route was added.
- **QO-005 (P2):** `pending_dependencies` not in `WorkItemStatus` enum — check if added.
- **QO-004 (P2):** `dependencyCheckDuration` histogram absent from `metrics.ts` — check if added.
- **QO-006 (P2):** Duplicate frontend tests in `tests/` and `tests/pages/` — check if one set was removed.

### Useful File Paths for Future Audits
| What | Path |
|------|------|
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Shared types (single source of truth) | `Source/Shared/types/workflow.ts` |
| Logger implementation | `Source/Backend/src/utils/logger.ts` |
| Logger compat wrapper | `Source/Backend/src/logger.ts` |
| Prometheus metrics | `Source/Backend/src/metrics.ts` |
| App wiring (routes) | `Source/Backend/src/app.ts` |
| API contracts (WIP doc) | `Source/Shared/api-contracts.md` |
| Search test (intentionally failing) | `Source/Backend/tests/routes/search.test.ts` |

### Traceability Patterns in Use
- `FR-WF-001` through `FR-WF-013` — workflow engine requirements (from Plans/)
- `FR-dependency-*` — dependency tracking requirements (from Specifications/dev-workflow-platform.md, adapted to Source/)
- `FR-070` through `FR-085` — mentioned only in `api-contracts.md` with no canonical spec

### Test Quality Observations
- Backend: 344 assertions across 7 route test files, 317 across 6 service test files. Zero skipped tests.
- Frontend: 4 duplicate test file pairs (`WorkItemDetailPage` and `WorkItemListPage` each have two copies).
- E2E: Playwright is configured but `Source/E2E/tests/` directory does not exist.
- No empty catch blocks. No `console.log` in production source.
