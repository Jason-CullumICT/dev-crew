# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run — 2026-07-16

### Spec Coverage Trend
- **Self-Judging Workflow Engine (FR-WF-001 — FR-WF-013):** 13/13 = **100%**
- **Dependency Tracking (FR-dependency-*):** 14/15 traced — `FR-dependency-search` endpoint absent from app.ts = **93%**
- **Portal plans (FR-001 — FR-069 + FR-TMP-*, FR-033–049, FR-050–069):** Not in scope for this tool — portal code lives in `portal/`, enforcer scans `Source/` only

### Architecture of the Codebase

Two distinct apps live in this repo:
- **`Source/`** — Self-Judging Workflow Engine (SJWE). Implements FR-WF-001 — FR-WF-013 (Plans/self-judging-workflow) + FR-dependency-* (Plans/dependency-linking). Backend is Express+TypeScript with in-memory store (no SQLite). Frontend is React+Vite+Tailwind.
- **`portal/`** — Dev Workflow Platform. Implements FR-001 — FR-069 and all portal-specific plans. SQLite backend.

The traceability enforcer (`tools/traceability-enforcer.py`) scans `Source/` and `E2E/` only. It is **unaware of `portal/`**. All portal plans (dev-workflow-platform, dev-cycle-traceability, orchestrated-dev-cycles, etc.) will falsely fail the enforcer when run against Source/.

### Fast Paths for Future Audits

| Concern | Where to look |
|---------|--------------|
| SJWE spec | `Specifications/workflow-engine.md` → `Plans/self-judging-workflow/requirements.md` |
| Dependency tracking spec | `Specifications/dev-workflow-platform.md` (FR-dependency-*) → `Plans/dependency-linking/requirements.md` |
| Portal spec | `Specifications/dev-workflow-platform.md` (FR-001 — FR-069) |
| Tiered merge pipeline | `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 — FR-TMP-010) → lives in `platform/` |
| All Verifies in Source | `grep -rn "Verifies:" Source/` |
| Test runner — Backend | Jest (package.json), despite CLAUDE.md claiming Vitest for both |
| Test runner — Frontend | Vitest |

### Known Open Issues (carry forward)

1. **FR-dependency-search: GET /api/search not wired** — `Source/Backend/tests/routes/search.test.ts` explicitly documents this. Route file missing; test will fail.
2. **Duplicate test files** — `Source/Frontend/tests/WorkItemDetailPage.test.tsx` duplicated at `tests/pages/WorkItemDetailPage.test.tsx`; same for WorkItemListPage. Both run in CI.
3. **Enforcer scope gap** — `inspector.config.yml` source.dirs only lists `Source/`; portal plans will fail on wrong grounds.
4. **Logger split** — two logger implementations (`src/logger.ts` wraps `src/utils/logger.ts`); neither does dev pretty-printing as FR-003 requires.
5. **Backend Jest vs Vitest mismatch** — CLAUDE.md says Vitest for both; backend uses Jest.

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` used in 2 production files instead of fixing the dependency arrays
- Traceability enforcer extracts FR IDs from prose (seed data descriptions), causing false FAIL noise on dependency-linking plan
