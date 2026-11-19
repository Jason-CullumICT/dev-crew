# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-11-19 — First Audit Run

### Scoping
- Services (backend :3001, frontend :5173) were offline at audit time → performance-profiler and chaos-monkey auto-skipped. Always check service availability before dispatching dynamic specialists.
- Both specialist reports were placed at repo root (`quality-oracle-report.md`, `dependency-auditor-report.md`) — consistent with team convention.
- Full dependency detail was also saved to `Teams/TheInspector/findings/dependency-audit-2026-11-19.md` by the dependency-auditor.

### Grading Logic
- Grade thresholds from `inspector.config.yml` gate on (max_p1, max_p2, min_spec_coverage) simultaneously — a project can fail grade C on P1 count alone even with acceptable P2s.
- 4 P1s + 17% spec coverage → Grade D (C requires max_p1≤2 AND coverage≥40%).

### Escalation Routing
- 3 findings escalated to TheGuardians: DEP-001 (injection), DEP-002 (auth bypass), DEP-005 (open redirect).
- No PR was open on this branch, so escalation printed to stdout instead of posting a GH comment. That is the correct fallback.

### Cross-Reference Map (Section 8) Value
- The cross-ref map revealed that `npm update express` in backend+orchestrator closes 3 findings (DEP-003, DEP-004, DEP-014 partial) in one shot. Surface this pattern early in recommendations.

### Output Paths
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` at repo root (user-requested convention)
