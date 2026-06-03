# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-06-03 — First Full Run

### Spec Coverage Trend
- **Self-judging workflow engine** (FR-WF-001 to FR-WF-013): 100% ✅ — all traced in `Source/`
- **Dev-workflow-platform** (FR-001 to FR-069, FR-DUP-01 to FR-DUP-13, FR-070+): ~97% — implemented in `portal/` but invisible to enforcer
- **Tiered merge pipeline** (FR-TMP-001 to FR-TMP-010): 0% ❌ — completely unimplemented
- **Dependency linking** (FR-dependency-* × 16): 81% — 3 open gaps

### Critical Path Discovery
- The repo has **two separate source apps**: `Source/` (self-judging workflow engine, ~FR-WF-*) and `portal/` (dev-workflow-platform app, FR-001 to FR-095+). They are entirely separate codebases with separate test suites.
- The traceability enforcer (`tools/traceability-enforcer.py`) **only scans `Source/` and `E2E/`** — completely blind to `portal/`. This means CI never validates FR-001 to FR-069 traceability.
- The enforcer auto-selects the most recently modified `Plans/*/requirements.md`, which will vary by run and produce inconsistent CI results.
- `Specifications/` is the canonical truth; `Plans/` requirements.md files are derivative. The enforcer targets Plans, not Specifications — a long-term drift risk.

### Known P1/P2 Open Findings (first audit)
| ID | FR | Location | Status |
|----|-----|----------|--------|
| QO-001 | Enforcer blind spot | tools/traceability-enforcer.py | OPEN P1 |
| QO-002 | FR-TMP-001..010 unimplemented | entire codebase | OPEN P1 |
| QO-003 | FR-dependency-api-types missing `blocked_by` | portal/Shared/api.ts:32,59 | OPEN P2 |
| QO-004 | FR-dependency-frontend-tests missing test files | portal/Frontend/tests/ | OPEN P2 |
| QO-005 | FR-dependency-seed: no seed.ts | portal/Backend/src/database/ | OPEN P2 |
| QO-006 | Source/metrics.ts missing dependencyCheckDuration histogram | Source/Backend/src/metrics.ts | OPEN P2 |

### Useful File Paths
- Spec traceability check: `python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md`
- Portal Verifies grep: `grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx"`
- All FR IDs in use: `grep -rn "Verifies:" portal/ Source/ --include="*.ts" --include="*.tsx" | grep -oP "FR-[A-Za-z0-9-]+" | sort -u`
- Traceability enforcer has false-positive risk for requirements files that reference seed data IDs (FR-0004 format) — the regex `FR-[A-Z0-9-]+` matches data IDs, not just requirement IDs.

### Pattern Violations Found
- Empty catch blocks in portal/Frontend production code (3 locations) — architecture rule violation
- `as any` casts in portal/Frontend DependencyPicker.tsx (2 lines, lines 291/293) — type safety bypass
- Duplicate test files in Source/Frontend: WorkItemListPage and WorkItemDetailPage each have two test files covering the same FRs

### Architecture Observations
- `FR-dependency-*` requirements are implemented twice: once in `Source/` (workflow engine) and once in `portal/` (dev-workflow-platform). Both use the same FR ID namespace. No spec coordination between the two implementations.
- Large production files approaching split threshold: FeatureRequestDetail.tsx (550), BugDetail.tsx (546), cycleService.ts (526), portal/Frontend/api/client.ts (525), featureRequestService.ts (506).
