# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-08-04 — First Full Audit

### Grading mechanics
- The `grading` config is threshold-based: grade = highest tier where ALL conditions pass.
- Spec coverage alone cannot rescue a grade when P1 count exceeds the tier's `max_p1` ceiling.
- With 3 P1 findings, the project landed at D (C ceiling is `max_p1: 2`).

### Specialist handoffs
- quality-oracle and dependency-auditor produce distinct finding ID namespaces (QO-*, DEP-*).
  Dedup by root cause in the cross-reference map, not by ID or description similarity.
- performance-profiler and chaos-monkey require live services; check health endpoints before
  scheduling them, or note data gaps explicitly in §4 (Scope) and §12 (Latency Baselines).

### Cross-reference patterns seen
- Build tool supply chain CVEs often cluster: vitest + handlebars both appeared as P1 in the same cycle.
  Recommend grouping them under a single security sprint with TheGuardians.
- Traceability enforcer gaps: QO-003 (blind to portal/) and QO-004 (missing comment) share the same
  tooling root cause. Always check for cross-specialist root cause groupings before writing §8.

### Report generation
- All 16 HTML sections are mandatory; if a section has no data (§14 Fixed Findings on first run),
  include it with an explicit "First audit — no baseline" notice rather than omitting it.
- The risk matrix (§10) is the most useful view for operators: plot each finding at its
  Severity × Exploitability intersection; P1 + zero-precondition cells are the hottest.
- Bug backlog JSON should have `escalations` as a top-level array separate from `p1_findings`
  so downstream tools can filter easily.

### Escalation routing
- Trigger words from config: auth bypass, injection, sensitive data exposed, hardcoded secret,
  missing access control. DEP-001 (RCE) and DEP-002 (template injection) both qualified.
- When no PR is open, emit the plain-text escalation block to stdout rather than posting a PR comment.

### Files produced per audit
- `Teams/TheInspector/findings/audit-{date}-{grade}.html` — full 16-section report
- `Teams/TheInspector/findings/bug-backlog-{date}.json` — structured backlog
- `inspector-report.md` at repo root — summary with escalation block
