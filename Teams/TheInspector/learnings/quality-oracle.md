# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-29 — Full Audit

### Spec Coverage Trend

| Plan / Spec | Requirements | Traced | Coverage |
|-------------|-------------|--------|----------|
| `Plans/self-judging-workflow` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001 – FR-069) | 69 | 69 | **100%** |
| `Plans/dependency-linking` (FR-dependency-*) | 16 | 14 | **87.5%** |
| `Plans/duplicate-deprecated-status` (FR-DUP-*) | 13 | 13 | **100%** |
| `Plans/image-upload` (FR-070 – FR-089) | 20 | 20 | **100%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | **0%** |
| **Aggregate** | **141** | **129** | **91%** |

### Critical Pattern Violations Found

1. **Traceability enforcer is blind to `portal/`** — enforcer only scans `Source/` and `E2E/`, entirely missing the portal/ codebase which implements the main dev-workflow-platform spec.
2. **Duplicate FR IDs** — `Plans/orchestrator-cycle-dashboard/requirements.md` (FR-070 to FR-076) and `Plans/image-upload/requirements.md` (FR-070 to FR-089) share overlapping FR IDs for entirely different features.
3. **Ghost FR-090** — implemented in `portal/Frontend/src/components/orchestrator/types.ts` and `portal/Frontend/src/api/client.ts` but exists in no spec or plan file.
4. **FR-dependency-api-types STILL OPEN** — `UpdateBugInput` / `UpdateFeatureRequestInput` in `portal/Shared/api.ts` still lack `blocked_by` field; `DependencyPicker.tsx:291` uses `as any` cast.
5. **FR-dependency-seed STILL OPEN** — `portal/Backend/src/database/seed.ts` does not exist.

### Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `portal/Backend/src/routes/teamDispatches.ts` | Unlinked implementation — no Verifies comment, no spec backing |
| `portal/Frontend/src/components/common/RepoSelector.tsx` | No Verifies comment |
| `portal/Frontend/src/pages/TeamsPage.tsx` | No Verifies comment, no test coverage |
| `portal/Frontend/src/components/orchestrator/types.ts` | FR-090 ghost reference |
| `portal/Frontend/src/api/client.ts:227` | Malformed FR-0001 ID (should be FR-001) |
| `portal/Shared/api.ts` | Missing `blocked_by` on UpdateBugInput / UpdateFeatureRequestInput |
| `Source/Frontend/src/components/DependencyPicker.tsx:82` | eslint-disable-next-line react-hooks/exhaustive-deps |
| `Source/Frontend/src/hooks/useWorkItems.ts:63` | eslint-disable-next-line react-hooks/exhaustive-deps |
| `Source/Shared/api-contracts.md` | Status says WIP — dependency tracking; now stale |
| `tools/traceability-enforcer.py` | Only scans Source/ + E2E/; needs portal/ added |

### Enforcer Limitation

The enforcer auto-selects the most-recently-modified `requirements.md` under `Plans/`. As of this run, that is `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013). All other plans (image-upload, dependency-linking, orchestrator-cycle-dashboard, duplicate-deprecated-status) are silently ignored. Always run with `--plan` flag or `--file` to target specific plans.

### Grade This Run

**C** — 2 P1 findings, 5 P2 findings (threshold for B: max_p1=0; threshold for C: max_p1=2)
