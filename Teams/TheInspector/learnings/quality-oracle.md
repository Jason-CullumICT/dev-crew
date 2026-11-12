# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit History

| Date | Grade | Spec Coverage | P1s | P2s | P3s |
|------|-------|--------------|-----|-----|-----|
| 2026-11-12 | D | 26% (29/111 FRs) | 2 | 3 | 2 |

---

## Key Structural Facts (fast future audits)

### Project Architecture
- **Source/ app**: WorkItem-based in-memory workflow engine. Implements FR-WF-001 to FR-WF-013 and FR-dependency-* specs.
- **NOT implemented in Source/**: The portal app (FeatureRequests, BugReports, DevelopmentCycles, Tickets with SQLite). That app is described in `Specifications/dev-workflow-platform.md` FR-001 to FR-069 — it was a predecessor/parallel project.
- **Plans/dependency-linking/**: ORPHANED PLAN. References `portal/Backend`, `portal/Frontend` paths that don't exist here. The dependency feature IS implemented in Source/ under FR-dependency-* IDs, not under this plan's FR-0002/etc. IDs.

### Traceability Enforcer Limitation (CRITICAL)
- `tools/traceability-enforcer.py` auto-detects the most recently modified `Plans/*/requirements.md`
- As of 2026-11-12, this means it only checks `Plans/self-judging-workflow/requirements.md` (13 FRs → PASS)
- It NEVER checks: `Plans/dependency-linking/requirements.md` (would FAIL: 7 missing), `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`
- To run against a specific plan: `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md`

### FR ID Namespaces
| Namespace | Location | Status |
|---|---|---|
| FR-WF-001 to FR-WF-013 | Plans/self-judging-workflow/requirements.md | IMPLEMENTED in Source/ ✓ |
| FR-dependency-* | Specifications/dev-workflow-platform.md (lines 461-482), Plans/dependency-linking/ | IMPLEMENTED in Source/ ✓ |
| FR-001 to FR-069 | Specifications/dev-workflow-platform.md | NOT implemented — describes portal app |
| FR-TMP-001 to FR-TMP-010, FR-1 to FR-3 | Specifications/tiered-merge-pipeline.md | NOT implemented — planned pipeline extension |
| FR-0002, FR-0003, FR-0004, FR-0005, FR-0007 | Plans/dependency-linking/requirements.md | Portal-specific — not applicable to Source/ |

### Architecture Violation (P1 — OPEN)
- `Source/Backend/src/routes/workflow.ts`, `workItems.ts`, `intake.ts` all directly `import * as store from '../store/workItemStore'`
- Violates CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer"
- workflow.ts is the worst offender (12 direct store calls)
- Dashboard routes are correctly architected (call services/dashboard.ts)

### Source Layout for Fast Grep
- Verifies: comments in Source/: `grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"`
- Route files: `Source/Backend/src/routes/` — dashboard.ts, intake.ts, workItems.ts, workflow.ts
- Service files: `Source/Backend/src/services/` — assessment.ts, changeHistory.ts, dashboard.ts, dependency.ts, router.ts
- All Prometheus metrics defined in: `Source/Backend/src/metrics.ts`
- Test dirs: `Source/Backend/tests/routes/`, `Source/Backend/tests/services/`, `Source/Frontend/tests/`

### Spec Coverage Trend
- 2026-11-12: 26% — establishing baseline. Low due to orphaned platform spec.
- Expected improvement path: Update dev-workflow-platform.md to reflect current app → coverage jumps to ~69% for in-scope FRs.

---

## Common Patterns Found

1. **Verifies: comments pattern**: Files start with `// Verifies: FR-WF-XXX — description` at line 1 for file-level tracing, with inline `// Verifies:` per function/block. This is well-adopted in services and shared types, partially adopted in routes, weak in some test files.

2. **Console.log**: Clean. The logger abstraction (`Source/Backend/src/logger.ts`) is correctly used. No production console.log found.

3. **Error handling**: Routes use try/catch with `logger.error` and re-throw as HTTP 500 responses. Catch blocks are not empty.

4. **eslint-disable**: Only 2 occurrences (`react-hooks/exhaustive-deps` in useWorkItems.ts:63 and DependencyPicker.tsx:82). Both lack explanatory comments.

5. **File sizes**: Well-contained. No file exceeds 430 lines. No splitting needed.

---

## Useful Commands for Next Run

```bash
# Re-verify QO-001 (architecture violation)
grep -rn "import.*store.*workItemStore" Source/Backend/src/routes/ --include="*.ts"

# Re-verify QO-002 (enforcer blind spot) 
python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md

# Check new eslint-disable additions
grep -rn "eslint-disable" Source/ --include="*.ts" --include="*.tsx" | grep -v ".test."

# Full spec coverage count
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -oE "FR-[A-Za-z0-9-]+" | sort -u | wc -l
```
