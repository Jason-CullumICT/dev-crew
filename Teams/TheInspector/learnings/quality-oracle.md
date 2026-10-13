# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-10-13 — Full Spec-Drift Audit

**Grade: C** (2 P1 findings, 4 P2 findings; spec coverage ~98% in portal but enforcer gives false failures for 6/8 plans)

---

## Codebase Structure (Critical Context)

This repo has **two distinct product implementations** in parallel:

| Directory | Product | Spec | FR Namespace |
|-----------|---------|------|-------------|
| `Source/` | Self-Judging Workflow Engine | `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 |
| `portal/` | Dev Workflow Platform | `Specifications/dev-workflow-platform.md` | FR-001 to FR-095, FR-DUP-01 to FR-DUP-13 |

The **traceability enforcer** (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. This means it **blindly misses** the entire `portal/` implementation. Running the enforcer against any portal-based plan falsely reports failure.

The **inspector config** (`Teams/TheInspector/inspector.config.yml`) lists `source.dirs: ["Source/"]` only — portal/ is not included.

---

## Spec Coverage (Computed)

| FR Range | Plan | Coverage | Notes |
|----------|------|----------|-------|
| FR-001 to FR-069 | dev-workflow-platform | 69/69 = **100%** | All covered in portal/ |
| FR-070 to FR-095 | image-upload + orchestrator | 26/26 = **100%** | All covered in portal/ |
| FR-DUP-01 to FR-DUP-13 | duplicate-deprecated-status | 12/13 = **92%** | FR-DUP-06 untraced |
| FR-WF-001 to FR-WF-013 | self-judging-workflow | 13/13 = **100%** | All covered in Source/ |
| FR-dependency-* | dependency-linking | 14/16 = **87.5%** | FR-dependency-api-types and FR-dependency-seed unimplemented |

**Overall: ~134/137 traced = 97.8% coverage (when portal/ is included)**

---

## Prior P1/P2 Findings (Track Forward)

### P1-QO-001: Enforcer Blind Spot
- **File:** `tools/traceability-enforcer.py:71`
- **Status:** OPEN
- The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. Adding `"portal"` to this list fixes it.
- Gate currently gives false positives for 6/8 plans.

### P1-QO-002: Inspector Config Excludes portal/
- **File:** `Teams/TheInspector/inspector.config.yml`
- **Status:** OPEN
- `source.dirs` should include `"portal/"` for all inspector audits to be valid.

### P2-QO-003: FR-dependency-api-types Unimplemented
- **File:** `portal/Shared/api.ts` (UpdateBugInput, UpdateFeatureRequestInput)
- **Status:** OPEN
- `blocked_by?: string[]` field is missing; frontend uses `as any` workaround.

### P2-QO-004: FR-dependency-seed Unimplemented  
- **File:** `portal/Backend/src/database/` (no seed.ts)
- **Status:** OPEN
- Seed file with 4 known dependency relationships is not present.

### P2-QO-005: FR-DUP-06 Untraced
- **File:** `portal/Backend/src/routes/bugs.ts` and `portal/Backend/src/routes/featureRequests.ts`
- **Status:** OPEN
- "Detail endpoints always return the full item regardless of status" — no Verifies comment for FR-DUP-06.

### P2-QO-006: CLAUDE.md Mislabels portal/
- **File:** `CLAUDE.md` (module table)
- **Status:** OPEN
- portal/ is labeled "Debug portal UI" but it is the primary dev-workflow-platform implementation (full Backend + Frontend). The label causes routing confusion for agents.

---

## Useful Paths for Future Audits

- Spec files: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`
- Self-judging-workflow reqs: `Plans/self-judging-workflow/requirements.md`
- Dependency plan delta: `Plans/dependency-linking/requirements.md` (Implementation Delta table)
- Portal backend routes: `portal/Backend/src/routes/`
- Portal frontend tests: `portal/Frontend/tests/`
- Source backend tests: `Source/Backend/tests/`
- Enforcer: `tools/traceability-enforcer.py` — add `"portal"` to source_dirs

## Architecture Observations

- No `console.log` in production source (both Source/ and portal/ use logger abstractions) ✅
- No hardcoded secrets found ✅
- No empty catch blocks ✅
- No skipped/todo tests ✅
- No TODO/FIXME/HACK comments ✅
- 4 eslint-disable suppressions (3× react-hooks/exhaustive-deps, 1× unused-vars for Express 4-param error handler)
- 2 portal files >500 lines: cycleService.ts (526), featureRequestService.ts (506)
- workflow-engine.md spec uses narrative format with no FR-XXX IDs — cannot be enforced directly

## Spec Coverage Trend

- First audit: 97.8% (3 requirements untraced/unimplemented)
- Note: Apparent 0% coverage for portal plans was enforcer blind spot, not real gap
