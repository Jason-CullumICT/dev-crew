# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-25

### Spec Coverage Trend

- **Official `Specifications/` coverage:** 0 % (79 requirements, 0 traced)
- **Active `Plans/` coverage:** 100 % (13 requirements, all traced)
- **Trend:** First run — no prior baseline.

### Key Discovery: Dual-Track Traceability System

The project operates two separate spec tracks:

1. **`Specifications/`** — canonical domain truth per CLAUDE.md, but contains specs for three distinct products:
   - `dev-workflow-platform.md` (FR-001 to FR-069): a Feature Request + Dev Cycle platform — **NOT implemented** in `Source/`
   - `tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010): merge pipeline orchestrator — lives in `platform/` not `Source/`
   - `workflow-engine.md`: domain spec for what IS built, but **has no FR-XXX identifiers**

2. **`Plans/self-judging-workflow/requirements.md`** (FR-WF-001 to FR-WF-013) — the actual traceable spec for current `Source/`. The traceability enforcer uses this file.

**Root cause of grade D:** The `Specifications/` directory is not the traceability anchor for the current implementation. The architecture mandate in CLAUDE.md (`Specifications → Plans → Source`) is inverted in practice.

### Common Pattern Violations Found

- Route handlers in `workflow.ts` and `workItems.ts` call `store.*` directly (bypasses service layer)
- No OpenTelemetry instrumentation anywhere in `Source/Backend/src/`
- `GET /api/search` is tested but not wired into `app.ts`
- Two duplicate test files for `WorkItemDetailPage` and `WorkItemListPage`

### Useful File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | Active FR-WF-XXX requirements (what enforcer checks) |
| `Specifications/workflow-engine.md` | Domain spec — no IDs, but matches what is built |
| `Source/Backend/src/app.ts` | Route registration — check for missing/orphaned routes |
| `Source/Backend/src/routes/workflow.ts` | Largest route file (374 lines) — most arch debt |
| `Source/Frontend/tests/` | Contains duplicate test dirs (`tests/` and `tests/pages/`) |
| `tools/traceability-enforcer.py` | Only scans `Plans/` — gap vs `Specifications/` |

### Patterns That Worked Well

- **All production source files have `// Verifies:` comments** (99% coverage) — only `vite-env.d.ts` (TypeScript declaration file) is exempt
- **No `console.log` in production source** — logger abstraction is uniformly used
- **No hardcoded secrets** — environment variables used throughout
- **No `test.skip` / `xdescribe`** — all tests are active (though some will fail due to QO-005)

### Grading Reference

Per `inspector.config.yml`:
```yaml
A: { max_p1: 0, max_p2: 3, min_spec_coverage: 80 }   # needs Specs/ coverage
B: { max_p1: 0, max_p2: 8, min_spec_coverage: 60 }
C: { max_p1: 2, max_p2: 15, min_spec_coverage: 40 }
D: { max_p1: 999 }
```
Current: 2 × P1 → Grade D. Resolving QO-001 + QO-002 (spec alignment) would unlock Grade C+ with the existing code quality.
