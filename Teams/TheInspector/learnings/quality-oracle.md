# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-08-02 — Full Audit

### Repository Layout (critical for future audits)

This repo has THREE implementation layers — all must be scanned:

| Directory | Spec | FR Namespace |
|-----------|------|-------------|
| `Source/` | `Specifications/workflow-engine.md` / `Plans/self-judging-workflow/requirements.md` | `FR-WF-*` |
| `portal/` | `Specifications/dev-workflow-platform.md` (FR-001 — FR-069, FR-dependency-*) | `FR-001`…`FR-069`, `FR-dependency-*` |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-*` |

**Traceability enforcer blind spot (P1):** `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. Running it against `Specifications/dev-workflow-platform.md` reports 76 MISSING — but all are implemented in `portal/` (1074 Verifies comments). The verification gate in `CLAUDE.md` passes because the auto-discovered plan is `Plans/self-judging-workflow/requirements.md` (FR-WF-*, all in Source/).

### Key File Paths

- Portal backend services: `portal/Backend/src/services/`
- Portal backend routes: `portal/Backend/src/routes/`
- Portal shared types: `portal/Shared/types.ts` and `portal/Shared/api.ts`
- Source backend services: `Source/Backend/src/services/`
- Source backend store (in-memory): `Source/Backend/src/store/workItemStore.ts`
- Platform orchestrator: `platform/orchestrator/`
- Traceability enforcer: `tools/traceability-enforcer.py`

### Known Open Deltas (as of this audit)

These were identified in `Plans/dependency-linking/requirements.md` delta section and confirmed in code:

1. **FR-dependency-api-types** — `portal/Shared/api.ts`: `UpdateBugInput` and `UpdateFeatureRequestInput` missing `blocked_by?: string[]`; `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291/293 use `as any` workaround.
2. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` doesn't exist. No seeding of the 4 known dependency relationships (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007, etc.).
3. **FR-dependency-frontend-tests** — Actually FIXED since the delta was written. `Source/Frontend/tests/components/BlockedBadge.test.tsx`, `DependencySection.test.tsx`, `DependencyPicker.test.tsx` all exist with traceability comments.

### Architecture Pattern Observations

- `Source/Backend` routes call the in-memory store directly (no service layer for CRUD). Architecture rule says "No direct DB calls from route handlers." The store is the persistence layer. `workItems.ts` and `intake.ts` are the violators; `dashboard.ts` correctly uses a service.
- `Source/Backend` has two logger abstractions: `src/utils/logger.ts` (canonical) and `src/logger.ts` (compat wrapper). The canonical logger emits JSON always — no NODE_ENV check for dev pretty-printing.
- `portal/Backend` routes correctly use `next(err)` error delegation and service layer.
- Portal routes call `getDb()` inside route handlers but immediately pass it to service functions — borderline but acceptable.

### Spec Coverage Trends

| Spec | FR Count | Covered In | Verifies Found | Coverage |
|------|----------|-----------|----------------|----------|
| dev-workflow-platform.md | 74 (excl. template FRs) | portal/ | 108 unique FRs in portal/ | ~100% |
| self-judging-workflow requirements.md | 13 | Source/ | 13 | 100% |
| tiered-merge-pipeline.md | 10 (FR-TMP-*) | platform/ | FR-TMP-001..007, 009, 010 | 90% (FR-TMP-008 missing) |
| workflow-engine.md | 0 (no FR IDs) | N/A | N/A | Unenforceable |

### Traceability Precision Issue

The pattern `FR-\d+` in `traceability-enforcer.py` matches seed data references like `FR-0002`, `FR-0003` which appear in requirements.md as human-readable bug/FR IDs (e.g., "FR-0004 blocked_by FR-0003"). These produce false negatives.

### Useful Grep Commands for Future Audits

```bash
# Full portal FR coverage
grep -rn "Verifies:" portal/ | grep -oP "FR-[A-Z0-9-]+" | sort | uniq -c | sort -rn

# Spec FRs not covered in portal
grep -oP "FR-\d+" Specifications/dev-workflow-platform.md | sort | uniq > /tmp/spec.txt
grep -rn "Verifies:" portal/ | grep -oP "FR-[A-Z0-9-]+" | sort | uniq > /tmp/portal.txt
comm -23 /tmp/spec.txt /tmp/portal.txt

# Platform FR-TMP coverage
grep -rn "Verifies.*FR-TMP" platform/ | grep -oP "FR-TMP-\d+" | sort | uniq
```
