# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-17 — Full Audit

### Project Layout (critical for fast future audits)

This project has **three separate implementation directories**, each serving a different spec:

| Directory | Spec | FR IDs | Notes |
|-----------|------|--------|-------|
| `Source/` | `Specifications/workflow-engine.md` | FR-WF-001–FR-WF-013 | In-memory work item store, no DB |
| `portal/` | `Specifications/dev-workflow-platform.md` | FR-001–FR-095, FR-DUP-*, FR-dependency-* | SQLite backend, full UI |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–FR-TMP-010 | Orchestrator infrastructure |

**Do NOT conflate Source/ and portal/ — they are separate apps.**

### Traceability Enforcer Limitation (P1 — QO-001)

- `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`
- It never scans `portal/` or `platform/`
- Running it with `--plan dev-workflow-platform` or `--plan dependency-linking` produces **false TRACEABILITY FAILURE** (portal/ has all the implementations)
- Default run auto-selects `Plans/self-judging-workflow/requirements.md` (most recently modified) — this gives a false all-green that masks open gaps in portal/

### Open Gaps as of 2026-06-17

| FR ID | Status | Location |
|-------|--------|----------|
| FR-dependency-api-types | OPEN | `portal/Shared/api.ts` missing `blocked_by` |
| FR-dependency-seed | OPEN | `portal/Backend/src/database/seed.ts` does not exist |
| FR-dependency-frontend-tests | OPEN | DependencySection.test.tsx and BlockedBadge.test.tsx missing |
| FR-TMP-008 | UNVERIFIED | platform/ has no `// Verifies: FR-TMP-008` anywhere |
| FR-DUP-06 | UNTRACED | Detail endpoints may be correct but no traceability comment |

### Malformed IDs

- `portal/Frontend/src/components/shared/DependencySection.tsx` and `client.ts` use `// Verifies: FR-0001` — this ID doesn't exist in any spec. Should be `FR-dependency-section` / `FR-dependency-search`.

### Spec Coverage Trend

- First audit — no baseline to compare against
- Starting coverage: ~95% (strong)
- Main risk: enforcer blind spot means gaps can silently accumulate in portal/ without being caught by CI verification gates

### Useful File Paths for Future Audits

| File | Why it matters |
|------|---------------|
| `tools/traceability-enforcer.py:78` | The `source_dirs` list that needs portal/ and platform/ added |
| `Plans/dependency-linking/requirements.md` | Implementation Delta section tracks portal/ open items explicitly |
| `Plans/dev-workflow-platform/requirements.md` | FR-001–FR-032 definitions with weights |
| `portal/Frontend/tests/` | 16 test files — check for missing component tests here |
| `portal/Backend/src/database/` | Seed.ts missing here |
| `spec-drift-report.json` (repo root) | Orphan artifact — delete or move to findings/ |

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` used without rationale comment (3 files) — minor but violates "never swallow errors silently" spirit
- 5 portal/ files exceed 500-line threshold; cycleService.ts (526 lines) is the best split candidate
- No requirements.md in Plans/tiered-merge-pipeline/ — prevents targeted enforcement of FR-TMP-*

### Architecture Health

- **Clean**: No console.log in production anywhere, no direct DB calls from routes, no hardcoded secrets, structured logging everywhere, service layer properly separating concerns
- **Clean**: No empty catch blocks found across all directories
- All list endpoints return `{data: T[]}` wrappers (sampled)
