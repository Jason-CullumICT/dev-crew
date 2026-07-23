# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Audit Run: 2026-07-23

### Scoping
- Both services (backend port 3001, frontend port 5173) were offline. Performance-profiler and chaos-monkey had to run static-only. Next audit: verify services are up before dispatching dynamic-mode specialists.
- `inspector.config.yml` was present and well-configured. The `specs.dir: "Specifications/"` setting is the source of truth for coverage — not `Plans/`.
- The traceability enforcer (`python3 tools/traceability-enforcer.py`) consistently reports PASSED even with 0% domain-spec coverage (QO-002). Do not trust its exit code until QO-002 is fixed.

### Synthesis Patterns
- Cross-referencing findings from quality-oracle and dependency-auditor surfaced four shared root causes that each resolve multiple findings at once. Always build the cross-ref map (§8) — it's the highest-value remediation planning tool.
- Security escalation triggers fired on CRIT-001/003 (injection) and CRIT-002 (missing access control). All three met the `config.escalation.security_triggers` criteria.
- First audit always has 0 FIXED and 0 REGRESSED. The trend section (§5) must say "First audit — no baseline."

### Grading Calibration
- Grade D is assigned when spec coverage is 0% regardless of P1 count (0% fails below the C threshold of 40%). With both 5 P1s AND 0% spec coverage, D is correct.
- F is reserved for exploitable auth bypass + critical domain failure. Not triggered here (no auth in this system by design).

### Report Generation
- The 16-section HTML report was generated at `Teams/TheInspector/findings/audit-2026-07-23-D.html`.
- Bug backlog JSON at `Teams/TheInspector/findings/bug-backlog-2026-07-23.json` — includes separate `escalations` array for TheGuardians, and `cross_reference_map` for remediation planning.
- Summary markdown at `inspector-report.md` in the repo root.

### Watch List for Next Audit
- **QO-001/002**: Will remain OPEN until traceability enforcer is fixed and spec annotations are added. Track as "STILL OPEN" next run.
- **CRIT-001/002/003**: Should be FIXED next run (npm update is the fix). If still open, mark REGRESSED.
- **HIGH-001 through HIGH-006**: Should be FIXED after next sprint's npm update sweep.
- **QO-003/004/005/006**: Route handler + logger refactor. Track for TheFixer completion.
- Dynamic testing: if services are up next audit, performance-profiler should benchmark `GET /api/work-items` (budget: p95 ≤ 100ms) and chaos-monkey should test concurrent state transitions and malformed body handling.
