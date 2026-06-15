# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-15 — Initial Audit

### Spec Coverage Trend
- First audit. Baseline established.
- Self-judging workflow engine (Source/): **100%** coverage
- Dependency-linking (portal/): **81%** coverage (3 open items)
- Dev workflow platform (portal/): **100%** but enforcer can't verify it

### Critical Discovery: Two-App Repository
The repo contains **two separate applications**:
- `Source/` — Self-Judging Workflow Engine implementing `Specifications/workflow-engine.md` using FR-WF-* IDs (Plans/self-judging-workflow/requirements.md)
- `portal/` — Dev Workflow Platform implementing `Specifications/dev-workflow-platform.md` using FR-001…FR-069 IDs

**The traceability enforcer only scans `Source/` and `E2E/`, not `portal/`.** This is the single most important issue to fix. Fix: add `portal/` to `source_dirs` in `tools/traceability-enforcer.py` line 71.

The `inspector.config.yml` likewise only declares `Source/` as a source directory. All inspector analysis misses the portal app.

### Traceability ID Namespaces in Use
| Namespace | Plan | App |
|-----------|------|-----|
| `FR-WF-001…013` | Plans/self-judging-workflow/ | Source/ |
| `FR-dependency-*` | Plans/dependency-linking/ | Source/ + portal/ |
| `FR-001…069` | Plans/dev-workflow-platform/ | portal/ |
| `FR-033…049` | Plans/orchestrated-dev-cycles/ | portal/ |
| `FR-050…069` | Plans/dev-cycle-traceability/ | portal/ |
| `FR-TMP-001…010` | Specifications/tiered-merge-pipeline.md | Platform (untraced) |

### Enforcer Behavior
- Default run picks `Plans/self-judging-workflow/requirements.md` when mtimes tie (lexicographic order; "self-judging-workflow" sorts last among plan dirs)
- Will always PASS on default invocation regardless of portal/ state
- Picks up false FR-IDs from requirements prose (seed item IDs, template placeholders)

### Architecture Violations Found
- `portal/Backend/src/routes/teamDispatches.ts`: Direct raw SQL queries in route handler (no service layer). Only file with this pattern — all other routes delegate to services.
- Pattern: `getDb()` called in route handlers and passed to service functions — technically a boundary crossing but consistent and low risk; the raw SQL pattern in teamDispatches is the P2 violation.

### Known Unimplemented Requirements (acknowledged in Plans/dependency-linking/requirements.md delta)
1. `FR-dependency-seed` — idempotent seed data in portal/Backend/src/database/seed.ts (file doesn't exist)
2. `FR-dependency-api-types` — `blocked_by?: string[]` missing from UpdateBugInput/UpdateFeatureRequestInput
3. `FR-dependency-frontend-tests` (partial) — DependencySection.test.tsx and BlockedBadge.test.tsx missing

### Useful File Paths for Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` (line 71: scan dirs)
- Portal app source: `portal/Backend/src/`, `portal/Frontend/src/`
- Portal tests: `portal/Backend/tests/`, `portal/Frontend/tests/`
- Spec violations: `portal/Backend/src/routes/teamDispatches.ts` (architecture + traceability)
- Untraced portal files: `portal/Frontend/src/pages/TeamsPage.tsx`, `portal/Frontend/src/components/common/RepoSelector.tsx`
- Config gap: `Teams/TheInspector/inspector.config.yml` `source.dirs` (missing portal/)
- Traceability ID mismatch: `portal/Backend/src/routes/search.ts` uses `FR-dependency-linking` not `FR-dependency-search`

### Common Patterns Observed
- Portal backend routes use `getDb()` → service(db) pattern throughout; this is consistent but technically violates "no direct DB from route handlers"
- All Source/ backend files have traceability except `vite-env.d.ts` (1-line type declaration — acceptable)
- Portal frontend has excellent traceability coverage; only two recently-added pages lack it (TeamsPage, RepoSelector)
- No hardcoded secrets found
- No console.log in production code (one test file references it in a test assertion)
- No empty catch blocks except the intentionally-documented OTel init catch
- No skipped/todo tests
