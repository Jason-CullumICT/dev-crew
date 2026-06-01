# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## 2026-06-01 — First Full System Health Audit

### Grading Outcome
- **Grade C** — 1 P1, 4 P2, 93% spec coverage
- Config thresholds make Grade B impossible with any P1 (max_p1=0 for B). One unimplemented route pushed us to C.
- Grade A would require: 0 P1, ≤3 P2, ≥80% coverage.

### Specialist Availability Pattern
- **Services were offline at audit time.** performance-profiler and chaos-monkey were skipped.
- quality-oracle and dependency-auditor are always static — they always run.
- Recommend running audits in environments where backend (port 3001) is live to get full coverage.

### Cross-Reference Patterns Found
- **Observability gap** is a recurring root cause: QO-002 (missing histogram) + QO-004 (no OTel tracing) + DEP-OTEL-001 (OTel version drift) all stem from the same root. One sprint fixes all three.
- **Incomplete feature branch** pattern: QO-001 + QO-003 + QO-002 are all from the dependency-linking feature that was partially implemented. When the quality-oracle surfaces multiple spec-drift findings from the same plan, check for an incomplete feature branch.

### Escalation Decision (First Audit)
- **No TheGuardians escalation.** None of the 11 findings triggered security keywords (auth bypass, injection, hardcoded secrets, missing access control, sensitive data exposed).
- The P1 (missing route) is a functional gap, not a security issue.
- If chaos-monkey had run and found state machine bypass or concurrent modification bugs, those might have triggered escalation. Re-run with services online.

### False-Green CI Gate (QO-005)
- The traceability enforcer `python3 tools/traceability-enforcer.py` is a false-green when multiple plans exist.
- Always run it with `--file Plans/dependency-linking/requirements.md` explicitly to surface dependency-linking gaps.
- This is a systemic tooling weakness — surfaced as P2, routed to TheFixer.

### Report Generation Notes
- HTML report written to `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog written to `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Entry point summary: `inspector-report.md` (repo root)
- INDEX.md updated to include grading history table — useful for trend tracking on future runs.

### Useful Synthesis Patterns
- **Cross-reference map (§8)** is the highest-value section for remediation planning. Always group findings by root cause first.
- **Grading before synthesis:** Tally P1/P2 counts early so the grade badge is set before writing the report.
- **"First audit" handling:** When no prior HTML report exists in `findings/`, all findings are NEW. The trend section should say "First audit — no baseline" and recommend re-running with services online.

### Timing
- Synthesis (reading two reports + generating HTML/JSON/MD) took one turn. Budget accordingly.
