# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-19 — Full Audit

### Spec Coverage Trend
- **Overall plan-FR coverage: ~11%** (13 of ~119 plan FRs traced; only self-judging-workflow plan)
- **Domain spec coverage (Specifications/): 0%** — 77 Specification FRs (FR-001..089) have zero `Verifies:` in source
- Status: **declining / newly established baseline** (first audit run)

### Key File Paths (for faster future audits)
- Traceability enforcer: `tools/traceability-enforcer.py` — scans `Plans/` for most recent `requirements.md`
- All backend routes: `Source/Backend/src/routes/` (4 files: dashboard, intake, workItems, workflow)
- Service layer: `Source/Backend/src/services/` (5 services: assessment, changeHistory, dashboard, dependency, router)
- Store (in-memory): `Source/Backend/src/store/workItemStore.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Plans with requirements.md: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`, `Plans/dev-workflow-platform/`, `Plans/dev-cycle-traceability/`, `Plans/duplicate-deprecated-status/`, `Plans/image-upload/`, `Plans/orchestrated-dev-cycles/`, `Plans/orchestrator-cycle-dashboard/`

### Common Pattern Violations Found
1. **Direct store access in route handlers** — `intake.ts`, `workItems.ts`, `workflow.ts` all `import * as store from '../store/workItemStore'` bypassing service layer
2. **Traceability enforcer blind spot** — only checks the MOST RECENTLY MODIFIED `requirements.md` in Plans/; 7 plans never checked
3. **FR ID naming fragmentation** — 3 different naming conventions across plans: `FR-001` (old), `FR-dependency-types` (lowercase descriptive), `FR-WF-001` (standardized). Enforcer regex `FR-[A-Z0-9-]+` is case-sensitive (uppercase only), misses lowercase IDs
4. **Missing component tests** — `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx` have no test files

### Useful Checks for Future Runs
```bash
# Architecture: direct store access in routes (should be zero)
grep -rn "import.*store" Source/Backend/src/routes/

# Traceability per plan
python3 tools/traceability-enforcer.py --plan <plan-name>

# Components missing tests
for c in Source/Frontend/src/components/*.tsx; do
  name=$(basename "$c" .tsx)
  [ ! -f "Source/Frontend/tests/components/${name}.test.tsx" ] && echo "MISSING: $name"
done

# Verifies in production source (non-test)
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -v "/tests/\|\.test\."
```

### Findings Summary (2026-11-19)
| ID | Severity | Category | Status |
|----|----------|----------|--------|
| QO-001 | P1 | architecture-violation | OPEN — 3 route files directly access store |
| QO-002 | P1 | spec-drift | OPEN — enforcer only checks 1 of 8 plans |
| QO-003 | P2 | spec-drift | OPEN — 7 plans (106 FRs) have zero traceability |
| QO-004 | P2 | untested | OPEN — 4 frontend components have no tests |
| QO-005 | P2 | spec-drift | OPEN — FR ID naming inconsistency across plans |
| QO-006 | P3 | pattern-violation | OPEN — 2 eslint-disable suppressions in production |
