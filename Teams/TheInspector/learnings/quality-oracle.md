# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-13 — First full audit

### Architecture Map (critical for future runs)

The repository has **three distinct applications** mapped to three specs:

| Spec | Implementation Dir | FR IDs |
|------|-------------------|--------|
| `Specifications/workflow-engine.md` | `Source/` | FR-WF-001 to FR-WF-013 |
| `Specifications/dev-workflow-platform.md` | `portal/` | FR-001 to FR-069, FR-dependency-* |
| `Specifications/tiered-merge-pipeline.md` | `platform/` (orchestrator) | FR-TMP-001 to FR-TMP-010 |

**Never run the traceability enforcer against dev-workflow-platform.md targeting Source/ — they are different applications.**

### Traceability Enforcer Behavior

- `python3 tools/traceability-enforcer.py` auto-picks the most recently modified `requirements.md` under `Plans/`
- As of this run, it targets `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013)
- It scans `Source/` and `E2E/` — correct for the workflow engine
- **Does NOT scan `portal/` for FR-001 to FR-069** — this is the main enforcement gap
- Running `--file Specifications/dev-workflow-platform.md` produces 76 false failures because those FRs live in portal/

### Key File Paths for Future Audits

- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-*)
- Dependency plan: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Duplicate logger: `Source/Backend/src/logger.ts` wraps `Source/Backend/src/utils/logger.ts`
- Duplicate tests: `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` (same page, ~39 test cases total)
- Open portal plan delta: `Plans/dependency-linking/requirements.md` — FR-dependency-api-types, FR-dependency-seed still missing in portal/

### Spec Coverage Trend

| Run | Active Plan Coverage | Notes |
|-----|---------------------|-------|
| 2026-05-13 | 100% (13/13 FR-WF-*) | First audit; dependency-* all traced; portal/ not scanned |

### Common Pattern Violations Found

- Duplicate logger abstraction in backend (compatibility shim pattern)
- Duplicate frontend test files for same pages (two agent runs with no deduplication)
- `eslint-disable` for `react-hooks/exhaustive-deps` in two production files
- Implementation-location drift: FR-dependency-frontend-tests created in Source/Frontend/ instead of portal/Frontend/

### Useful Grep Commands

```bash
# Verify workflow engine coverage
python3 tools/traceability-enforcer.py --plan self-judging-workflow

# Check dependency plan coverage
python3 tools/traceability-enforcer.py --plan dependency-linking

# Find all Verifies comments in Source
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"

# Find recently modified source files
git log --since="14 days ago" --name-only --pretty=format:"" | grep "^Source/" | sort -u
```
