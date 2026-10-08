# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-08 — First combined audit run

**Grading with dev-only P1s:**
When a P1 finding has zero production runtime impact (e.g., vitest path traversal — dev server only), document the caveat explicitly but still report it as P1 to TheGuardians. For grading purposes, count production-affecting P1s only toward the config threshold; explain the decision in grade_rationale.

**Services were down — static mode only:**
Both backend (localhost:3001) and frontend (localhost:5173) were unreachable. performance-profiler and chaos-monkey had to be skipped. The grade should note that no dynamic coverage was possible. Next audit: ensure services are running before TheInspector fires.

**Quality oracle reports contain two artifacts:**
The quality oracle saves its own `audit-{date}-{grade}.md` internally as a findings artifact — this is not a "prior audit" baseline for trend comparison. Only the team leader's combined HTML report (this file) counts as the official audit record.

**Cross-reference map is the highest-value synthesis output:**
Grouping findings by root cause (orchestrator dependency debt, portal toolchain, spec drift programme) gives TheFixer concrete, batched work items rather than 11 disconnected tickets. Always build the cross-ref map before writing recommendations.

**Dependency audit grade interacts with quality oracle grade non-linearly:**
Quality oracle alone: B (0 P1s, 4 P2s). Dependency audit alone: C+. Combined: C (3 P1s, 11 P2s). The combined grade is always lower than any individual specialist. Communicate this to stakeholders who may see the quality oracle's B and expect that to be the overall.

**JSON backlog goes to different teams:**
- `escalations` array → TheGuardians (security findings)
- `p1_findings[0]` (QO-001 architecture violation) → TheFixer (not a security escalation)
- `p2_findings` → TheFixer (bug backlog)
- `p2_findings` with `route_to: "requirements-reviewer"` (QO-002, QO-003) → requirements-reviewer, not TheFixer

**inspector.config.yml grading thresholds:**
- A: max_p1: 0, max_p2: 3, min_spec_coverage: 80
- B: max_p1: 0, max_p2: 8, min_spec_coverage: 60
- C: max_p1: 2, max_p2: 15, min_spec_coverage: 40
- D: max_p1: 999
- F: reserved for exploitable auth bypass + critical domain failure
