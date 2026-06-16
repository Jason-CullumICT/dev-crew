# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Run: 2026-06-16 (Full Audit)

### Codebase Architecture (Critical Context)

This project has **three distinct application layers** — each with different spec sources:

| Layer | Root Dir | Spec Source | FR Namespace |
|-------|----------|-------------|--------------|
| Workflow Engine (Source app) | `Source/` | `Plans/self-judging-workflow/requirements.md` | `FR-WF-*`, `FR-dependency-*` |
| Dev Platform Portal | `portal/` | `Specifications/dev-workflow-platform.md` + Plans | `FR-001` to `FR-095`, `FR-DUP-*` |
| Orchestrator Infrastructure | `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-*` |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and only against the **most-recently-modified** `Plans/*/requirements.md`. Portal/ and platform/ code are NOT covered by automated enforcement.

### Spec Coverage Trend

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| Source/ (FR-WF-001…013) | 13 | 13 | 100% |
| portal/ canonical (FR-001…069) | 69 | 69 | 100% |
| portal/ image-upload plan (FR-070…089) | 20 | 20 | 100% |
| portal/ dup-deprecated plan (FR-DUP-01…13) | 13 | 12 | 92% — FR-DUP-06 missing |
| portal/ dep-linking plan (FR-dependency-*) | 16 | 14 | 88% — seed+api-types |
| platform/ tiered-merge (FR-TMP-001…010) | 10 | ~9 | 90% — TMP-008 no comment |

### Known Open Implementation Gaps (as of this run)

- **FR-dependency-api-types**: `blocked_by` missing from `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts`; `as any` cast remains in `portal/Frontend/src/components/shared/DependencyPicker.tsx:291`
- **FR-dependency-seed**: No `seed.ts` in `portal/Backend/src/database/`
- **FR-DUP-06**: "Detail endpoints always return full item regardless of status" — zero Verifies comments in portal
- **FR-090 to FR-095**: Referenced in portal code but **no spec or plan defines them** — ghost IDs needing a spec

### Useful File Paths for Future Audits

```
# Spec files
Specifications/dev-workflow-platform.md          # FR-001..069 canonical
Specifications/workflow-engine.md                # workflow-engine domain description (no FR IDs)
Specifications/tiered-merge-pipeline.md          # FR-TMP-001..010
Plans/self-judging-workflow/requirements.md      # FR-WF-001..013
Plans/image-upload/requirements.md              # FR-070..089 (portal image upload)
Plans/orchestrator-cycle-dashboard/requirements.md  # ⚠ COLLISION: also uses FR-070..076 for different feature!
Plans/duplicate-deprecated-status/requirements.md  # FR-DUP-01..13
Plans/dependency-linking/requirements.md         # FR-dependency-*

# Traceability enforcer
tools/traceability-enforcer.py                   # Scans Source/ only against most-recent Plans/*/requirements.md
spec-drift-report.json                           # Root-level; STALE as of 2026-06-16 — do not trust

# Portal with zero Verifies recently added
portal/Backend/src/routes/teamDispatches.ts      # 0 Verifies — no spec backing
portal/Frontend/src/pages/TeamsPage.tsx          # 0 Verifies — no spec backing
portal/Frontend/src/components/common/RepoSelector.tsx  # 0 Verifies — no spec backing

# Duplicate test files in Source/ (different content — not identical)
Source/Frontend/tests/WorkItemDetailPage.test.tsx      # older version
Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx # newer, more comprehensive version
Source/Frontend/tests/WorkItemListPage.test.tsx         # older version
Source/Frontend/tests/pages/WorkItemListPage.test.tsx   # newer version
```

### Common Pattern Violations Found

1. **Ghost FR IDs**: FR-090 to FR-095 are used as Verifies comments with no backing spec — developers assigned FR numbers during implementation but never wrote the spec
2. **Entity ID used as spec ID**: `FR-0001` (4-digit, a database row ID) appears as a Verifies comment in two files — confuses entity IDs with requirement IDs
3. **FR namespace collision**: Two separate plans reuse FR-070…076 for different features
4. **Enforcer blind spot**: Enforcer passes by scanning most-recently-modified plan, even if portal/ or platform/ code is completely unenforced
