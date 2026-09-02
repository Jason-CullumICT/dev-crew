# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-09-02

### Spec Coverage Trend
- First audit run — baseline established.
- FR-WF-* (workflow engine): 100% covered. Enforcer confirms PASS.
- FR-001 to FR-069 + FR-dependency-*: implemented in `portal/` (~98% covered). Two requirements open.
- FR-TMP-001 to FR-TMP-010: implemented in `platform/orchestrator/lib/workflow-engine.js` (80% traceability).

### Open Requirements (as of 2026-09-02)
| ID | Status | Location |
|----|--------|----------|
| FR-dependency-api-types | ❌ MISSING | portal/Shared/api.ts |
| FR-dependency-seed | ❌ MISSING | portal/Backend/src/database/seed.ts |

### Critical Discovery: Enforcer Scope Gap
The traceability enforcer (`tools/traceability-enforcer.py`) hard-codes `source_dirs = ["Source", "E2E"]`.
- **portal/** is NOT scanned — FR-001–FR-095, FR-DUP-*, FR-dependency-* implementations are invisible.
- **platform/orchestrator/** is NOT scanned — FR-TMP-* implementations are invisible.
- When enforcer targets `Plans/dependency-linking/requirements.md`, it reports 7 false failures (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) because those codes appear in the plan as seed-data entity IDs and cross-refs, not as standalone requirements; the true implementations live in portal/.
- Fix: make scan dirs configurable or read from `inspector.config.yml`.

### Codebase Layout Notes (for faster future audits)
| Layer | Directory | Spec |
|-------|-----------|------|
| Workflow engine (self-judging) | `Source/Backend/`, `Source/Frontend/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` |
| Dev workflow platform (portal app) | `portal/Backend/`, `portal/Frontend/`, `portal/Shared/` | `Specifications/dev-workflow-platform.md` + `Plans/dev-workflow-platform/requirements.md` |
| Orchestrator infrastructure | `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` + `Plans/*/` |
| Shared types (workflow engine) | `Source/Shared/types/workflow.ts` | — |
| Shared types (portal app) | `portal/Shared/types.ts`, `portal/Shared/api.ts` | — |

### Pattern Violations Found
- Two eslint-disable suppressions in production frontend: `useWorkItems.ts:63`, `DependencyPicker.tsx:82` — both suppress `react-hooks/exhaustive-deps`.
- Dual logger shim: `Source/Backend/src/logger.ts` wraps `src/utils/logger.ts` for backward compat — tech debt.

### Test Quality
- FR-WF-* backend: excellent — all 11 test files carry traceability comments.
- FR-dependency-* frontend: complete — `BlockedBadge.test.tsx`, `DependencySection.test.tsx`, `DependencyPicker.test.tsx` + integration tests all present.
- FR-TMP-002: no automated test for E2E prompt-injection content — gap.
- FR-dependency-seed: no test possible (implementation missing).

### Useful Grep Commands
```bash
# All unique FR IDs traced in Source/
grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx" | grep -oP 'FR-[A-Za-z0-9_-]+' | sort -u

# All unique FR IDs traced in portal/
grep -rn "Verifies:" portal/ --include="*.ts" --include="*.tsx" | grep -oP 'FR-[A-Za-z0-9_-]+' | sort -u

# FR-TMP coverage in platform
grep -n "FR-TMP-" platform/orchestrator/lib/workflow-engine.js | grep "Verifies"

# Run enforcer against specific plan
python3 tools/traceability-enforcer.py --file Plans/<plan>/requirements.md
```
