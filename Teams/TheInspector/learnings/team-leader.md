# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-09-08 — First Audit Run

### Synthesis Patterns
- **Grade formula**: Apply `inspector.config.yml` grading thresholds to combined P1/P2 counts from ALL specialists, not per-specialist grades. Combined P1=5 → D even though dependency-auditor alone graded C.
- **Spec coverage 14%**: 77 domain FRs have zero traceability; only the active plan's 13 FRs are covered. Domain spec and codebase describe different systems — always surface this as P1 until resolved.
- **Escalation path**: No PR was open on this branch, so escalation used the console format. The gh pr comment path would have been cleaner — trigger audits on active PRs where possible.
- **Services offline**: performance-profiler and chaos-monkey were skipped. Static risk notes for those areas came from the config's `static_checks` and `threat_scenarios` — always include these in the latency and chaos sections even without dynamic data.
- **Cross-reference value**: Grouping DEP-001/002/003 under "no CVE scanning CI gate" as a single root cause made the remediation plan much more actionable than 3 separate tickets.

### Grading Calibration
- D threshold: any P1 count > 2 per `inspector.config.yml` → with 5 P1s (2 spec-drift + 3 CVE RCE) the grade is unambiguously D.
- First audit baselines matter: include "First audit — no baseline" clearly in section 5 and section 7 so future audits can see FIXED vs NEW clearly.

### File Locations
- Report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Escalation finding summary (console fallback): state all 3 CVE IDs + brief description in one line.
