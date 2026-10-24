# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-10-24

### Spec Coverage Trend

- **Plans-scope (enforcer):** 100% — all 13 FR-WF-* requirements traced
- **Specifications-scope (domain specs):** ~0% — none of the ~84 Specifications/ FRs traced
- Grade: **D** (2 P1 findings)

### Key Architecture Facts (fast lookup for future audits)

| Item | Value |
|------|-------|
| Active spec (implementation matches) | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` |
| Superseded specs (not implemented) | `Specifications/dev-workflow-platform.md` (FR-001…069), `Specifications/tiered-merge-pipeline.md` (FR-TMP-001…010) |
| Traceability enforcer scope | `Plans/*/requirements.md` only — does NOT scan `Specifications/` |
| FR ID format in codebase | `FR-WF-XXX`, `FR-dependency-*` (NOT `FR-\d+` as config claims) |
| Config pattern (wrong) | `FR-\\d+` in `inspector.config.yml:36` — update to `FR-[A-Z0-9-]+` |
| Store type | In-memory (`Source/Backend/src/store/workItemStore.ts`) — NOT SQLite |
| E2E tests | Infrastructure exists (`Source/E2E/`) but zero test files |

### P1/P2 Findings to Re-verify Next Audit

| ID | Finding | File | Status |
|----|---------|------|--------|
| QO-001 | Traceability enforcer blind to Specifications/ | `tools/traceability-enforcer.py:49` | OPEN |
| QO-002 | Implementation diverges from domain spec (SQLite vs in-memory, different entity model) | `Specifications/dev-workflow-platform.md` | OPEN |
| QO-003 | FR-TMP-001…010 zero coverage | `Specifications/tiered-merge-pipeline.md` | OPEN |
| QO-004 | Direct store calls from route handlers (workItems.ts, workflow.ts, intake.ts) | `Source/Backend/src/routes/` | OPEN |
| QO-005 | Traceability ID format mismatch (config says FR-\d+, code uses FR-WF-*) | `inspector.config.yml:36` | OPEN |
| QO-006 | E2E infra with zero tests | `Source/E2E/tests/` | OPEN |

### Useful File Paths for Future Audits

```
Specifications/dev-workflow-platform.md       # 74 FRs — NOT implemented
Specifications/tiered-merge-pipeline.md       # 10 FR-TMP-* — NOT implemented
Specifications/workflow-engine.md             # Active design spec (no FR IDs in this file)
Plans/self-judging-workflow/requirements.md   # 13 FR-WF-* — IMPLEMENTED (100%)
tools/traceability-enforcer.py                # Only checks Plans/; does not scan Specifications/
Source/Backend/src/store/workItemStore.ts     # In-memory store; called directly from routes
Source/Backend/src/routes/workItems.ts        # Architecture violation: direct store access
Source/Backend/src/routes/workflow.ts         # Architecture violation: direct store access
Source/E2E/playwright.config.ts               # E2E config exists, no test files
```

### Common Pattern Violations Found

1. **eslint-disable** in `DependencyPicker.tsx:82` and `useWorkItems.ts:63` — exhaustive-deps suppression
2. **Non-FR Verifies comment** in `DebugPortalPage.tsx:1` — freeform text, no ID
3. **Missing tests** for: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`

### Positives Confirmed

- No `console.log` in production source (logger abstraction working)
- No empty catch blocks
- No hardcoded secrets detected
- No skipped/todo tests
- 276 Verifies comments across backend + frontend test files
