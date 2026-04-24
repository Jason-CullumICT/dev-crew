# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-04-24 (First Run)

### Grade: B

### Repository Structure (Critical for Future Audits)

This repo contains **two separate applications** in separate directories:

| App | Root | Spec | FR IDs |
|-----|------|------|--------|
| Self-Judging Workflow Engine | `Source/` | `Plans/self-judging-workflow/requirements.md` | `FR-WF-001` – `FR-WF-013` |
| Dev Workflow Platform (portal) | `portal/` | `Specifications/dev-workflow-platform.md` + Plans/ | `FR-001` – `FR-089+` |

Do NOT conflate them. `Source/` is the main product; `portal/` is the debug/orchestrator UI.

### Traceability Enforcer Behavior

- Tool: `python3 tools/traceability-enforcer.py`
- Strategy: picks the **most recently modified `requirements.md`** in `Plans/`
- On 2026-04-24: targeted `Plans/self-judging-workflow/requirements.md` → 13/13 PASSED
- **Critical blind spot**: portal's FR-001 to FR-089+ are NEVER checked by this enforcer in default mode
- To check portal: `python3 tools/traceability-enforcer.py --plan dev-workflow-platform`

### Known Open Work Items (from dependency-linking plan delta)

1. **FR-dependency-api-types** (`portal/Shared/api.ts`): `UpdateBugInput` and `UpdateFeatureRequestInput` lack `blocked_by?: string[]` → causes `as any` casts in `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291–293
2. **FR-dependency-seed** (`portal/Backend/src/database/seed.ts`): file does not exist; dependency seed data not loaded on startup
3. **FR-dependency-search** (Source/): `Source/Backend/tests/routes/search.test.ts` intentionally fails — no `Source/Backend/src/routes/search.ts` route file or registration in `app.ts`
4. **portal/Frontend dependency tests**: `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` absent (Source/ has these, portal/ does not)

### Phantom FR IDs

- `FR-0001` — used 29× in `portal/Frontend/src/components/shared/{BlockedBadge,DependencySection,DependencyPicker}.tsx`; **does not exist** in any spec or plan
- `FR-090` – `FR-095` — used in `portal/Frontend/src/components/orchestrator/`; no defining requirements document found
- Both are likely artefacts from an undocumented refactor or copy-paste

### FR ID Collision Between Plans

Plans/orchestrator-cycle-dashboard and Plans/image-upload **both** define FR-070–FR-076+ for completely different features. The IDs in portal Verifies comments are ambiguous. Coordinate before assigning new FR-070+ IDs.

### Recently Modified Files Without Verifies

- `portal/Backend/src/routes/teamDispatches.ts` — 0 Verifies comments; route for team dispatch history

### Tiered Merge Pipeline Spec

`Specifications/tiered-merge-pipeline.md` defines FR-TMP-001 to FR-TMP-010 (risk classification, Playwright E2E runner, auto-PR, AI review, auto-merge). **Zero implementation traces** in Source/ or portal/. This is either a future spec or work that lives outside these directories (e.g., `platform/`).

### Useful File Paths for Future Audits

```
Source/Backend/src/app.ts          — route registration; fastest way to see what's live
Source/Backend/src/services/dependency.ts — FR-dependency-* implementation
Source/Shared/types/workflow.ts    — FR-WF-001 shared types
portal/Shared/api.ts               — portal API input/response types (check for blocked_by)
portal/Backend/src/services/dependencyService.ts — portal dependency service
portal/Frontend/src/components/shared/ — DependencyPicker, BlockedBadge, DependencySection
Plans/self-judging-workflow/requirements.md — Source/ FR-WF-* definitions
Plans/dependency-linking/requirements.md — dependency feature delta tracking
```

### Spec Coverage Trend

| Scope | Coverage | Notes |
|-------|----------|-------|
| Source/ (FR-WF-001–013) | 100% | All 13 traced |
| Source/ dependency (FR-dependency-*) | ~90% | search route missing |
| portal/ (FR-001–089+) | ~90% | dependent features missing api-types, seed, portal tests |
| TMP spec (FR-TMP-001–010) | 0% | No implementation found in Source/ or portal/ |

### Common Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` in Source/ hooks/DependencyPicker (P3)
- Duplicate test file pairs in `Source/Frontend/tests/` (root + pages/ subdirectory) for WorkItemDetailPage and WorkItemListPage
