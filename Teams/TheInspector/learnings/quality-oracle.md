# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-08-28

### Spec Coverage Trend

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| `Plans/self-judging-workflow/requirements.md` (active plan) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` FR-dependency-* | 16 | 14 | **88%** (2 missing: seed, search) |
| `Specifications/dev-workflow-platform.md` FR-001 to FR-069 | ~77 | 0 | **0%** — old platform, no longer in Source/ |

### Key Findings Summary

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| QO-001 | P1 | Stale canonical spec — 77+ FRs describe a deprecated platform | OPEN |
| QO-002 | P2 | Routes directly import workItemStore (bypasses service layer) | OPEN |
| QO-003 | P2 | Traceability enforcer scope gap — does not check Specifications/ | OPEN |
| QO-004 | P2 | FR-dependency-search: /api/search endpoint not wired in app.ts | OPEN |
| QO-005 | P3 | Duplicate test files: tests/ vs tests/pages/ for WorkItemDetailPage and WorkItemListPage | OPEN |
| QO-006 | P3 | FR-dependency-seed not implemented in self-judging-workflow codebase | OPEN |
| QO-007 | P3 | 2 eslint-disable-next-line in production Frontend source | OPEN |
| QO-008 | P3 | WorkItemDetailPage.tsx approaching 500-line threshold (426 lines) | OPEN |

### Fast-Path Knowledge for Future Audits

- **Active spec for Source/**: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) — enforcer picks this up correctly
- **Dependency spec** lives in `Specifications/dev-workflow-platform.md` under `### Dependency Tracking (FR-dependency-*)` (line ~461)
- **Old platform spec** (FR-001..069, FR-033..049, FR-050..069) — no longer implemented; `Plans/dev-workflow-platform/` contains historical run reports
- **Route files that violate service-layer rule**: `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Search test documents known gap**: `Source/Backend/tests/routes/search.test.ts` — explicitly marks `/api/search` as unimplemented
- **Duplicate test pairs**: `tests/WorkItemDetailPage.test.tsx` (no Verifies) + `tests/pages/WorkItemDetailPage.test.tsx` (has Verifies)
- **All production source files have at least 1 Verifies comment** — clean coverage
- **No hardcoded secrets, no empty catch blocks, no skipped tests** found

### Common Pattern Violations Found

1. Routes bypass service layer for store CRUD (workItems, intake, workflow routes)
2. Enforcer only checks the most-recently-modified Plans/ requirements, not Specifications/
3. `eslint-disable-next-line react-hooks/exhaustive-deps` in useWorkItems.ts and DependencyPicker.tsx
