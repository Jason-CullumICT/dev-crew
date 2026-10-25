# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-25 — Grade C

### Spec Coverage Trend
- **First baseline run.** Coverage is ~42% of all defined FRs.
- `Plans/self-judging-workflow/requirements.md` (FR-WF-001…013): 100% ✅
- `Specifications/dev-workflow-platform.md` (FR-001…069): 0% — unimplemented or superseded
- `Specifications/tiered-merge-pipeline.md` (FR-TMP-001…010): 0% in Source/ — lives in platform/ only
- `Plans/dependency-linking` (FR-dependency-*): ~87%

### Traceability Enforcer Scope
The enforcer at `tools/traceability-enforcer.py` only targets the most-recently-modified `Plans/*/requirements.md`. It currently picks `Plans/self-judging-workflow/requirements.md`. All other specs are invisible to the gate. **Do not trust "TRACEABILITY PASSED" as full coverage.**

### Key File Paths (for fast future audits)
- Specs: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- All FR IDs live in: `Specifications/dev-workflow-platform.md` (FR-001…069), `Plans/self-judging-workflow/requirements.md` (FR-WF-001…013), `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Traceability grep: `grep -rn "Verifies:" Source/ --include="*.ts"`
- No search route: `Source/Backend/src/app.ts` — search router NOT imported
- Known open items: FR-dependency-seed (no seed file), FR-dependency-api-types (partially open), FR-dependency-search (route missing)

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` at `Source/Frontend/src/hooks/useWorkItems.ts:63` — P3
- `WorkItemStatus` enum lacks `pending_dependencies` value — P2
- `parseItemId` utility missing from Shared types — P3

### Scope Note
- `dev-workflow-platform.md` (FR-001…069) describes a SQLite-backed system. The implementation uses an in-memory store (workflow-engine spec). These may be competing/superseded specs — needs clarification from solo-session.
- `FR-TMP-*` is implemented in `platform/orchestrator/lib/` (orchestrator JS), not in `Source/`. `Source/E2E/tests/` directory does not exist yet.

### Open P2+ Items (check next run)
| ID | Finding | Status |
|----|---------|--------|
| QO-001 | GET /api/search route missing | OPEN |
| QO-002 | Traceability enforcer scope gap | OPEN |
| QO-003 | FR-dependency-seed not implemented | OPEN |
| QO-004 | FR-TMP-* no Source/ traceability | OPEN |
| QO-005 | pending_dependencies missing from WorkItemStatus | OPEN |
