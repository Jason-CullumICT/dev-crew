# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-08 — Full Audit

### Spec Coverage Trend
- **First run baseline**: 0% coverage against `Specifications/` (77 FRs, 0 traced)
- Enforcer passes on 13 FRs (Plans/self-judging-workflow) but is blind to Specifications/

### Critical Structural Issue: Two Disconnected Requirement Namespaces
The project has **two independent requirement systems** with no connection:

| System | Location | ID Format | FR Count | Enforcer Checks? |
|--------|----------|-----------|----------|------------------|
| Domain Specifications | `Specifications/dev-workflow-platform.md` | `FR-001`–`FR-069` | 77 | ❌ No |
| Plan Requirements | `Plans/self-judging-workflow/requirements.md` | `FR-WF-001`–`FR-WF-013` | 13 | ✅ Yes |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Plans/*/requirements.md`
(most recently modified). Running it always reports "PASSED" regardless of Specifications/ coverage.

### Architecture Violation Pattern
Routes bypass service layer — this is pervasive (3 of 4 route files):
- `routes/workflow.ts` — imports `workItemStore` directly, 10 direct store calls
- `routes/workItems.ts` — imports `workItemStore` directly, 4+ direct store calls
- `routes/intake.ts` — imports `workItemStore` directly, creates items in route handler

Only `routes/dashboard.ts` correctly uses `dashboardService`. This is a P1 architecture rule violation.

### Spec Drift: dev-workflow-platform.md is Superseded
`Specifications/dev-workflow-platform.md` describes a *different system* (feature requests,
bug reports, dev cycles, CI/CD, AI voting) that was previously implemented and then replaced
by the self-judging workflow engine. Historical evidence in `Plans/dev-workflow-platform/`
traceability reports confirms the old system once existed. The spec was never archived/updated.

### Fast Audit Paths for Next Run
- FR IDs in Specifications: `grep -rn "FR-[0-9]\+" Specifications/ | grep -oP "FR-\d+" | sort -u`
- FR IDs in Source Verifies: `grep -rn "Verifies:.*FR-" Source/ | grep -oP "FR-[A-Za-z0-9-]+" | sort -u`
- Traceability enforcer: `python3 tools/traceability-enforcer.py` (Plans-scoped only)
- Direct store imports in routes: `grep -rn "import.*store" Source/Backend/src/routes/`
- eslint-disable in production: `grep -rn "eslint-disable" Source/ --include="*.ts" --include="*.tsx" | grep -v ".test."`

### Common Pattern Violations Found
1. eslint-disable-next-line react-hooks/exhaustive-deps without justification comment (2 occurrences)
2. Routes bypass service layer (structural, not isolated)
3. Non-standard Verifies format in DebugPortalPage (no FR-XXX ID)

### Key File Paths for Future Audits
- Main spec: `Specifications/dev-workflow-platform.md` (482 lines, 85 FR rows)
- Plan requirements: `Plans/self-judging-workflow/requirements.md` (13 FRs, enforcer target)
- Traceability enforcer: `tools/traceability-enforcer.py`
- Inspector config: `Teams/TheInspector/inspector.config.yml`
- Route files: `Source/Backend/src/routes/` (4 files; workflow.ts is 374 lines)
- Service files: `Source/Backend/src/services/` (assessment, router, dashboard, dependency, changeHistory)
- Store: `Source/Backend/src/store/workItemStore.ts`
