# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-11-09 — First audit run

### Synthesis workflow
- Both specialist reports arrived as markdown files in the repo root (`quality-oracle-report.md`, `dependency-auditor-report.md`). The detailed dependency report was at `Teams/TheInspector/AUDIT_REPORT_2026-11-09.md`.
- performance-profiler and chaos-monkey were not run (services offline). Handle gracefully in §6 and §12 with SKIPPED cards and "services offline" note.
- For the first run there is no prior baseline — say "First audit — no baseline" in §5 and §7.

### Grading
- Grading config is mechanical: count P1s across ALL specialists combined before assigning grade. quality-oracle may estimate B for its own scope, but dependency-auditor P1s add to the total and push the combined grade to D.
- DA-001 and DA-005 share the same tinypool root cause — count them as separate findings but document the cross-ref. Single fix resolves both.

### Escalation
- Security triggers in config: "injection", "missing access control", "auth bypass", "sensitive data exposed", "hardcoded secret". All 5 CVE P1s in this audit matched "injection" or "missing access control".
- No PR was open (gh pr view exited 4) — used console escalation path instead.

### File locations
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Markdown report: `inspector-report.md` (repo root, as requested by parent session)

### Common patterns to watch
- Orphaned specs (dev-workflow-platform.md) inflate 0% coverage — always check spec provenance before alarming on coverage numbers.
- Traceability enforcer only scans one plan at a time — always verify it's covering all active plans.
- portal/Backend tends to accumulate the most dependencies (577) and vulnerabilities — prioritise it in dependency audits.
