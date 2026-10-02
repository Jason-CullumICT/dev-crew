# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-10-02 — Grade C

### Spec Coverage Trend
- **Active plan coverage (FR-WF-*):** 100% — all 13 self-judging-workflow requirements traced in Source/
- **Domain spec coverage (Specifications/dev-workflow-platform.md):** 0% — 74 FRs for a different system entirely
- **Trend:** First audit; no prior baseline.

### Key Structural Facts (fast future lookups)
- **Traceability enforcer:** `tools/traceability-enforcer.py` — auto-targets most-recently-modified `Plans/*/requirements.md`. Only checks Plans/, not Specifications/.
- **Active requirements file:** `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* reqs)
- **Domain spec file:** `Specifications/dev-workflow-platform.md` (74 FR IDs, describes a SQLite feature-request system — currently misaligned with implementation)
- **Source dirs:** `Source/Backend/src/`, `Source/Frontend/src/`
- **Test dirs:** `Source/Backend/tests/`, `Source/Frontend/tests/`
- **No node_modules** — tests cannot be executed in this environment without `npm install`

### Common Patterns Found

#### Pattern Violations
1. **Routes bypass service layer** — `routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts` all `import * as store` directly. Architecture rule says service layer required.
2. **Two logger implementations** — `src/logger.ts` (compat shim) wraps `src/utils/logger.ts`. Technical debt.
3. **Logger no dev pretty-print** — `utils/logger.ts` always emits JSON, ignores NODE_ENV.
4. **ESLint-disable** in `DependencyPicker.tsx:82` and `useWorkItems.ts:63` for `react-hooks/exhaustive-deps`.

#### Traceability Patterns
- Tests use `// Verifies: FR-WF-XXX` and `// Verifies: FR-dependency-*` 
- `FR-dependency-*` IDs are freeform, not in any requirements.md, invisible to enforcer
- Production source files also have `// Verifies:` comments (good pattern)
- **No Verifies comments exist in source that reference the domain spec FR-001..FR-069**

#### Known Failing Tests
- `Source/Backend/tests/routes/search.test.ts` — explicitly documented to fail; `GET /api/search` not in `app.ts`

### Useful File Paths for Future Audits
```
Specifications/dev-workflow-platform.md     # Domain spec (74 FR IDs — currently misaligned)
Specifications/workflow-engine.md           # WorkItem system spec (no FR IDs yet)
Plans/self-judging-workflow/requirements.md # Active plan reqs (FR-WF-001..013)
Plans/dependency-linking/requirements.md    # Dependency feature reqs
tools/traceability-enforcer.py             # Traceability gate (narrow scope)
Source/Backend/src/app.ts                  # Route registration (search NOT registered)
Source/Backend/src/routes/workItems.ts     # Direct store calls (architecture violation)
Source/Backend/src/routes/workflow.ts      # Direct store calls (architecture violation)
Source/Backend/src/routes/intake.ts        # Direct store calls (architecture violation)
Source/Backend/src/logger.ts               # Compat shim (retire this)
Source/Backend/src/utils/logger.ts         # Real logger
Source/Backend/tests/routes/search.test.ts # Failing test — route not implemented
```

### Open P2 Findings (re-verify next run)
| ID | Status | Description |
|----|--------|-------------|
| QO-001 | OPEN | Domain spec (74 FRs) completely misaligned with implementation |
| QO-002 | OPEN | GET /api/search not implemented, tests will fail |
| QO-003 | OPEN | Routes import store directly, violating service layer rule |
| QO-004 | OPEN | Traceability enforcer too narrow — false confidence |
