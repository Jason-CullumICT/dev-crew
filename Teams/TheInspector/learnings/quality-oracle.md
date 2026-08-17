# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-08-17

### Spec Coverage Trend
- **Enforcer-reported coverage**: 100% — but only scans 13/108 total requirements (Plans/self-judging-workflow only)
- **Real coverage**: ~99% — all three spec families implemented across Source/, portal/, platform/
- **One genuine gap**: FR-dependency-search backend route not wired to app.ts

### Codebase Architecture Map (essential for fast future audits)

| Directory | Implements | Spec Family |
|-----------|-----------|------------|
| `Source/` | Self-judging workflow engine | Plans/self-judging-workflow (FR-WF-001..013) |
| `portal/` | Dev-crew management platform | Specifications/dev-workflow-platform.md (FR-001..069 + FR-dependency-*) |
| `platform/` | Orchestrator infrastructure | Specifications/tiered-merge-pipeline.md (FR-TMP-001..010) |

### Traceability Enforcer Critical Gap (P1 — recur each audit)
- `tools/traceability-enforcer.py` scans **only** `Source/` and `E2E/` directories
- Plans/self-judging-workflow/requirements.md is the ONLY file it targets (most recently modified)
- `portal/` (95 FR traces) and `platform/` (10 FR-TMP traces) are **completely excluded**
- `spec-drift-report.json` shows 0% for FR-TMP-* — this is a known false reading (they're in platform/)
- Re-verify this finding is still open every run (it's systemic)

### FR-dependency-search Gap (P1 — OPEN)
- `GET /api/search` route is NOT registered in `Source/Backend/src/app.ts`
- Test file `Source/Backend/tests/routes/search.test.ts` explicitly documents this: "these tests will FAIL until the route is implemented"
- `Source/Frontend/src/components/DependencyPicker.tsx` calls this endpoint — typeahead search is broken in production
- Fix: create search route handler and wire to app.ts

### Silent Catch Pattern (P2 — architecture violation)
Three files in portal/Frontend/src/ use `.catch(() => {})` for repos.list() failures:
- `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- `portal/Frontend/src/components/bugs/BugDetail.tsx:82`
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`
CLAUDE.md rule: "Never swallow errors silently — every catch must log, re-throw, or document suppression."

### Recently Modified Files Without Verifies (P2)
Files modified ≤14 days ago with no `// Verifies:` comments:
- `portal/Backend/src/routes/teamDispatches.ts` — no corresponding FR in any spec
- `portal/Frontend/src/pages/TeamsPage.tsx` — no corresponding FR in any spec
- `portal/Frontend/src/components/common/RepoSelector.tsx` — no corresponding FR in any spec
These are likely scope creep that need spec entries or explicit rationale.

### FR-TMP Tagging Gaps (P2)
- `platform/orchestrator/lib/workflow-engine.js`: FR-TMP-001 (risk classification) implemented but no source-level `// Verifies: FR-TMP-001` tag (tests have it, source doesn't)
- `platform/Dockerfile.worker`: FR-TMP-008 (worker prerequisites) has wrong tag ("dev-crew unified repo — Task 3 Step 2" instead of FR-TMP-008)

### Production console.log (P3)
- `platform/orchestrator/lib/workflow-engine.js` has 113 `console.log` calls — should use structured logger per CLAUDE.md

### eslint-disable in Hooks (P3)
- `Source/Frontend/src/hooks/useWorkItems.ts:63` — suppressed react-hooks/exhaustive-deps
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — suppressed react-hooks/exhaustive-deps

### Hardcoded localhost (P3)
- `portal/Frontend/src/components/orchestrator/CycleCard.tsx:112` — hardcoded `http://localhost:${port}`

### Common Pattern Violations Found
- Naming collision in dev-workflow-platform.md: `FR-0002`..`FR-0007` appear as entity ID references inside seed data descriptions — NOT requirement IDs. Grep-based FR extraction will produce false positives.
- The `tools/traceability-enforcer.py` auto-selects the most-recently-modified requirements.md. If a new plan is created, the enforcer target shifts silently — check which plan it targets at audit start.

### Useful File Paths for Fast Audits
- Enforcer target: `Plans/self-judging-workflow/requirements.md` (as of this run)
- Portal implementation audit: `grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx" -h | grep -oP "FR-[A-Za-z0-9-]+" | sort -u`
- Platform implementation audit: `grep -rn "Verifies:" platform/ | grep -oP "FR-TMP-\d+" | sort -u`
- Recent portal changes: `git log --since="14 days ago" --name-only -- portal/`
- Silent catch check: `grep -rn "\.catch(() => {})" portal/ --include="*.ts" --include="*.tsx"`
