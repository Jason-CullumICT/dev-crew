# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

### 2026-06-24 — Full Audit

**Spec coverage trend:** First baseline run.

---

## Key Discoveries

### Codebase Architecture: TWO separate products

This repo contains **two distinct applications** with separate source trees:

| Application | Source Dir | Spec File | FR ID Namespace |
|-------------|------------|-----------|-----------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | `FR-WF-001` to `FR-WF-013` |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001` to `FR-095` |
| Tiered Merge Pipeline | `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001` to `FR-TMP-010` |

The traceability enforcer (`tools/traceability-enforcer.py`) **only scans `Source/` and `E2E/`**. It is **blind to `portal/` and `platform/`**. This means:
- Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` → 76 FALSE FAILURES
- Running `python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md` → 13 FALSE FAILURES
- Default run (picks most-recently-modified Plan requirements.md) → works correctly for `Source/`

### Requirement ID Namespaces

- `FR-WF-*` → workflow engine in `Source/`
- `FR-001` to `FR-069` → dev-workflow-platform in `portal/`
- `FR-070` to `FR-095` → image-upload plan, in `portal/`
- `FR-DUP-01` to `FR-DUP-13` → duplicate-deprecated-status plan, in `portal/`
- `FR-TMP-001` to `FR-TMP-010` → tiered-merge-pipeline in `platform/orchestrator/`
- `FR-dependency-*` → used in BOTH `Source/` (workflow engine deps) AND `portal/` (bug/FR deps)

### Plans that have code coverage but are NOT reflected in Specifications/

| Plan | FR IDs | Spec File |
|------|--------|-----------|
| Plans/image-upload/ | FR-070 to FR-095 | Not in Specifications/ |
| Plans/duplicate-deprecated-status/ | FR-DUP-01 to FR-DUP-13 | Not in Specifications/ |

The `Specifications/dev-workflow-platform.md` only covers FR-001 to FR-069. These extended plans are missing from the canonical spec directory.

### Architecture Pattern: portal/ routes pass `db` to services

Portal route handlers call `getDb()` and pass the result to service functions. This is not truly "using the service layer" per the architecture rule ("No direct DB calls from route handlers"), but the actual SQL is in services. The exception is `portal/Backend/src/routes/teamDispatches.ts` which has 3 `db.prepare()` calls directly in route handlers with no service delegation at all.

### Traceability gap: portal/ FR-dependency-* only partially traced

The dependency-linking plan specifies 16 FR-dependency-* IDs for `portal/` implementation, but portal/ code only traces 4:
- FR-dependency-linking ✓
- FR-dependency-cycle-detection ✓
- FR-dependency-dispatch-gating ✓
- FR-dependency-ready-check ✓
- (12 others missing traceability in portal/)

`Source/` traces all 15 FR-dependency-* IDs for its own parallel dependency feature.

### File paths useful for faster future audits

- Enforcer: `tools/traceability-enforcer.py`
- Backend routes (Source): `Source/Backend/src/routes/`
- Frontend pages (Source): `Source/Frontend/src/pages/`
- Portal routes: `portal/Backend/src/routes/`
- Portal services: `portal/Backend/src/services/`
- Tiered pipeline: `platform/orchestrator/lib/workflow-engine.js`
- Config: `platform/orchestrator/lib/config.js`

### Common Pattern Violations

1. `eslint-disable-next-line react-hooks/exhaustive-deps` appears in:
   - `Source/Frontend/src/components/DependencyPicker.tsx:82`
   - `Source/Frontend/src/hooks/useWorkItems.ts:63`

2. Direct DB calls in portal route handler: `portal/Backend/src/routes/teamDispatches.ts`

3. Inline type definition in portal route: `portal/Backend/src/routes/teamDispatches.ts` — `interface TeamDispatch`

### FR-TMP-008 is infrastructure-only

FR-TMP-008 (Worker Container Prerequisites) is implemented in `platform/Dockerfile.worker` which cannot carry `// Verifies:` comments. The prior QA report acknowledged this as N/A. Do not flag this as a code traceability gap.
