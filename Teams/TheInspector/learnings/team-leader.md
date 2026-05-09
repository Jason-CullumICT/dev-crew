# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-05-09 — First Audit Run

### Repo Structure
- This repo has **two independent production apps**: `Source/` (workflow engine) and `portal/` (dev-workflow-platform). Treat them as separate audit targets.
- `platform/` contains orchestrator infrastructure; agents must not touch it, but its FRs (FR-TMP-*) need traceability.
- The traceability enforcer only scans `Source/` and `E2E/` by default — **always pass `--plan` explicitly** and note that portal/ FRs are invisible under the default config.

### Grading
- With 2 P1s, the grade cannot exceed C regardless of spec coverage. Even transitive CVEs in test-only tooling count as P1s when CVSS ≥ 9.0.
- Spec coverage at 93% is strong but irrelevant for grade uplift when P1 count is the binding constraint.

### Specialist Dispatch
- performance-profiler and chaos-monkey require live services; if backend (localhost:3001) is unreachable, mark both as offline and note in scope section. Do not attempt static substitution — their absence is honest.
- quality-oracle and dependency-auditor always run static; they are never blocked by service availability.

### Cross-Reference Map (§8) — High Value
- Grouping QO-003 + QO-004 as "incomplete dependency feature" surfaced that one PR closes both P2s.
- Grouping DEP-001 + DEP-002 as "backend test toolchain" surfaced that one `npm update` pass resolves both.
- Always check if multiple findings share a root cause before routing — it reduces TheFixer PR count significantly.

### Escalation
- DEP-001 (Handlebars CVSS 9.8) triggered TheGuardians escalation. The config escalation triggers include "injection" — JavaScript injection via Handlebars AST type confusion qualifies.
- No PR was open so the escalation printed to stdout. That is correct fallback behaviour per the escalation block.

### Report Generation
- The HTML report filename pattern is `audit-{date}-{grade}.html` → saved to `Teams/TheInspector/findings/`.
- The JSON backlog pattern is `bug-backlog-{date}.json` → same directory.
- The `inspector-report.md` at repo root is a short summary for quick reading; the HTML is the canonical deliverable.
- Always generate the JSON backlog with a separate `escalations` array — TheFixer needs non-escalated findings only, TheGuardians needs the escalations array.
