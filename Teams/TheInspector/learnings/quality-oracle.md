# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-06-14 — First Full Audit

#### Project Architecture: Two Applications
This repo contains **two separate applications**, not one:
- **`Source/`** — Self-Judging Workflow Engine (in-memory store, FR-WF-001–013)
- **`portal/`** — Dev Workflow Platform (SQLite, FR-001–069 + FR-071–088)

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, completely missing `portal/`. Running the enforcer against any portal-scoped plan (e.g., `Plans/dev-workflow-platform/requirements.md`) produces 100% false-negative failures. This is a critical tool gap — always manually verify portal coverage.

#### Active Requirements File
The enforcer defaults to the most recently modified `requirements.md` in `Plans/`. As of this audit that is `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013). When auditing portal plans, always pass `--file` explicitly.

#### Key File Paths for Fast Future Audits
- Spec files: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Plans with requirements.md: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`, `Plans/dev-workflow-platform/`, `Plans/dev-cycle-traceability/`
- Portal backend services: `portal/Backend/src/services/` (15 services)
- Portal backend tests: `portal/Backend/tests/` (15 test files)
- Portal frontend tests: `portal/Frontend/tests/` (15 test files)
- Source backend tests: `Source/Backend/tests/` (11 test files)

#### Known Open Issues (as of 2026-06-14)
| ID | Severity | Summary |
|----|----------|---------|
| QO-001 | P1 | `portal/Backend/src/routes/teamDispatches.ts` — raw SQL in route handler, no service layer |
| QO-002 | P2 | Traceability enforcer doesn't scan `portal/` — all portal FRs appear missing |
| QO-003 | P2 | `portal/Shared/api.ts` — `UpdateFeatureRequestInput` and `UpdateBugInput` missing `blocked_by?: string[]` |
| QO-004 | P2 | `portal/Backend/src/database/seed.ts` — seed script absent (FR-dependency-seed) |
| QO-005 | P2 | `portal/Frontend/tests/` — DependencySection.test.tsx and BlockedBadge.test.tsx absent |
| QO-006 | P3 | `Source/Backend/src/routes/` — three route files import store directly (no service wrapper) |
| QO-007 | P3 | `Specifications/tiered-merge-pipeline.md` FR-TMP-001–010 — zero implementation traceability |
| QO-008 | P3 | `Plans/dependency-linking/requirements.md` implementation delta table is stale |

#### Pattern: Portal Uses Service Layer Correctly (Mostly)
All portal routes correctly delegate to `portal/Backend/src/services/` — except `teamDispatches.ts`. The pattern to check: does the route import `getDb` AND call `.prepare()` directly? If yes, it's a violation.

#### Spec Coverage Trend
- First audit: ~85% (95/111 traced FRs in active plans)
- FR-TMP series is deliberately unstarted (no requirements.md in Plans/tiered-merge-pipeline/)
- Portal coverage is high (~96%) once the tool gap is accounted for

#### Useful grep patterns
```bash
# Find all Verifies comments in portal/
grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx"

# Find direct SQL in routes
grep -rn "\.prepare\|\.all\b\|\.run\b" portal/Backend/src/routes/ --include="*.ts"

# Check enforcer against specific plan
python3 tools/traceability-enforcer.py --file Plans/<plan>/requirements.md
```
