# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-14 — First full audit

### Spec Coverage Trend
- **Baseline**: 17.6% (15 / 85 Specification FRs traced to Source/)
- The 69 regular FRs (FR-001 through FR-069) have zero coverage — they describe a different, superseded product (SQLite portal app). Only FR-dependency-* IDs are traced.

### Critical Structural Issue (always re-check)
The traceability enforcer (`tools/traceability-enforcer.py`) reads the **most recently modified `requirements.md` under `Plans/`** — NOT `Specifications/`. On every run, confirm which file it targeted. If it still targets a Plan file while the audit counts Specification FRs, the PASSED result is misleading.

**Command to verify**: `python3 tools/traceability-enforcer.py` — read the "Targeting requirements from:" line carefully.

### Useful File Paths for Future Audits
| Path | What it contains |
|------|-----------------|
| `Plans/self-judging-workflow/requirements.md` | 13 FR-WF-* IDs — what the enforcer currently checks |
| `Plans/dependency-linking/requirements.md` | 16 FR-dependency-* IDs + known gap status (❌ sections) |
| `Specifications/dev-workflow-platform.md` | The authoritative spec (85 FRs total) — currently mismatched with implementation |
| `Source/Backend/src/app.ts` | Route registration — check here for missing route wiring |
| `Source/Backend/tests/routes/search.test.ts` | 5 tests for unwired GET /api/search — check if still failing |

### Common Pattern Violations Found
1. **Direct store calls from route handlers** — workItems.ts and workflow.ts both call `store.*` directly in handler bodies. The architecture rule prohibits this. Look for `store.find`, `store.create`, `store.update` in route files.
2. **eslint-disable without justification** — Found at DependencyPicker.tsx:82 and useWorkItems.ts:63. Pattern: `// eslint-disable-next-line react-hooks/exhaustive-deps` with no rationale comment above it.
3. **Two logger files** — `src/logger.ts` and `src/utils/logger.ts`. Check if this has been consolidated in future runs.

### Known Open Gaps (carry forward until fixed)
| ID | Status | Gap |
|----|--------|-----|
| QO-001 | OPEN | Traceability enforcer targets Plans not Specifications |
| QO-002 | OPEN | FR-001 – FR-069 specs never implemented |
| QO-003 | OPEN | GET /api/search route not wired in app.ts |
| QO-004 | OPEN | Direct store calls from route handlers |
| QO-005 | OPEN | FR-dependency-seed not implemented |

### Grading Notes
- Grading thresholds are in `Teams/TheInspector/inspector.config.yml`
- With 3 P1s and 17.6% spec coverage → Grade D (per config: D = anything with P1s > 2)
- To reach grade C: resolve all 3 P1s, get spec coverage above 40%
- To reach grade B: resolve all P1s, ≤8 P2s, spec coverage ≥60%
