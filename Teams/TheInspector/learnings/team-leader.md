# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-19 — First audit run

**Service availability matters for scope.** When backend/frontend services are offline, performance-profiler and chaos-monkey must be skipped entirely. Always check service health before dispatching dynamic-mode specialists; document skips clearly in the report so readers understand the reduced coverage.

**Dependency audits dominate the grade.** The quality-oracle returned grade B (zero P1s), but dependency-auditor returned three CVSS-9.8 P1 CVEs, pulling the combined grade to D. When dependency-auditor runs, its severity findings drive the overall score more than code-quality findings.

**Inspector.config.yml `source.dirs` gap.** The config only lists `Source/` and `E2E/` — not `portal/` which contains the primary product with 937+ traceability comments across 7 plans. This means the traceability gate only verifies one of eight plans. Always check whether the enforcer scope covers all app directories before reporting coverage.

**Escalation routing.** P1 CVEs with code-execution or file-read vectors go to TheGuardians, not TheFixer. High/moderate CVEs that are patch-only (no security analysis needed) go to TheFixer. The line is: does it need exploitability assessment, or just a version bump?

**First audit = no trend data.** Section 5 (Trend) was "First audit — no baseline" and Section 7 (Re-Verification) had all NEW findings. Subsequent audits should compare counts and call out FIXED/REGRESSED explicitly.

**Cross-reference map ROI.** Three root-cause groups were identified:
1. Vite toolchain (DEP-004 + DEP-013) — one `npm update vite` resolves both
2. Enforcer scope gap (QO-001 + QO-007) — one config change resolves both
3. OTel stack (QO-004 + DEP-017 + DEP-018) — one coordinated upgrade sprint resolves three findings

Identifying these groups early saves remediation effort; always look for findings that share a common package, config, or file before presenting them as independent.

**Grading threshold check.** With max_p1=2 for grade C and 3 P1 findings, the grade is D. The grading formula in inspector.config.yml is strict — even one extra P1 above the ceiling drops the entire grade. Remind the user that dependency patches alone can recover two letter grades.

**Report file naming.** Output files follow `audit-{date}-{grade}.html` and `bug-backlog-{date}.json` patterns per config. Always include the grade in the HTML filename so it is visible in directory listings without opening the file.
