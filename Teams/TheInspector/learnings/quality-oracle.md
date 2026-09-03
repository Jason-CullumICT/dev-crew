# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-09-03

### Spec Coverage Trend
- **Specifications/ coverage: ~15%** (15 of ~100 formal spec FRs referenced in source) → Grade D
- **Plans/self-judging-workflow coverage: 100%** (13/13 FR-WF-* referenced in source)
- Root cause: The codebase implements a workflow engine (Plans/self-judging-workflow) but the canonical `Specifications/` dir contains the OLD app design (dev-workflow-platform with SQLite, feature requests, dev cycles, bug reports). These two are fundamentally different applications.

### Critical Gaps Found
1. **FR namespace split**: Source uses `FR-WF-XXX` (from Plans/), not `FR-XXX` (from Specifications/). The specs and source live in parallel universes.
2. **`/api/search` route is unimplemented**: `Source/Backend/tests/routes/search.test.ts` explicitly warns the route is NOT wired. Tests will fail. FR-dependency-search is open.
3. **12 frontend test files have zero `// Verifies:` comments** — entire frontend test suite is untraced.
4. **Traceability enforcer scope**: `tools/traceability-enforcer.py` only scans `Plans/*/requirements.md` (most recent), NOT `Specifications/`. The "PASSED" result covers ~13% of the actual spec corpus.
5. **`Specifications/workflow-engine.md`** is purely narrative — no formal FR IDs. Conceptual spec for the current system but unenforceable.
6. **FR-dependency-seed** has no `// Verifies:` in source (the only dependency FR not referenced).

### Useful File Paths
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013)
- Canonical spec dir: `Specifications/` (FR-001..069 for old app; FR-dependency-* for dependency feature)
- Traceability enforcer: `tools/traceability-enforcer.py` (checks Plans/ only)
- All backend test files: `Source/Backend/tests/` — route tests and most service tests HAVE Verifies
- Frontend test files (12 total): NONE have Verifies comments
- Unimplemented route: `GET /api/search` (no router registration in `Source/Backend/src/app.ts`)

### Common Pattern Violations
- `eslint-disable-next-line react-hooks/exhaustive-deps` in `Source/Frontend/src/hooks/useWorkItems.ts:63` and `Source/Frontend/src/components/DependencyPicker.tsx:82` (undocumented suppressions)
- Hardcoded `http://localhost:4200` fallback in `Source/Frontend/src/pages/DebugPortalPage.tsx`

### Architecture / Traceability Gap to Fix
The `Specifications/` directory must either:
(a) Be updated with workflow-engine FRs (FR-WF-001..013 moved from Plans/ into Specifications/), or
(b) The old dev-workflow-platform.md FRs explicitly marked as `[SUPERSEDED]`
And the traceability enforcer must be extended to scan `Specifications/` in addition to `Plans/`.
