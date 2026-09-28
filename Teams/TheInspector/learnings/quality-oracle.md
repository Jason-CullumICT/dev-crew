# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-09-28

### Spec Coverage Trend
- **First audit — baseline: 24.8%** (28/113 requirements traced)
- Well below Grade A threshold (80%) and Grade B threshold (60%)
- Grade: **D** (spec coverage < 40%)

### Specification Landscape
Three spec files, three different systems:
| Spec File | FR ID Format | Count | Implementation Status |
|-----------|-------------|-------|----------------------|
| `Specifications/workflow-engine.md` (via Plans) | FR-WF-001..013 | 13 | ✅ 100% — tracked by enforcer |
| `Specifications/dev-workflow-platform.md` | FR-001..069 (numeric) + FR-dependency-* | 90 | ❌ FR-XXX 0%; FR-dependency ~94% |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001..010 | 10 | ❌ 0% — no implementation |

### Key Discovery: Traceability Enforcer Blind Spot
`tools/traceability-enforcer.py` only reads the most-recently-modified `Plans/*/requirements.md`.
It currently checks ONLY `Plans/self-judging-workflow/requirements.md` (13 FR-WF IDs).
It **never scans** Specifications/ directly — missing 100 of 113 total requirements.

### Architecture Violation: Routes Bypass Service Layer
Three route files directly import from `store/workItemStore`:
- `Source/Backend/src/routes/workItems.ts:12`
- `Source/Backend/src/routes/workflow.ts:15`
- `Source/Backend/src/routes/intake.ts:4`
CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer."
Services exist (assessment.ts, router.ts, changeHistory.ts, dependency.ts) but workItems and workflow routes skip them.

### Common Patterns in Source
- All production source files modified within 14 days — project is fresh/active
- No console.log in production source (good)
- No empty catch blocks detected
- No skipped/todo tests
- 2 eslint-disable-next-line in frontend production code

### Useful Paths for Future Audits
- Spec FR IDs: `Specifications/*.md`
- Traceability tool: `tools/traceability-enforcer.py`
- Plans requirements: `Plans/self-judging-workflow/requirements.md` (13 FR-WF)
- Route files to watch: `Source/Backend/src/routes/`
- Service layer: `Source/Backend/src/services/`
- Store layer: `Source/Backend/src/store/workItemStore.ts`
- Unimplemented specs live in: `Specifications/dev-workflow-platform.md` (FR-001..069) and `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010)

### FR-dependency-seed: Only Unimplemented FR-dependency Requirement
All 16 FR-dependency-* requirements are implemented EXCEPT `FR-dependency-seed` (no seed data in Source/).

## Learnings

- Traceability enforcer scope is plan-centric, not spec-centric — must explicitly point it at Specifications/ to catch drift there.
- The three spec files represent three systems; only one is currently in `Source/`. The others may be intended for `portal/` or `platform/`.
- Direct store imports in route handlers are a persistent anti-pattern to watch — grep `from '../store/workItemStore'` in routes/ as a quick check.
- All test files have Verifies: comments, which is good discipline.
- ESLint exhaustive-deps suppressions in hooks/components are a minor but recurring smell.
