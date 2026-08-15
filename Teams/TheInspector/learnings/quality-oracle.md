# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run — 2026-08-15

### Spec Coverage Snapshot

| Plan / Spec | FR Count | Source Coverage | Status |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | 13/13 = **100%** | ✅ |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 15 | 14/15 = **93%** | ⚠ FR-dependency-search unimplemented |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0/10 = **0%** | ❌ Entirely unimplemented in Source/ |
| `Specifications/dev-workflow-platform.md` (FR-001–085) | 85 | 0/85 = **0%** | ℹ️ Portal project spec — Source/ implements workflow engine, not portal |

**Overall (workflow engine scope only):** 27/28 = **96%** (FR-dependency-search the sole gap)
**Including tiered-merge-pipeline:** 27/38 = **71%**

---

## Tool Discovery

- `tools/traceability-enforcer.py` — scans **most recently modified** `Plans/*/requirements.md` only. Run with `--file Plans/self-judging-workflow/requirements.md` and `--file Plans/dependency-linking/requirements.md` separately to cover both active plans.
- `tools/spec-drift-audit.py` — extracts canonical FRs from `Specifications/` using `FR-[A-Z]{2,4}-\d{3}` pattern; finds only FR-TMP-001–010 (tiered-merge-pipeline). Does NOT scan `Plans/` for requirements. FR-WF-XXX IDs in source appear as "untracked implementations" because they're in Plans/ not Specifications/.
- `spec-drift-report.json` written to repo root (not Teams/TheInspector/findings/).

## Architecture Patterns

- **Source/ = Self-Judging Workflow Engine** — in-memory store, Express, no SQLite.
- **portal/ = dev-workflow-platform** — separate codebase (SQLite, feature requests, bug reports, cycles). `Specifications/dev-workflow-platform.md` spec applies to portal/, not Source/.
- Store functions called directly from route handlers across `workItems.ts`, `workflow.ts`, `intake.ts` — bypass the service layer. This is pervasive (12+ call sites).
- Dashboard and assessment services are properly abstracted; router service properly called from workflow route.

## Traceability Patterns

- Backend tests: All 14 test files carry `// Verifies:` comments. Good.
- Frontend tests: Coverage via Verifies comments is strong (153 occurrences).
- Two eslint-disable comments exist in production source: `useWorkItems.ts:63` and `DependencyPicker.tsx:82`.
- `FR-dependency-search` is referenced in `tests/routes/search.test.ts` and `src/api/client.ts` but the backend `GET /api/search` route is NOT registered in `app.ts` — tests will fail.

## Fast-Path File Locations

| What to check | Where |
|---|---|
| Active workflow-engine requirements | `Plans/self-judging-workflow/requirements.md` |
| Active dependency-linking requirements | `Plans/dependency-linking/requirements.md` |
| Tiered-merge-pipeline spec (unimplemented) | `Specifications/tiered-merge-pipeline.md` |
| All route handlers (architecture rule) | `Source/Backend/src/routes/` |
| Store (in-memory, not a DB) | `Source/Backend/src/store/workItemStore.ts` |
| Search route gap | `Source/Backend/src/app.ts` (no /api/search), `tests/routes/search.test.ts` |
| Duplicate frontend tests | `tests/WorkItem*.test.tsx` vs `tests/pages/WorkItem*.test.tsx` |

## P1/P2 Issue Register (for re-verification on next run)

| ID | Severity | Status | Description |
|---|---|---|---|
| QO-001 | P1 | OPEN | `GET /api/search` not wired in app.ts; all 5 search tests will fail |
| QO-002 | P2 | OPEN | FR-TMP-001–010 have zero implementation coverage in Source/ |
| QO-003 | P2 | OPEN | Route handlers directly call store functions (architecture rule: use service layer) |
| QO-004 | P2 | OPEN | `spec-drift-audit.py` scans Specifications/ but Source/ FRs live in Plans/ — 0% canonical coverage reported misleadingly |
