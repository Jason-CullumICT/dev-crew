# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-07-06 — First Audit Run (run-20260706-065058)

### Grading
- With any P1 findings, the grade drops to C or below regardless of P2 count. Both A and B require 0 P1s.
- This project's spec coverage is tracked by two separate tools:
  - `python3 tools/traceability-enforcer.py` — authoritative gate (reports PASSED for FR-WF-*)
  - `python3 tools/spec-drift-audit.py` — misconfigured; reports false 0% because FR-WF-* requirements live in `Plans/self-judging-workflow/requirements.md` not `Specifications/`. Do NOT use spec-drift-report.json as a health signal until QO-003 is fixed.

### Spec layout
- FR-WF-* requirements: `Plans/self-judging-workflow/requirements.md` (not Specifications/)
- FR-TMP-* requirements: `Specifications/tiered-merge-pipeline.md` (canonical location, correct)
- FR-dependency-* requirements: also in `Plans/self-judging-workflow/requirements.md`

### Service availability
- Backend (`http://localhost:3001/`) and Frontend (`http://localhost:5173`) were both offline during this audit.
- performance-profiler and chaos-monkey were therefore skipped. Re-run when services are live for complete coverage.

### Escalation
- No GitHub PR was open on this branch — escalation printed to stdout per protocol.
- TheGuardians must review before next release: DEP-001 (Handlebars RCE) and DEP-006 (Vitest RCE).

### Cross-reference shortcuts
- Fixing Vitest (DEP-006) also closes DEP-012 (@vitest/mocker) — document this as a free cleanup.
- Fixing Vite (DEP-007) also closes DEP-010 — same package, two CVEs.
- The QO-001 (missing /api/search) and QO-002 (service layer violation) are in the same code zone — send both to TheFixer together as a single service-layer extraction task.
