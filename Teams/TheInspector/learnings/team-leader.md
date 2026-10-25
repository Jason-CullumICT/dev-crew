# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-25 — First full audit run

**Grading note:** Grade D was assigned because the combined P1 count (4) exceeded the Grade C ceiling (max 2). The quality-oracle independently graded itself C (1 P1), but the dependency-auditor surfaced 3 additional P1 CVEs that pushed the overall grade to D. Always combine counts across all specialists before assigning the grade.

**Specialist availability:** Performance-profiler and chaos-monkey could not run because backend (localhost:3001) and frontend (localhost:5173) were offline. In CI/audit-branch contexts where services are not started, both specialists must be marked "Not run" and the HTML report must note this prominently. Static analysis fallback was not triggered for these specialists in this run — consider running them in static-only mode in future if services remain offline.

**Escalation flow:** No open PR existed on the audit branch, so the GitHub PR comment escalation block could not be used. The terminal escalation block was used instead. Future runs: check `gh pr view` early in synthesis; if no PR exists, output the terminal escalation notice and document in inspector-report.md.

**Cross-reference mapping is high-value:** The cross-reference map (§8) revealed that 4 quality-oracle findings (QO-001, QO-003, QO-005, QO-007) all trace back to the same root cause — incomplete dependency-linking feature. Grouping them this way gives TheFixer a clear sprint theme rather than 4 unrelated tasks.

**Spec coverage interpretation:** The traceability enforcer PASSED (green) but covered only 13 of ~107 FRs. The true spec coverage is ~42%. Always run a manual FR count across Specifications/*.md and Plans/*/requirements.md in addition to the enforcer result — the enforcer's green status is misleading when its scope is narrow.

**First-audit baseline:** Because no prior audit file existed, all findings were marked NEW and the Fixed/Regressed sections were empty. The HTML report must always include §7 and §14 even if they are empty — omitting them would violate the 16-section requirement.

**File naming convention:** Reports saved to `Teams/TheInspector/findings/` use the pattern `audit-{date}-{grade}.html` and `bug-backlog-{date}.json`. Both the quality-oracle and dependency-auditor saved intermediate markdown findings to this directory as well (audit-2026-10-25-C.md, audit-2026-10-25.md) — this is fine; the HTML is the authoritative synthesised output.
