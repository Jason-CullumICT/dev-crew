# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-19 — Full Audit (Grade: C)

### Project Architecture Map

Two distinct product implementations exist in this repository:

| Directory | Spec | FR IDs | Enforcer Checked? |
|-----------|------|--------|-------------------|
| `Source/` | `Specifications/workflow-engine.md` via `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 + FR-dependency-* | YES |
| `portal/` | `Specifications/dev-workflow-platform.md` via multiple Plans | FR-001 to FR-095, FR-DUP-*, FR-dependency-* | NO |
| `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 | NO |

### Critical Discovery

`tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]` and always scans only the **alphabetically last** requirements.md from Plans/ (when all have equal mtime). This means:
- All 7 Plans/*/requirements.md files except `self-judging-workflow` are never enforced
- `portal/` (1,073 Verifies annotations) is outside enforcer scope entirely
- `platform/` (FR-TMP-* implementations) is outside enforcer scope

### Spec Coverage Trend

- **Enforcer scope (Source/ only):** 13/13 = **100%** ✓
- **True scope (all specs, all code dirs):** Not measurable — enforcer blindspot prevents full verification
- **FR-TMP-008**: Only gap in tiered-merge-pipeline spec; Dockerfile.worker implements it but has no `// Verifies` comment

### Fast-Path Files for Future Audits

- Specs: `Specifications/` (3 files)
- Plan requirements: `Plans/*/requirements.md` (8 files, all timestamped equally)
- Enforcer: `tools/traceability-enforcer.py:70` — `source_dirs = ["Source", "E2E"]`
- Portal tests: `portal/Backend/tests/` (15 files), `portal/Frontend/tests/` (implied)
- Source tests: `Source/Backend/tests/` (14 files), `Source/Frontend/tests/` (12 files)

### Common Pattern Violations Found

1. **Duplicate logger abstraction** — `Source/Backend/src/logger.ts` wraps `src/utils/logger.ts`; two logger entry points
2. **eslint-disable on react-hooks/exhaustive-deps** — Pattern in `DependencyPicker.tsx` and `useWorkItems.ts`
3. **Silent catch in API client** — `response.json().catch(() => ({}))` has no logging
4. **Inline domain type** — `AssessmentResult` exported from service file rather than `Source/Shared/`
5. **Test traceability ratio** — dependency.test.ts has 34 tests but only 12 Verifies: blocks (highest gap)

### Architecture Notes

- `Source/Backend` uses in-memory store (not SQLite), service layer is clean — no direct store calls from routes
- `portal/Backend` uses SQLite with better-sqlite3 — service layer enforced correctly
- Both backends use pino/custom structured loggers — no console.log in production code ✓
- No hardcoded secrets found in either codebase ✓
- All list endpoints return `{data: T[]}` wrappers ✓

### Recommendations for Next Audit

1. **Expand enforcer**: Update `inspector.config.yml` `source.dirs` to include `portal/` and `platform/`, and run enforcer for ALL requirements.md files
2. **Re-check FR-TMP-008**: Add `// Verifies: FR-TMP-008` comment to `platform/Dockerfile.worker` near the `gh` CLI installation
3. **Re-check AssessmentResult**: Confirm it's moved to `Source/Shared/types/workflow.ts` or documented as intentional
4. **Re-check eslint-disable**: Verify both hook suppressions have explanatory comments
