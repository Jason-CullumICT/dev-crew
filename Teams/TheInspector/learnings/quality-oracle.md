# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-14 (Full Audit)

### Critical Discovery: Dual-Codebase Architecture

This project has **two distinct application codebases**, not one:

| Directory | App | FR namespace | Active plans |
|-----------|-----|--------------|--------------|
| `Source/` | Self-Judging Workflow Engine | `FR-WF-*` | Plans/self-judging-workflow |
| `portal/` | Dev Workflow Platform (original) | `FR-001..FR-069`, `FR-DUP-*`, `FR-dependency-*`, `FR-07x` | Most other plans |

The traceability enforcer (`tools/traceability-enforcer.py`) hardcodes scan dirs as `["Source", "E2E"]` — it **does not scan `portal/`**. This means every plan implemented in `portal/` will always report false failures.

### Traceability Enforcer Blind Spot

Plans implemented in `portal/` that the enforcer cannot see:
- `Plans/dev-workflow-platform` (FR-001..FR-069) → `portal/`
- `Plans/orchestrated-dev-cycles` (FR-033..FR-049) → `portal/`
- `Plans/dev-cycle-traceability` (FR-050..FR-069) → `portal/`
- `Plans/orchestrator-cycle-dashboard` (FR-070..FR-076) → `portal/`
- `Plans/dependency-linking` (FR-dependency-*) → `portal/`
- `Plans/duplicate-deprecated-status` (FR-DUP-*) → `portal/`

**Fix**: Add `"portal"` to the `source_dirs` list in `tools/traceability-enforcer.py` (line ~87).

### Confirmed Genuine Implementation Gaps (as of 2026-11-14)

From `Plans/dependency-linking/requirements.md` delta table:

1. **FR-dependency-api-types** — `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`. Two `as any` casts in `portal/Frontend/src/components/shared/DependencyPicker.tsx` (lines 291/293).
2. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist.
3. **FR-dependency-frontend-tests** — `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` are absent.

### ID Mismatch in portal tests

`portal/Frontend/tests/DependencyPicker.test.tsx` uses `// Verifies: FR-0001` but the canonical requirement ID is `FR-dependency-picker`. Should be corrected to avoid confusion.

### Useful File Paths

- Enforcer: `tools/traceability-enforcer.py` — scan dirs at lines ~85-87
- Portal shared types: `portal/Shared/types.ts`
- Portal API types: `portal/Shared/api.ts`
- Portal dependency service: `portal/Backend/src/services/dependencyService.ts`
- Portal dependency picker: `portal/Frontend/src/components/shared/DependencyPicker.tsx` (line 291/293 — `as any`)
- Portal DB schema: `portal/Backend/src/database/schema.ts`
- Source codebase (self-judging workflow): `Source/Backend/src/`, `Source/Frontend/src/`

### Spec Coverage Trend

| Codebase | Coverage |
|----------|---------|
| Source/ (FR-WF-* namespace) | ~100% — enforcer PASSES |
| portal/ (all other namespaces) | Unknown — enforcer BLIND; must audit manually |

