# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-08-10 — Full Audit

### Spec Coverage Trend

| Run | Date | Enforcer Scope | Estimated True Coverage |
|-----|------|---------------|------------------------|
| 1   | 2026-08-10 | 12% (13/108 reqs) | ~91% |

Coverage is **artificially high** because the enforcer never checks portal/ or platform/.

---

### Critical Structural Facts

**Three separate codebases, three requirement domains:**

| Codebase | Spec Source | FR Format | Enforcer Checks? |
|----------|------------|-----------|-----------------|
| `Source/` | Plans/self-judging-workflow/requirements.md | FR-WF-001 to FR-WF-013 | ✅ Yes |
| `portal/` | Specifications/dev-workflow-platform.md | FR-001 to FR-069, FR-dependency-*, FR-DUP-* | ❌ No |
| `platform/orchestrator/` | Specifications/tiered-merge-pipeline.md | FR-TMP-001 to FR-TMP-010 | ❌ No |

**Root cause of enforcer gap:** `tools/traceability-enforcer.py` line 70 hardcodes `source_dirs = ["Source", "E2E"]`.

---

### Fast-Lookup Paths for Future Audits

- Spec files: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Plans with requirements: `Plans/*/requirements.md` (8 files, all same mtime — cannot trust auto-select)
- portal/ Verifies comments: 1073 occurrences across 107 files (as of 2026-08-10)
- platform/ Verifies comments: grep `platform/orchestrator/` for FR-TMP-*
- Large files: cycleService.ts (526L), featureRequestService.ts (506L), workflow.ts (374L)
- No console.log in Source/Backend/src or portal/Backend/src or portal/Frontend/src
- No empty catch blocks in Source/ or portal/

---

### Common Pattern Violations Found

1. **eslint-disable-next-line react-hooks/exhaustive-deps** — 3 locations: DependencyPicker.tsx:82, useWorkItems.ts:63, useApi.ts:35
2. **eslint-disable @typescript-eslint/no-unused-vars** — 1 location: errorHandler.ts:21 (idiomatic Express pattern, acceptable)

---

### Open Findings (P1/P2)

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| QO-001 | P1 | OPEN | Enforcer never scans portal/ or platform/ |
| QO-002 | P1 | OPEN | Nondeterministic default plan selection (all mtimes equal) |
| QO-003 | P2 | OPEN | `blocked_by` missing from UpdateBugInput/UpdateFeatureRequestInput in portal/Shared/api.ts |
| QO-004 | P2 | OPEN | portal/Backend/src/database/seed.ts does not exist |
| QO-005 | P2 | OPEN | DependencySection.test.tsx and BlockedBadge.test.tsx missing |
| QO-006 | P2 | OPEN | FR-TMP-006/008/010 have no Verifies comments; platform/ outside enforcer scope |

---

### Useful Grep Commands

```bash
# Count Verifies comments in portal/
grep -r "Verifies: FR-" portal/ --include="*.ts" --include="*.tsx" -l | wc -l

# Run enforcer for specific plan
python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md

# Check FR-TMP coverage in platform/
grep -r "FR-TMP" platform/ | grep "Verifies"

# Find console.log in production source (not tests)
grep -r "console\." Source/Backend/src portal/Backend/src --include="*.ts"

# Find empty catch blocks
grep -rn "catch.*{[[:space:]]*}" Source/ portal/ --include="*.ts"

# Find large files
find Source/ portal/Backend/src -name "*.ts" | xargs wc -l | sort -rn | head -15
```
