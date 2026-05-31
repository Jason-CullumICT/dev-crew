# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-31 (Full Audit)

### Codebase Architecture — Critical for Future Audits

This project has **three distinct source trees**, each implementing different spec families:

| Source Tree | Spec Family | FR IDs |
|-------------|-------------|--------|
| `Source/` | Self-Judging Workflow Engine (`Plans/self-judging-workflow/`) | FR-WF-001..013, FR-dependency-* |
| `portal/` | Dev Workflow Platform (`Specifications/dev-workflow-platform.md`) | FR-001..095, FR-DUP-*, FR-dependency-* |
| `platform/orchestrator/` | Tiered Merge Pipeline (`Specifications/tiered-merge-pipeline.md`) | FR-TMP-001..010 |

**The traceability enforcer (`tools/traceability-enforcer.py`) hardcodes `source_dirs = ["Source", "E2E"]` and is BLIND to `portal/` and `platform/`.** Running it against portal-based plans (dev-workflow-platform, orchestrated-dev-cycles, dependency-linking, dev-cycle-traceability) produces 100% FALSE NEGATIVES — all portal FRs show as "MISSING" even though they're implemented in portal/.

**Default plan selection picks the most-recently-modified `requirements.md`.** As of this audit, that is `Plans/self-judging-workflow/requirements.md` (FR-WF-*), which IS in Source/ and PASSES. This means the verification gate in CLAUDE.md appears green while hiding portal coverage gaps.

### Spec Coverage Trend

| Source Tree | Coverage | Trend |
|-------------|----------|-------|
| Source/ (WF engine) | 100% | ✅ Stable |
| portal/ (Dev WF platform) | ~97% | ⚠️ 2 open FRs (api-types, seed) |
| platform/ (TMP) | 90% | ⚠️ FR-TMP-008 untraced |

### Open P2 Findings (as of 2026-05-31)

1. **Enforcer blind spot** — `tools/traceability-enforcer.py` must add `portal` to scan dirs
2. **FR-dependency-api-types** — `portal/Shared/api.ts` UpdateBugInput/UpdateFeatureRequestInput lack `blocked_by?: string[]`; DependencyPicker.tsx lines 291/293 use `as any`
3. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist; no dependency seeding on startup
4. **FR-dependency-frontend-tests** — `portal/Frontend/tests/BlockedBadge.test.tsx` and `portal/Frontend/tests/DependencySection.test.tsx` do not exist (DependencyPicker.test.tsx DOES exist)

### Useful Paths for Fast Future Audits

- Spec sources: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Portal FR traceability: `grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx"`
- Enforcer config: `tools/traceability-enforcer.py` line ~10 (`source_dirs = ["Source", "E2E"]`)
- Inspector config: `Teams/TheInspector/inspector.config.yml` (source.dirs, test_dirs only list Source/)
- FR-dependency-api-types gap: `portal/Shared/api.ts` lines 32-67
- Portal test dir: `portal/Frontend/tests/` (missing BlockedBadge.test.tsx, DependencySection.test.tsx)

### Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` used in 2 Source/ frontend files (useWorkItems.ts:63, DependencyPicker.tsx:82)
- `as any` cast for dependency updates in `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293`

### Common False Positive Warning

The enforcer reports `FR-0007` (and similar `FR-XXXX` data-item IDs) as missing when scanning the dependency-linking plan — these are *work item entity IDs* used in seed data descriptions, not functional requirement IDs. Ignore `FR-000x` style patterns from the enforcer; they are parsed from seed data rows, not from actual requirements.
