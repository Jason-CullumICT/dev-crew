# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-06 — First Full Synthesis Run

**Grade calculation applies across all specialist P1s combined** — quality-oracle and dependency-auditor each graded themselves C, but combined P1 count (1 + 2 = 3) exceeded the C threshold (max_p1: 2), producing a D overall. Always aggregate across specialists before grading.

**performance-profiler and chaos-monkey require live services** — both were skipped because backend (localhost:3001) and frontend (localhost:5173) were offline. The audit branch exists specifically for the audit; services need to be running separately. Consider adding a pre-audit service startup check to the scoping phase and warning clearly in the report when dynamic specialists are skipped.

**Cross-reference map is the most actionable synthesis output** — four root causes were identified that collapse 14 findings into 4 coordinated fixes. This section (§8) should always be written before the recommendations (§15) because it drives the prioritisation logic.

**platform/orchestrator is the highest-risk module** — it is both infrastructure (off-limits to pipeline agents) and has the most impactful CVEs (protobufjs RCE, path-to-regexp ReDoS, dockerode outdated). Any finding in platform/ must be flagged for solo-session handling and elevated in the executive summary.

**Security escalation triggers from config work well** — the `security_triggers` list ("injection", "auth bypass", etc.) correctly caught DEP-001 (JavaScript Injection), DEP-002 (code execution), DEP-003 (ReDoS), DEP-006 (XSS). No false positives or missed triggers.

**First-audit reports should emphasise baseline creation** — the trend section (§5) and fixed findings section (§14) are empty on first run. Make this explicit rather than leaving them blank-looking. Future audits will have FIXED / STILL OPEN / REGRESSED comparisons.

**JSON backlog structure** — use three top-level arrays: `escalations` (for TheGuardians), `fixer_backlog.p1/p2/p3/p4` (for TheFixer by priority tier), and `cross_reference_map` (root causes). This structure allows tooling to ingest by priority without parsing full finding details.

**Spec coverage needs two numbers** — "enforcer-validated coverage" (12% — what the CI gate actually checks) and "estimated implementation coverage" (~88% — what quality-oracle manually assessed). Always report both and clarify the distinction. The gap between them is itself a P2 finding (QO-002).
