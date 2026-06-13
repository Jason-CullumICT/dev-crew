# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Run: 2026-06-13

### Spec Coverage Trend
- **Primary spec** (`Specifications/dev-workflow-platform.md`): 0% — describes a portal/ app (feature requests, bug reports, dev cycles) that is NOT the Source/ codebase.
- **Active plans** (self-judging-workflow + dependency-linking + duplicate-deprecated-status): 62% aggregate. Self-judging-workflow is 100%; FR-DUP-* is 0%.
- Trend: **first run — baseline established**. Watch duplicate-deprecated-status for movement.

### Critical Architecture Facts
- The Source/ app is a **work-item workflow engine** (in-memory store, Express, React+Vite). Its canonical spec is `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013).
- `Specifications/dev-workflow-platform.md` describes a **different product** (the `portal/` app referenced in dependency-linking plan). It should be treated as archived/unrelated.
- Three active plan requirement files: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`, `Plans/duplicate-deprecated-status/requirements.md`.

### Traceability Enforcer Quirks
- Default run targets most-recently-modified `Plans/*/requirements.md` — currently `Plans/self-judging-workflow/requirements.md`.
- `Plans/dependency-linking/requirements.md` has false-positive FR IDs: `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085` — these are portal domain entity IDs embedded in descriptive prose, not requirement IDs. Do not treat enforcer failures on this plan as real traceability gaps without manual inspection.
- `Plans/duplicate-deprecated-status/requirements.md` has zero Source/ traces — confirmed real gap.
- To check all plans: `python3 tools/traceability-enforcer.py --plan {plan-name}` for each.

### Persistent Open Issues (P1/P2)
| ID | Finding | Status |
|----|---------|--------|
| QO-001 | `Specifications/dev-workflow-platform.md` 0% covered — describes portal/ not Source/ | OPEN |
| QO-002 | `GET /api/search` not registered in `app.ts` — DependencyPicker returns 404 | OPEN |
| QO-003 | FR-DUP-01–13 (approved plan) entirely unimplemented | OPEN |
| QO-004 | Route handlers call `workItemStore.*` directly — bypasses service layer | OPEN |
| QO-005 | Enforcer only checks most-recent plan; two approved plans invisible to default run | OPEN |

### Useful File Paths for Future Audits
- Main spec (wrong product): `Specifications/dev-workflow-platform.md`
- Active plan specs: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`, `Plans/duplicate-deprecated-status/requirements.md`
- Backend store (sole persistence layer): `Source/Backend/src/store/workItemStore.ts`
- Routes registering store directly (architecture gap): `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- Missing search route (contract documented only in tests): `Source/Backend/tests/routes/search.test.ts`
- Duplicate test files: `Source/Frontend/tests/WorkItem{Detail,List}Page.test.tsx` (root level) vs `Source/Frontend/tests/pages/WorkItem{Detail,List}Page.test.tsx`
- No OTel code anywhere in `Source/Backend/src/`

### Common Pattern Violations
- `eslint-disable react-hooks/exhaustive-deps` appears in 2 files without rationale comments.
- `DebugPortalPage.tsx` uses free-form Verifies comment (not FR-XXX format).
- `useDashboard.ts` hook has no standalone unit test.
