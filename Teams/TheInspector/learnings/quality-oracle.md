# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-07-10 (Initial Full Audit)

### Spec Coverage Trend

**Overall: ~13% (D grade)**

| Requirements Source | Total FRs | Traced in Source/ | Coverage |
|---------------------|-----------|-------------------|----------|
| Specifications/dev-workflow-platform.md | 74 | 0 | 0% |
| Plans/self-judging-workflow/requirements.md | 13 | 13 | 100% |
| Plans/dependency-linking/requirements.md | 7 (legacy format) | 0 via enforcer | 0% (implemented as FR-dependency-* style) |
| Plans/dev-workflow-platform/requirements.md | 34 | 0 | 0% |
| Plans/dev-cycle-traceability/requirements.md | 21 | 0 | 0% |
| Plans/duplicate-deprecated-status/requirements.md | 15 | 0 | 0% |
| Plans/image-upload/requirements.md | 21 | 0 | 0% |
| Plans/orchestrated-dev-cycles/requirements.md | 18 | 0 | 0% |
| Plans/orchestrator-cycle-dashboard/requirements.md | 8 | 0 | 0% |

The traceability enforcer defaults to **most-recently-modified** requirements.md, which is currently `Plans/self-judging-workflow/requirements.md`. This causes the CI gate to report PASSED while 34+ plan requirements and 74 spec requirements are completely untraced.

### Architecture Context (important for future audits)

The project has TWO systems in play:
1. **Implemented in Source/**: Self-judging workflow engine (Work Items, in-memory store) per Plans/self-judging-workflow/
2. **Unimplemented**: Full feature-request/bug-report/dev-cycle platform per Plans/dev-workflow-platform/ and Specifications/dev-workflow-platform.md (portal/ system, was a separate build)

The Plans/dependency-linking requirements were originally written for a `portal/` directory system. The actual implementation was done in `Source/` using FR-dependency-* traceability IDs instead. The requirements file still references portal/ paths and the legacy FR-0002..FR-0007 numbering, making the traceability enforcer fail for dependency-linking even though the features are implemented.

### Common Pattern Violations Found

1. **Routes import store directly** — workItems.ts, workflow.ts, intake.ts all call `store.*` from route handlers, bypassing the service layer. Architecture rule violation.
2. **No OpenTelemetry** — CLAUDE.md mandates OTel but there are zero OTel imports in Source/Backend/
3. **Dual logger files** — src/logger.ts is a compatibility wrapper around src/utils/logger.ts. Confusing but functional.
4. **Duplicate test files** — WorkItemDetailPage and WorkItemListPage each have two test files (root tests/ and tests/pages/). Both are picked up by vitest.
5. **eslint-disable suppressions** — DependencyPicker.tsx:82 and hooks/useWorkItems.ts:63 suppress react-hooks/exhaustive-deps without documented justification.
6. **Non-conformant Verifies ID** — DebugPortalPage uses `// Verifies: dev-crew debug portal` (not FR-XXX format).

### Useful File Paths for Future Audits

- Traceability enforcer: `tools/traceability-enforcer.py` — run with `--file Plans/X/requirements.md` to target specific plans
- Active requirements: `Plans/self-judging-workflow/requirements.md` (implemented)
- All spec requirements: `Specifications/dev-workflow-platform.md` (unimplemented)
- Service layer: `Source/Backend/src/services/` — router.ts, assessment.ts, dependency.ts, changeHistory.ts, dashboard.ts
- Store (persistence layer): `Source/Backend/src/store/workItemStore.ts`
- Routes directly calling store: `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`
- Duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
