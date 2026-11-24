# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-24 (Full Audit)

### Codebase Layout — Critical Discovery

This project has **three distinct implementation directories**, not one:

| Dir | Implements | Spec source | Traceability pattern |
|-----|-----------|------------|----------------------|
| `Source/` | Self-Judging Workflow Engine | `Plans/self-judging-workflow/requirements.md` | `FR-WF-XXX` |
| `portal/` | Development Workflow Platform | `Specifications/dev-workflow-platform.md` | `FR-XXX` (3-digit) |
| `platform/` | Orchestrator infrastructure | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-XXX` |

The `inspector.config.yml` only lists `Source/` in `source.dirs`. **This is wrong** — the enforcer is blind to `portal/` and `platform/`.

### Spec Coverage Trend (first run — baseline)

| Spec / Plan | FRs | Traced | Coverage |
|-------------|-----|--------|----------|
| Self-Judging Workflow (Source/) | 13 | 13 | 100% |
| Dev-Workflow-Platform (portal/) | 69 | 69 | 100% |
| Tiered Merge Pipeline (platform/) | 10 | 9 | 90% (FR-TMP-008 missing Verifies comment) |
| Dependency Linking (portal/) | 16 | 13 | 81% (3 FRs unimplemented) |
| **Overall** | **108** | **104** | **~96%** |

### Open P2 Findings (dependency-linking)

Three requirements documented as incomplete in `Plans/dependency-linking/requirements.md` delta:

1. `FR-dependency-api-types` — `blocked_by?: string[]` missing from `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts`. Causes `as any` cast at `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`.
2. `FR-dependency-seed` — `portal/Backend/src/database/seed.ts` does not exist. Known test dependency relationships not seeded.
3. `FR-dependency-frontend-tests` — `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` are absent.

### Key File Paths for Fast Future Audits

- **Main spec**: `Specifications/dev-workflow-platform.md` (FR-001..FR-069)
- **Workflow-engine spec**: `Specifications/workflow-engine.md` (no FR IDs, narrative only)
- **Pipeline spec**: `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010)
- **Self-judging requirements**: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013)
- **Dependency-linking requirements**: `Plans/dependency-linking/requirements.md` (includes implementation delta table)
- **Shared types (portal)**: `portal/Shared/api.ts`, `portal/Shared/types.ts`
- **Shared types (Source)**: `Source/Shared/types/workflow.ts`
- **Large files to watch**: `portal/Backend/src/services/cycleService.ts` (526L), `portal/Backend/src/services/featureRequestService.ts` (506L)

### Common Pattern Violations Found

- `eslint-disable` in 4 production source locations (all react-hooks/exhaustive-deps or unused-vars)
- `as any` casts in `DependencyPicker.tsx:291,293` (consequence of unimplemented type)
- Traceability enforcer command (`python3 tools/traceability-enforcer.py`) only covers `Source/` — always specify `--file` or update enforcer config when checking portal/platform requirements

### Grading (this run)

Under `inspector.config.yml` grading criteria:
- P1 findings: 1 (enforcer blind spot)
- P2 findings: 4 (3 open dependency FRs + 2 large files)
- Spec coverage ≥ 96%

**Grade: B** (0 P1 exploitable, ≤8 P2, coverage ≥60%)

> Note: QO-001 (traceability enforcer blind spot) is an infrastructure integrity issue. If the team treats it as P1, grade drops to C.
