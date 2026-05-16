# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Audit: 2026-05-16

### Two Applications in One Repo

This repo contains two entirely separate running applications:
- **Workflow Engine** (`Source/`) — spec: `Specifications/workflow-engine.md`
- **Dev Workflow Platform** (`portal/`) — spec: `Specifications/dev-workflow-platform.md`

The traceability enforcer only scans `Source/`. All portal/ requirements are invisible to it.
When scoping, always check both apps and note the enforcer gap in Scope & Environment.

### Grading: First Audit Landed at D

Config grade thresholds:
- A: max_p1=0, max_p2=3, min_spec_coverage=80
- B: max_p1=0, max_p2=8, min_spec_coverage=60
- C: max_p1=2, max_p2=15, min_spec_coverage=40
- D: max_p1=999

Grade path back to B: fix 3 P1s (one enforcer fix + two CVE patches with TheGuardians sign-off),
resolve 3 of 6 P2s, and re-run dynamic specialists with services up.

### Escalation Pattern

DEP-001 and DEP-002 both matched the "injection" escalation trigger.
No open PR was found on this branch, so the printf escalation path was used.
Always check `gh pr view` before choosing the escalation branch.

### Dynamic Specialists Skipped

Both performance-profiler and chaos-monkey were skipped because backend/frontend services were offline.
For a complete B-or-better audit, services must be running before dispatch.
Add service health check output to the Scope & Environment section so future audits have context.

### Cross-Reference Map Is High-Value

Section 8 is the most useful output for sprint planning. Three root causes cover 12 findings:
- Enforcer scope gap → QO-001, QO-005, QO-007 (3 findings, one-line fix)
- Incomplete dependency-linking → QO-002, QO-003, QO-004 (3 findings, one sprint)
- Build toolchain lag → DEP-005, DEP-P3-001..003, DEP-P3-007 (5 findings, one coordinated upgrade)

### Report Paths

- HTML report: `Teams/TheInspector/findings/audit-YYYY-MM-DD-{grade}.html`
- Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-YYYY-MM-DD.json`
- HTML files are gitignored (per findings/README.md); JSON is tracked.
- Run ID format: `run-YYYYMMDD-HHMMSS` (from pipeline-update.sh init)

### Supply Chain Surface

~2,000+ transitive npm deps across 10 manifests. Highest risk areas:
- `platform/orchestrator` — protobufjs direct dep + full @opentelemetry chain
- `portal/Frontend` — 416 dev deps (excessive; prune in quarterly review)
- Build toolchain (vite/vitest/esbuild) — single upgrade fixes cascading P3s
