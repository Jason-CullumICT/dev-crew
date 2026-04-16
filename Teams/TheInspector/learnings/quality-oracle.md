# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-16 — Full Audit (Grade D)

### Spec Coverage Trend
- **First run** — no prior baseline.
- Effective coverage is ~21% across all three `Specifications/` docs.
- `workflow-engine.md` alone is 100% covered; `dev-workflow-platform.md` is ~13%; `tiered-merge-pipeline.md` is 0% in Source/.

### Key File Paths (faster future audits)

| Purpose | Path |
|---------|------|
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Specs directory | `Specifications/` (3 files) |
| Backend source | `Source/Backend/src/` |
| Frontend source | `Source/Frontend/src/` |
| Backend tests | `Source/Backend/tests/` |
| Frontend tests | `Source/Frontend/tests/` |
| Platform orchestrator (FR-TMP-*) | `platform/orchestrator/lib/` |
| Metrics definitions | `Source/Backend/src/metrics.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |

### Known Pattern Violations Found in This Run

1. **Enforcer blind spot** — `Specifications/` is never scanned; run with `--file Specifications/<name>.md` manually.
2. **Enforcer false extraction** — Pattern `FR-[A-Z0-9-]+` picks up seed data IDs (`FR-0003`) and template placeholders (`FR-XXX`). Add noise to MISSING count.
3. **Missing histogram** — `dependency_check_duration_ms` histogram (FR-dependency-metrics) absent from `Source/Backend/src/metrics.ts`.
4. **Frontend has no logger** — No `Source/Frontend/src/utils/logger.ts` exists. Frontend catch blocks cannot comply with the "log with full context" arch rule. Architecture rule needs a frontend-specific carve-out or a logger must be created.
5. **Duplicate test directories** — `tests/pages/*.test.tsx` files duplicate root-level `tests/*.test.tsx` for WorkItemDetailPage and WorkItemListPage.
6. **eslint-disable react-hooks/exhaustive-deps** — 2 instances in DependencyPicker.tsx and useWorkItems.ts; neither explains the specific reason.

### Common Patterns for Quick Future Checks

```bash
# Check all three specs at once
python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md 2>&1 | tail -5
python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md 2>&1 | tail -5
python3 tools/traceability-enforcer.py  # defaults to Plans/self-judging-workflow/requirements.md

# Find eslint-disable in source
grep -rn "eslint-disable" Source/ --include="*.ts" --include="*.tsx"

# Find silent catch blocks (bare or no logging)
grep -rn "catch" Source/Frontend/src --include="*.ts" --include="*.tsx" -A2 | grep -v "Verifies\|logger\|console\|rethrow\|re-throw"

# Count console.log in production source
grep -rn "console\." Source/Backend/src Source/Frontend/src --include="*.ts" --include="*.tsx"
```

### Open P1/P2 Findings to Re-Verify Next Run

| ID | Title | File | Status |
|----|-------|------|--------|
| QO-001 | Enforcer blind spot: Specifications/ not scanned | tools/traceability-enforcer.py | OPEN |
| QO-002 | dev-workflow-platform.md FR-001–069 unimplemented | Specifications/dev-workflow-platform.md | OPEN |
| QO-003 | FR-TMP-* in platform/ invisible to enforcer | tools/traceability-enforcer.py | OPEN |
| QO-004 | Missing dependencyCheckDuration histogram | Source/Backend/src/metrics.ts | OPEN |
| QO-005 | Frontend catch blocks without logging | Source/Frontend/src/ (5 files) | OPEN |
