# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run 1 — 2026-08-03 (Grade: C)

### Architecture of the Repository

Two separate applications coexist in the repo:

| App | Root Dir | Spec | FR namespace |
|-----|----------|------|-------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` (prose, no FR-IDs) + `Plans/self-judging-workflow/requirements.md` | `FR-WF-001..013` |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001..069 + FR-dependency-*` |

**Critical**: The traceability enforcer scans `["Source", "E2E"]` only. `portal/` is never checked. Always run a separate enforcer pass for portal/ when auditing the dev-workflow-platform spec.

### Useful Fast-Access Paths

| What | Where |
|------|-------|
| FR-WF-* requirements | `Plans/self-judging-workflow/requirements.md` |
| FR-001–069 requirements | `Specifications/dev-workflow-platform.md:337–459` |
| FR-dependency-* requirements | `Plans/dependency-linking/requirements.md` + `Specifications/dev-workflow-platform.md:461–482` |
| Enforcer config | `tools/traceability-enforcer.py` (line 66: scan dirs hardcoded) |
| Source backend routes | `Source/Backend/src/routes/` (4 files) |
| Source test dirs | `Source/Backend/tests/` + `Source/Frontend/tests/` |
| Portal routes | `portal/Backend/src/routes/` |

### Recurring Issues to Re-Verify Next Run

| Finding | File | Status |
|---------|------|--------|
| QO-001: `GET /api/search` not registered in app.ts | `Source/Backend/src/app.ts` | OPEN — 5 tests fail |
| QO-002: Routes bypass service layer (import store directly) | `src/routes/workItems.ts`, `workflow.ts`, `intake.ts` | OPEN |
| QO-003: Enforcer never scans portal/ | `tools/traceability-enforcer.py` | OPEN |
| QO-004: Duplicate test files (WorkItemDetailPage + WorkItemListPage) | `tests/` vs `tests/pages/` | OPEN |
| QO-005: Dual logger modules | `src/logger.ts` + `src/utils/logger.ts` | OPEN |
| QO-006: Logger ignores LOG_LEVEL/NODE_ENV | `src/utils/logger.ts` | OPEN |

### Common Pattern Violations Observed

1. **Routes as service layers** — `workflow.ts` (374 lines) contains approve/reject/dispatch business logic including direct `buildChangeEntry` calls and `item.changeHistory.push()` mutations. Target for extraction to `workflowService.ts`.
2. **Spec prose without FR-IDs** — `workflow-engine.md` is well-written but has no formal FR identifiers. Spec coverage measurement relies entirely on `Plans/` for this app.
3. **Unimplemented tests as documentation** — The search.test.ts pattern (write-test-to-document-gap) surfaces intent but breaks CI. Recommend a quarantine dir if intentional deferral.

### Spec Coverage Trend

| Date | Enforced Coverage | Grade |
|------|------------------|-------|
| 2026-08-03 | 95% (Source/ workflow engine) | C |

### Quick Grep Patterns for Next Run

```bash
# Find all source files with 0 Verifies comments (recently modified)
git log --since="14 days ago" --name-only --pretty="" | sort -u | xargs grep -rL "Verifies:" 2>/dev/null

# Confirm search route still missing
grep -n "search" Source/Backend/src/app.ts

# Confirm duplicate tests still exist
ls Source/Frontend/tests/pages/ Source/Frontend/tests/*.test.tsx 2>/dev/null

# Check logger split
grep -rn "from.*utils/logger\|from.*['\"]../logger" Source/Backend/src/ | grep -v node_modules
```
