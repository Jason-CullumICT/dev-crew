# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-21 — First Audit Run

**Specialist availability pattern:**
- quality-oracle and dependency-auditor always run in static mode — no services needed.
- performance-profiler and chaos-monkey require live services. On this CI branch, backend (localhost:3001) and frontend (localhost:5173) were both offline. Plan for static-only runs when auditing undeployed branches.

**Spec coverage gotcha — exclude legacy specs:**
- `Specifications/dev-workflow-platform.md` contains 69 FR-IDs (FR-001–069) for a legacy portal product not in Source/. Including them in coverage metrics tanks the score from ~100% to ~17%. Always exclude them when computing Source/-relevant coverage.
- The enforcer only scans 13 requirements (Plans/). All agents will see "TRACEABILITY PASSED" even when Specifications/ FRs are untouched. This is a known false-pass (QO-005). Treat enforcer output as partial until QO-005 is fixed.

**Cross-referencing saves remediation work:**
- Three root-cause clusters resolved 12 findings between them. Always build §8 Cross-Reference Map before writing recommendations — it changes the fix priority order significantly.

**Escalation routing:**
- Dependency CVEs (RCE, code injection) → TheGuardians first, then TheFixer for implementation.
- platform/orchestrator changes always require solo session (pipeline agents cannot touch platform/).
- Spec/architecture fixes (QO-002, QO-003, QO-007) → requirements-reviewer, not TheFixer.

**Grade calibration:**
- C threshold is max 2 P1 findings. With 4 RCE CVEs escalated to security, grade will be D or F on any project with unpatched critical CVEs — even if the application code itself is healthy. Brief operators that dependency P1s are the primary grade driver and are resolved via package updates, not application rewrites.

**Report output paths:**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (repo root, per user convention)
