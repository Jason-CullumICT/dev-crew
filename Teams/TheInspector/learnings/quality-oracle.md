# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-08-08 — Initial Full Audit

### Architecture Overview
This project has **two parallel application stacks**:
- **`Source/`** — Self-Judging Workflow Engine (in-memory, FR-WF-* IDs, traces to `Plans/self-judging-workflow/`)
- **`portal/`** — Development Workflow Platform (SQLite, FR-001..FR-095+, traces to `Specifications/dev-workflow-platform.md`)

The traceability enforcer (`tools/traceability-enforcer.py`) hardcodes `source_dirs = ["Source", "E2E"]` and never scans `portal/`. This creates a systematic blind spot.

### Spec Coverage Baseline
| Spec | Total FRs | Covered in Code | Enforcer Passes? |
|------|-----------|-----------------|------------------|
| workflow-engine.md / Plans/self-judging-workflow | FR-WF-001..013 (13) | 13/13 (100%) | ✅ Yes |
| dev-workflow-platform.md FR-001..FR-069 | 69 | 69/69 (100% in portal/) | ❌ Enforcer blind |
| Plans/duplicate-deprecated-status FR-DUP-* | 13 | 12/13 (92%) | ❌ Enforcer blind |
| tiered-merge-pipeline.md FR-TMP-* | 10 | 9/10 (90%) | ❌ Enforcer blind |

### Known Open P2 Findings (as of 2026-08-08)
1. **Traceability enforcer doesn't scan portal/** — gives false-passing signal for 70+ FRs
2. **Direct DB calls in portal/Backend/src/routes/teamDispatches.ts** — architecture rule violation

### Known Open P3 Findings (as of 2026-08-08)
3. **FR-DUP-06 has no Verifies comment** anywhere in codebase
4. **FR-TMP-008 has no Verifies comment** anywhere in codebase
5. **Five files exceed 500-line threshold** (see QO-005)
6. **Duplicate WorkItemDetailPage test files** in Source/Frontend/tests/

### Useful File Paths for Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` (line ~60: `source_dirs = ["Source", "E2E"]`)
- Portal FR coverage: `portal/` — scan with `grep -rn "Verifies:" portal/`
- Architecture violation: `portal/Backend/src/routes/teamDispatches.ts` (lines 37-72)
- Duplicate test: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` used in 2 frontend files without documented justification
- Wrapper logger (`src/logger.ts`) duplicates abstraction from `src/utils/logger.ts`

### Spec Coverage Trend
- First audit; baseline established above. Next audit should confirm enforcer is patched to scan `portal/`.
