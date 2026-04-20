# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Learnings

### Audit: 2026-04-20 — Full codebase audit

#### Project Architecture (fast context for future runs)
- **Source layout**: `Source/Backend/` (Express/TS), `Source/Frontend/` (React/Vite/TS), `Source/Shared/types/workflow.ts` (shared types), `Source/E2E/` (Playwright)
- **Store pattern**: In-memory `Map<string, WorkItem>` in `Source/Backend/src/store/workItemStore.ts` — no SQLite despite spec mentioning it. This IS the data layer.
- **Two logger files**: `src/logger.ts` wraps `src/utils/logger.ts`. Routes/services import from `src/logger`, store imports directly from `src/utils/logger`. Inconsistent.
- **Traceability enforcer**: `tools/traceability-enforcer.py` auto-detects the **most recently modified** `requirements.md` in `Plans/` — it does NOT scan `Specifications/`. As of this audit it targets `Plans/self-judging-workflow/requirements.md` (FR-WF-001 through FR-WF-013).

#### Critical Spec Coverage Gap (P1 - recurring risk)
- The traceability enforcer passes green while 89 spec requirements have zero implementation:
  - `Specifications/dev-workflow-platform.md`: 76 requirements (FR-001 to FR-069, FR-dependency-*) — all untraced
  - `Specifications/tiered-merge-pipeline.md`: 13 requirements (FR-TMP-001 to FR-TMP-010) — all untraced
- The built system (workflow engine) matches `Specifications/workflow-engine.md` and `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013), NOT the larger platform spec.
- **This is an intentional scope decision**, not accidental drift — the smaller system was built first. The gap is structural.

#### Known Implementation Gaps (documented, not regressions)
- `GET /api/search` — not wired in `app.ts`. Tests in `tests/routes/search.test.ts` document this gap explicitly with a NOTE comment. Clients calling `workItemsApi.searchItems()` get 404.
- `dependencyCheckDuration` histogram — required by `FR-dependency-metrics` but absent from `metrics.ts` and untested.
- `pending_dependencies` status — referenced in `api-contracts.md` and `FR-dependency-dispatch-gating` but missing from `WorkItemStatus` enum. Dispatch with unresolved blockers returns 400 instead of transitioning to this status.

#### Architecture Violation (structural)
- Route handlers in `workItems.ts` and `workflow.ts` call `store.*` directly (8 and 10 calls respectively). Architecture rule says "No direct DB calls from route handlers — use the service layer". `intake.ts` also has 2 direct store calls. Only `dashboard.ts` delegates to a service properly.

#### Useful file paths for faster future audits
- Specs: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Plans: `Plans/self-judging-workflow/requirements.md` (the enforcer target)
- Shared types: `Source/Shared/types/workflow.ts`
- Metrics: `Source/Backend/src/metrics.ts`
- App wiring: `Source/Backend/src/app.ts`
- API client (frontend): `Source/Frontend/src/api/client.ts`

#### Spec Coverage Trend
- First audit baseline: Plans/ coverage = 100%, Specifications/ coverage ≈ 15% (FR-WF-* + FR-dependency-* implemented; FR-001 to FR-069 and FR-TMP-* not implemented)
- The gap is structural (platform spec not yet built), not regression.
