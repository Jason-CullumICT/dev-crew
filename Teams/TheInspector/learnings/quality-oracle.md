# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit History

| Date | Grade | Spec Coverage | P1s | P2s |
|------|-------|--------------|-----|-----|
| 2026-11-06 | D | 0% | 3 | 2 |

---

## Key Structural Facts (fast-path for future audits)

### Traceability ID Taxonomy
This project uses **three distinct FR namespaces** — treat them separately:

| Namespace | Location | Count | Source coverage |
|-----------|----------|-------|----------------|
| `FR-\d+` / `FR-dependency-*` | `Specifications/dev-workflow-platform.md` | 85 | 0% — NONE traced |
| `FR-TMP-\d+` | `Specifications/tiered-merge-pipeline.md` | 10 | 0% — NONE traced |
| `FR-WF-\d+` | `Plans/self-judging-workflow/requirements.md` | 13 | 100% — enforcer passes |

**Critical gotcha**: `python3 tools/traceability-enforcer.py` only checks `Plans/*/requirements.md` (the most-recently-modified one). It reports PASSED while `Specifications/` FRs are 100% untraced. Do not interpret enforcer pass as full coverage.

### Source Layout
- Backend source: `Source/Backend/src/` (TypeScript, Express, in-memory store)
- Frontend source: `Source/Frontend/src/` (React, Vite, Tailwind)
- Backend tests: `Source/Backend/tests/` (Jest) — 14 test files, all have assertions
- Shared types: `Source/Shared/` (TypeScript interfaces)
- E2E: `Source/E2E/` (Playwright)

### Logger Duplication
Two logger paths exist in backend — both are intentional (wrapper pattern):
- `Source/Backend/src/utils/logger.ts` — primary implementation (pino-style)
- `Source/Backend/src/logger.ts` — default-export compatibility wrapper (re-exports utils/logger)

### Known P1 Issues (open as of 2026-11-06)
1. **QO-001**: Routes (`workflow.ts`, `workItems.ts`, `intake.ts`) directly import `workItemStore` — service layer bypass
2. **QO-002**: Traceability enforcer scope gap — does not check `Specifications/`
3. **QO-003**: 95 `Specifications/` FRs are unimplemented — 0% coverage

### What IS clean
- No `console.log` in production source (logger abstraction used)
- No hardcoded secrets
- No skipped/todo tests
- Services do not import Express types (business logic is clean)
- All test files have assertions

---

## Pattern: Spec vs. Plan two-tier model

The project has an emergent two-tier structure:
- **Specifications/** = aspirational domain specs (may describe future, unbuilt systems)
- **Plans/** = concrete implementation plans with traceable FR IDs

Traceability enforcer is calibrated for Plans/, not Specifications/. Future QO runs should check both tiers explicitly.

---

## Useful Grep Commands for Future Audits

```bash
# FR namespace coverage
grep -oE "FR-[0-9]+" Specifications/dev-workflow-platform.md | sort -u | wc -l
grep -oE "FR-WF-[0-9]+" Source/ -r | sort -u | wc -l
grep -oE "FR-TMP-[0-9]+" Source/ -r | sort -u | wc -l

# Architecture: direct store access from routes
grep -rn "import.*workItemStore" Source/Backend/src/routes/

# eslint-disable
grep -rn "eslint-disable" Source/Frontend/src/

# Large files
wc -l Source/Backend/src/**/*.ts Source/Frontend/src/**/*.{ts,tsx} | sort -rn | head -10

# Recently modified source (14 days)
git log --since="14 days ago" --name-only --pretty=format: -- Source/ | grep -v "^$" | sort -u
```
