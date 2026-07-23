# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit History

| Date | Grade | P1 | P2 | P3 | Spec Coverage |
|------|-------|----|----|----|---------------|
| 2026-07-23 | D | 2 | 4 | 2 | 0% (Spec) / 100% (Plans) |

---

## Spec Coverage Trend

**Declining** — first run establishes 0% coverage against `Specifications/` (domain truth).
Plan-level coverage (`Plans/self-judging-workflow/`) is 100% — a misleading signal.

---

## Critical Pattern: Two-Layer Traceability Disconnect

This project has TWO requirement layers:
1. **`Specifications/`** — high-level domain specs (FR-001 to FR-069 in `dev-workflow-platform.md`; FR-TMP-001 to FR-TMP-010 in `tiered-merge-pipeline.md`)
2. **`Plans/`** — implementable plan requirements (`FR-WF-*`, `FR-dependency-*`)

The traceability enforcer (`tools/traceability-enforcer.py`) **only checks Plans/ level**. It auto-discovers the most recently modified `requirements.md` in `Plans/` and reports PASSED when those 13 FRs are traced.

The 65 + 10 = 75 `Specifications/` FRs have **0% source coverage** and the enforcer never reports on them. This creates a permanently green gate that is structurally blind to spec drift.

**Future audits must manually verify Specifications/ coverage.** Use:
```bash
grep -rn "Verifies:.*FR-[0-9]\{3\}" Source/   # should be 0 until fixed
grep -rn "FR-[0-9]\{3\}" Specifications/       # lists all spec IDs
```

---

## Architecture Violation Pattern

The "no direct DB calls from route handlers" rule is systematically violated. All three route files (`workItems.ts`, `workflow.ts`, `intake.ts`) call `store.*` directly. The pattern to look for in audits:

```bash
grep -rn "store\." Source/Backend/src/routes/
```

This should produce 0 hits in a compliant codebase.

---

## Split Logger Anti-Pattern

Two logger modules coexist:
- `src/utils/logger.ts` → named export `{ logger }`, canonical implementation
- `src/logger.ts` → default export, wrapper normalizing call conventions

Only `workItemStore.ts` imports from `utils/logger.ts` directly; all other files import from `src/logger.ts`. The wrapper exists because different coders used different call signatures. Neither module supports dev pretty-printing.

**Quick check:**
```bash
grep -rn "from.*logger" Source/Backend/src/ | grep -v ".test."
# Should show uniform import path — currently two distinct paths
```

---

## Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Specifications/dev-workflow-platform.md` | 65 domain FRs (FR-001→FR-069) — primary spec |
| `Specifications/tiered-merge-pipeline.md` | 10 pipeline FRs (FR-TMP-001→FR-TMP-010) |
| `Plans/self-judging-workflow/requirements.md` | 13 plan-level FRs (FR-WF-001→FR-WF-013) |
| `tools/traceability-enforcer.py` | Enforcer — only checks Plans/, not Specifications/ |
| `Source/Backend/src/utils/logger.ts` | Canonical logger (no dev mode) |
| `Source/Backend/src/logger.ts` | Wrapper shim (unnecessary) |
| `Source/Backend/src/routes/workItems.ts` | Direct store calls in route handler |
| `Source/Frontend/tests/` | Root-level tests — some are duplicate legacy versions |
| `Source/Frontend/tests/pages/` | Newer, properly typed tests — canonical location |

---

## Common Pattern Violations

| Pattern | Rule | Location |
|---------|------|----------|
| Direct store calls in routes | "No direct DB calls from route handlers" | `routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts` |
| No dev pretty-printing | "pretty-printing in development" (FR-003, FR-WF-013) | `utils/logger.ts` |
| Duplicate test files | Single canonical test per component | `tests/WorkItemDetailPage.test.tsx` × 2, `tests/WorkItemListPage.test.tsx` × 2 |
| Untested shared components | FR-032: all key components need tests | Layout, PriorityBadge, StatusBadge, TypeBadge |
