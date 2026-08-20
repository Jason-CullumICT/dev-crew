# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-20 — Full Audit

### Spec Coverage Trend

- **Active plan (`self-judging-workflow`)**: 13/13 = **100%** — traceability enforcer PASSES
- **All plans combined** (131 unique FR IDs across 8 plans): 28 implemented = **~21%**
- **Trend**: First audit. No baseline.

### Key Structural Discovery

The source implements the **self-judging-workflow** plan (in-memory Work Item engine) but the repository contains 7 other APPROVED plans that are NOT implemented in Source/:

| Plan | FRs | Implemented |
|------|-----|-------------|
| self-judging-workflow | 13 | 13 (100%) |
| dependency-linking | 7 | 4 (57%) |
| orchestrated-dev-cycles | 17 | 14 (82%) |
| dev-cycle-traceability | 20 | 18 (90%) |
| duplicate-deprecated-status | 15 | 12 (80%) |
| image-upload | 20 | 17 (85%) |
| orchestrator-cycle-dashboard | 7 | 0 (0%) |
| **dev-workflow-platform** | **32** | **0 (0%)** |

The `dev-workflow-platform` plan (FR-001..032) describes a SQLite-based system (feature requests, bug reports, dev cycles) — a completely different architecture from what is built. Either this plan was superseded by the self-judging-workflow pivot, or it represents a build target for an external product. This needs clarification.

### Traceability Enforcer Gap

`tools/traceability-enforcer.py` auto-selects the most recently modified `requirements.md` and checks ONLY that plan. It silently ignores all other plans. Six approved plans currently fail if checked individually.

### Useful File Paths

- `Plans/*/requirements.md` — all plan requirement files
- `Source/Backend/src/app.ts` — route registration (no search route mounted)
- `Source/Backend/tests/routes/search.test.ts` — search test intentionally documents unimplemented route
- `Source/Frontend/tests/` — root level + `pages/` subdirectory contain DUPLICATE test files
- `tools/traceability-enforcer.py` — run with `--plan <name>` to target specific plan

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` appears in 2 production files (acceptable if documented, but worth watching)
- Silent catch in `api/client.ts` line 26: `response.json().catch(() => ({}))` — intentional, HTTP error parsing
- Duplicate test coverage: `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` (same for WorkItemListPage)

### Unimplemented Route Flagged by Own Tests

`GET /api/search` (FR-dependency-search) — test file explicitly states route is not wired. This is the only route with a test-documenting-gap pattern.
