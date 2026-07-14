# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-07-14 — Full Audit

### Spec Coverage Trend: **90%** (first baseline)

### Repository Structure (Critical to Know)

This repo contains **three distinct applications** with separate traceability domains:

| App | Path | Spec Source | Plan FR IDs |
|-----|------|-------------|-------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | `FR-WF-001` to `FR-WF-013` |
| Dev Workflow Platform (Portal) | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001` to `FR-069` + `FR-dependency-*` |
| Orchestrator Infrastructure | `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001` to `FR-TMP-010` |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/` — **it is completely blind to `portal/` and `platform/`**.

### Traceability Enforcer Limitations

1. **Blind to portal/**: All 69+ FRs from `dev-workflow-platform.md` implemented in `portal/` cannot be verified by the enforcer. Run enforcer manually with `--plan` flag targeting portal plans.
2. **False positives in seed data references**: The regex `FR-[A-Z0-9-]+` matches `FR-0004` appearing as item IDs in seed-data examples inside `requirements.md`. Running against `dependency-linking` plan produces 7 spurious MISSING results.
3. **Can't target Specifications/ directly**: The enforcer only reads from `Plans/*/requirements.md` files. `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) has no matching `requirements.md` in Plans.

**Workaround**: Pass `--file Specifications/tiered-merge-pipeline.md` to target a spec directly.

### Common Pattern Violations

- `portal/Backend/src/routes/*.ts` files call `getDb()` within route handlers and pass `db` to service functions. This violates "No direct DB calls from route handlers". Affects: `bugs.ts`, `featureRequests.ts`, and others. The service functions accept `db` as a parameter rather than managing their own connection — the route layer owns DB lifecycle, not the service layer.
- `platform/orchestrator/lib/workflow-engine.js` uses 164+ `console.log` calls — violates "never console.log" rule. Platform files are solo-session only to fix.
- `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291/293 use `as any` cast — symptom of `FR-dependency-api-types` not being implemented in `portal/Shared/api.ts`.

### Useful File Paths for Faster Future Audits

- Spec files: `Specifications/workflow-engine.md`, `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`
- Portal shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Portal DB connection: `portal/Backend/src/database/connection.ts`, `portal/Backend/src/database/schema.ts`
- Active open gaps: `portal/Shared/api.ts` (missing `blocked_by`), `portal/Backend/src/database/seed.ts` (missing file), `portal/Frontend/tests/DependencySection.test.tsx` + `BlockedBadge.test.tsx` (missing)
- Duplicate test files: `Source/Frontend/tests/WorkItemListPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (same coverage, both ~270-280 lines)

### Open P2 Findings (from this run)

| ID | Finding | File |
|----|---------|------|
| QO-001 | FR-dependency-api-types not implemented | `portal/Shared/api.ts` |
| QO-002 | FR-dependency-seed not implemented | `portal/Backend/src/database/` (file missing) |
| QO-003 | FR-dependency-frontend-tests incomplete | `portal/Frontend/tests/` (missing DependencySection + BlockedBadge tests) |
| QO-004 | Portal routes call getDb() directly | `portal/Backend/src/routes/bugs.ts` etc. |
| QO-005 | 164 console.log in orchestrator | `platform/orchestrator/lib/workflow-engine.js` |
| QO-006 | Traceability enforcer fails dependency-linking (false positives) | `tools/traceability-enforcer.py` |
