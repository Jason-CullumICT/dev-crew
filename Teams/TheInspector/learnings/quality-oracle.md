# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-17 — Full Audit

### Repository Architecture (Critical Context)

This repo contains **two separate applications**:

| App | Path | Stack | Spec |
|-----|------|-------|------|
| Self-Judging Workflow Engine | `Source/` | Express + in-memory store + React | `Plans/self-judging-workflow/requirements.md` |
| Dev Workflow Platform (Portal) | `portal/` | Express + SQLite + React | `Specifications/dev-workflow-platform.md` |

The `inspector.config.yml` scopes analysis to `Source/`. `Specifications/` describes the portal app, **not Source/**. The traceability enforcer correctly ignores `Specifications/` and uses `Plans/` instead.

### FR ID Namespace is Shared (Not Partitioned by App)

- `Plans/orchestrator-cycle-dashboard/requirements.md` uses FR-070 through FR-076 for _Source/Frontend_ Orchestrator Cycles page
- `Plans/image-upload/requirements.md` uses FR-070 through FR-089 for image upload features (implemented in portal/)
- These IDs **collide** — the same FR-070 means different things in different plans

This is a systemic problem. Any new plan must check for ID conflicts before assignment.

### Traceability Enforcer Scope

The enforcer auto-selects the **most recently modified** requirements.md. As of this audit it selects `Plans/self-judging-workflow/requirements.md`. Other plans (orchestrator-cycle-dashboard, image-upload, duplicate-deprecated-status) are never automatically validated.

To run a specific plan: `python3 tools/traceability-enforcer.py --file Plans/<name>/requirements.md`

### Source/ Active Plan Status

| Plan | FR IDs | Status |
|------|--------|--------|
| `Plans/self-judging-workflow` | FR-WF-001 to FR-WF-013 | ✅ 100% implemented & traced |
| `Plans/dependency-linking` | FR-dependency-* (16 IDs) | ✅ 100% implemented & traced |
| `Plans/orchestrator-cycle-dashboard` | FR-070 to FR-076 | ❌ 0% implemented in Source/ |
| `Plans/image-upload` | FR-070 to FR-089 | Implemented in portal/, not Source/ |
| `Plans/duplicate-deprecated-status` | FR-DUP-01 to FR-DUP-13 | Partially in portal/ (schema only), not in Source/ |

### Spec Coverage (Source/ Only, Active Plans)

29 of 36 plan FRs explicitly scoped to Source/ are traced → **81% coverage**

### Fast File Paths for Future Audits

- FR traceability in Source/: `grep -rn "Verifies:" Source/`
- Plans with requirements: `find Plans -name "requirements.md"`
- FR IDs in plan: `grep -E "FR-[A-Z0-9-]+" Plans/<name>/requirements.md`
- Catch blocks: `grep -rn "catch" Source/Backend/src/ --include="*.ts" -A 2`
- Console.log check: `grep -rn "console\." Source/ --include="*.ts" --include="*.tsx"`

### Common Pattern Violations Found

1. **eslint-disable without comment**: 2 instances in DependencyPicker.tsx and useWorkItems.ts
2. **Silent .catch(() => ({}))** in api/client.ts line 26 — swallows JSON parse errors
3. **Dual logger modules** in Source/Backend/src/ — `logger.ts` (compat wrapper) + `utils/logger.ts` (real impl)
4. Frontend hooks (`useDashboard`, `useWorkItems`) and badge components have no dedicated unit tests

### Spec Coverage Trend

- First audit: 81% (Source/-scoped plans only). Baseline established.
