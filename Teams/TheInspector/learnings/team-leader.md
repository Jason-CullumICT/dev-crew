# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-22 — First audit run

**Services offline during audit:**
- Backend (localhost:3001) and Frontend (localhost:5173) were both DOWN during the audit.
- performance-profiler and chaos-monkey must be skipped when services are offline — do not attempt static fallback for dynamic-only specialists; just mark them skipped and note in the report.
- Document this prominently in §4 (Scope & Environment) so the reader understands latency baselines are missing.

**Traceability enforcer is misconfigured for portal/:**
- `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`.
- 76 portal/ requirements (Specifications/dev-workflow-platform.md) will always show as untraced until portal/ is added.
- This creates a permanent false-negative P1 that blocks the enforcer from being used as a reliable gate.
- In future audits: run the enforcer ONLY against specs that map to Source/ (FR-WF-*, FR-dependency-*) until QO-002 is fixed.

**Dep auditor grades independently and conservatively:**
- dependency-auditor graded the project D on its own (2 P1 CVEs).
- When combining with quality-oracle's 1 P1, the combined audit also lands at D (3 P1 > C threshold of 2).
- Grade calculation: P1 count across ALL specialists determines the floor; then check P2 count.

**Cross-ref map is the highest-value synthesis output:**
- The cross-reference map (§8) identified 5 root-cause clusters where a single fix resolves 2-4 findings simultaneously.
- Most impactful: vitest sweep resolves DEP-001 + DEP-005 (2 P1/P2 escalations) in one npm command.
- prom-client Histogram fix resolves QO-005 + QO-006 together.
- Always build cross-refs before writing recommendations — they make recommendations much more actionable.

**Positive signals matter for operator confidence:**
- The project has genuinely strong code hygiene (no console.log, no empty catch, 100% list wrappers, no hardcoded secrets).
- Always surface these — a D grade can still have excellent code discipline; the D is from CVEs + tooling gaps, not sloppy coding.

**Escalation threshold:**
- Any CVE with CVSS ≥ 8.0 in a production or infrastructure path → TheGuardians escalation.
- Path traversal and open redirect also qualify under "injection" and "missing access control" triggers in config.escalation.
- Always run the escalation block (console output when no PR context) — don't skip it.

**Report file naming:**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Always also write `inspector-report.md` at repo root as the markdown summary.
