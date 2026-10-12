# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-10-12 (First Full Audit)

#### Spec Coverage Trend
- **Baseline established: ~22% overall coverage**
- 13/13 FR-WF-* requirements implemented (self-judging-workflow plan) — 100%
- ~13/13 FR-dependency-* requirements implemented — 100%
- FR-001 to FR-069 (dev-workflow-platform plan, orchestrated-dev-cycles, dev-cycle-traceability): 0% — largest gap
- FR-070+ (image-upload, orchestrator-cycle-dashboard): 0%
- Grade: **D** (min_spec_coverage threshold of 40% not met)

#### Critical Infrastructure Gap Found
- `GET /api/search` (FR-dependency-search) is NOT registered in `Source/Backend/src/app.ts`
- The test file `Source/Backend/tests/routes/search.test.ts` explicitly documents this at line 3-6: "these tests will FAIL until the route is implemented"
- The `DependencyPicker` component in the frontend depends on this route

#### Traceability Enforcer Blind Spot (P1)
- `python3 tools/traceability-enforcer.py` without arguments picks the **most recently modified** requirements.md
- Current most-recently-modified: `Plans/self-judging-workflow/requirements.md` — always passes
- Running against other plans reveals massive failures: 34 missing (dev-workflow-platform), 21 missing (dev-cycle-traceability), 18 missing (orchestrated-dev-cycles)
- The CLAUDE.md verification gate is misleading — "All requirements have implementation references" is a false green

#### FR-ID Format Inconsistency
- `Plans/dependency-linking/requirements.md` uses `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`
- Actual code uses `FR-dependency-service`, `FR-dependency-types`, `FR-dependency-api-client` etc.
- Enforcer can never match these — they look unimplemented but are conceptually covered

#### Architecture: All Recently Modified Files Have Verifies Comments
- All 40 source files modified in the last 14 days have at least one `// Verifies:` comment
- Traceability comment discipline is strong for the implemented (FR-WF-* and FR-dependency-*) work

#### ESLint Suppression Locations
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — eslint-disable-next-line react-hooks/exhaustive-deps
- `Source/Frontend/src/hooks/useWorkItems.ts:63` — eslint-disable-next-line react-hooks/exhaustive-deps

#### Fast Audit Paths (for future runs)
- All production source is in `Source/Backend/src/` and `Source/Frontend/src/`
- Spec truth: `Specifications/dev-workflow-platform.md` (lines 337-482 cover all FRs)
- Traceability enforcer: always run with `--plan` for each plan in `Plans/` — never rely on auto-select
- Search route gap: check `Source/Backend/src/app.ts` for `/api/search` registration
