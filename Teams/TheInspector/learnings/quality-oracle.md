# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-09-24

### Active Spec vs Archive Spec — Critical Distinction

**Two specification documents exist with conflicting scope:**

| Document | FR ID Format | FR Count | Implementation Status |
|----------|-------------|----------|----------------------|
| `Specifications/dev-workflow-platform.md` | `FR-001` – `FR-069` | 85 rows | **0% — not implemented** |
| `Plans/self-judging-workflow/requirements.md` | `FR-WF-001` – `FR-WF-013` | 13 rows | **100% traced and passing** |

`dev-workflow-platform.md` describes a completely different system (SQLite, feature requests, bug reports, pipelines, voting) that is NOT implemented. The active system is a self-judging workflow engine with an in-memory store.

**Interpretation:** `dev-workflow-platform.md` appears to be a legacy or aspirational spec for a future system. It is NOT being enforced by the traceability enforcer (which uses the most-recently-modified `requirements.md` in `Plans/`).

**Action for future audits:** Do NOT confuse `dev-workflow-platform.md` FRs with the active `FR-WF-xxx` requirements. Confirm with the team whether `dev-workflow-platform.md` is active or archived.

### Traceability Enforcer Scope

The enforcer at `tools/traceability-enforcer.py` automatically selects the most-recently-modified `Plans/**/requirements.md`. Currently: `Plans/self-judging-workflow/requirements.md`. All 13 FR-WF requirements pass.

### File Locations for Fast Future Audits

- **Active requirements:** `Plans/self-judging-workflow/requirements.md`
- **Source routes:** `Source/Backend/src/routes/`
- **Source services:** `Source/Backend/src/services/`
- **Shared types (single source of truth):** `Source/Shared/types/workflow.ts`
- **Frontend pages:** `Source/Frontend/src/pages/`
- **Frontend hooks/api:** `Source/Frontend/src/hooks/`, `Source/Frontend/src/api/`
- **Backend tests:** `Source/Backend/tests/`
- **Frontend tests:** `Source/Frontend/tests/` (two layers: root + `pages/` and `components/` subdirs)

### Duplicate Frontend Test Files Found

`WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` each exist in TWO locations:
- `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
- `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
- `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
- `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)

Both test the same components. The `pages/` versions appear to be newer (use shared Shared/types imports directly). Determine which is canonical and remove the other.

### Common Pattern Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in:
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`

- Non-standard Verifies comment in `DebugPortalPage.tsx`: uses free-text description instead of `FR-WF-XXX` format.

- `Source/E2E/playwright.pipeline.config.ts` references a stale, dynamically-generated test directory `./tests/cycle-run-1774659927912-8dd3ac77` that does not exist.

### Architecture Compliance (Good)

- No `console.log` in production source (only exception is the logger module itself, which is the correct log sink).
- No direct DB calls in route handlers (uses service layer).
- No inline type re-definitions in Backend or Frontend (all from `Source/Shared/types/workflow.ts`).
- All catch blocks log with structured logger before returning error responses.
- Prometheus metrics endpoint confirmed at `Source/Backend/src/metrics.ts`.

### Spec Coverage Trend

- Active plan (FR-WF-001–013): **100%** — stable, all implemented and traced.
- `dev-workflow-platform.md` (FR-001–069): **0%** — unimplemented by design (different system).
