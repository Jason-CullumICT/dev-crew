# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-30 — First full audit

### Architecture: Two separate applications

This project has **two application stacks**:

| Directory | Spec | FR ID scheme | Tech |
|-----------|------|-------------|------|
| `Source/` | `Specifications/workflow-engine.md` | `FR-WF-*`, `FR-dependency-*` | Express + in-memory store |
| `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001` to `FR-095`, `FR-DUP-*` | Express + SQLite, React |

The CLAUDE.md calls portal/ "Debug UI (embedded via iframe)" — this is **inaccurate**; portal/ is a full-stack production application with its own Backend, Frontend, Shared, and Dockerfile.

### Traceability Enforcer Blind Spots

- `tools/traceability-enforcer.py` picks the **most recently modified** `requirements.md` in `Plans/`. On 2026-07-30 this resolves to `Plans/self-judging-workflow/requirements.md` (13 FRs).
- The enforcer scans only `["Source", "E2E"]` — **portal/ is completely invisible**.
- `Plans/dependency-linking/requirements.md` (FR-dependency-*, 16 FRs) is never checked.
- Result: "TRACEABILITY PASSED" is a false positive covering ~12% of total active requirements.

### Key file paths (Source/)

| Purpose | Path |
|---------|------|
| Shared types | `Source/Shared/types/workflow.ts` |
| Work item store | `Source/Backend/src/store/workItemStore.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |
| Metrics | `Source/Backend/src/metrics.ts` |
| Logger (primary) | `Source/Backend/src/utils/logger.ts` |
| Logger (wrapper) | `Source/Backend/src/logger.ts` |
| Route: work items | `Source/Backend/src/routes/workItems.ts` |
| Route: workflow actions | `Source/Backend/src/routes/workflow.ts` |

### Key file paths (portal/)

| Purpose | Path |
|---------|------|
| Shared types | `portal/Shared/types.ts` |
| API types | `portal/Shared/api.ts` |
| Dependency tests | `portal/Backend/tests/dependencies.test.ts` |
| Dependency picker test | `portal/Frontend/tests/DependencyPicker.test.tsx` |

### Known Open Issues (as of 2026-07-30)

| ID | Severity | Issue |
|----|----------|-------|
| QO-001 | P1 | Traceability enforcer false-green — only covers FR-WF-* (13 FRs) |
| QO-002 | P2 | portal/ outside all inspector scope; inspector.config.yml needs `portal/` in source.dirs |
| QO-003 | P2 | FR-dependency-seed missing — no seed.ts in Source/Backend/src/ |
| QO-004 | P2 | Dependency features in both Source/ and portal/ with incompatible FR IDs |
| QO-005 | P3 | Plans/dependency-linking delta table is wrong (tests exist; paths are Source/ not portal/) |
| QO-006 | P3 | Logger always emits JSON; no pretty-print in dev; LOG_LEVEL not respected |
| QO-007 | P3 | workItems.ts route handlers call store directly, no service layer |

### Pattern Enforcement Results

| Check | Result |
|-------|--------|
| console.log in production | ✅ None found |
| eslint-disable in production | ⚠️ 2 (useWorkItems.ts:63, DependencyPicker.tsx:82) |
| Empty catch blocks | ⚠️ 1 (api/client.ts:26 — `.catch(() => ({}))`) |
| Hardcoded secrets | ✅ None found |
| Skipped/todo tests | ✅ None found |
| Files >500 lines | ✅ None (largest: workflow.ts = 374 lines) |

### Spec Coverage Trend

First run — no prior baseline.

| Scope | Coverage |
|-------|----------|
| Source/ (FR-WF-* + FR-dependency-*) | ~97% (1 missing: seed) |
| Enforcer gate (FR-WF-* only) | 100% (false-green — gate is underscoped) |
| portal/ (FR-001 to FR-095) | Not scanned — outside Source/ scope |

### Useful Search Patterns for Future Runs

```bash
# All Verifies in Source/
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"

# All Verifies in portal/
grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx"

# Check which plan the enforcer will pick
ls -lt Plans/**/requirements.md | head -3

# FR coverage check for a specific spec
for id in FR-001 FR-002 ...; do
  grep -qr "Verifies:.*$id" Source/ portal/ || echo "MISSING: $id"
done
```
