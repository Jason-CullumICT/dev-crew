# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run: 2026-08-15 (run-20260815-030545)

### Grading Reference

Config thresholds (inspector.config.yml):
- **A:** max_p1=0, max_p2=3, min_spec_coverage=80%
- **B:** max_p1=0, max_p2=8, min_spec_coverage=60%
- **C:** max_p1=2, max_p2=15, min_spec_coverage=40%
- **D:** any excess beyond C thresholds
- **F:** exploitable auth bypass + critical domain failure

First-run result: **D** (5 P1s exceeded C max of 2). Spec coverage for active Source/ FRs was excellent (96%) — the grade was pulled down entirely by CVE severity, not quality.

### Escalation Trigger Mapping

Security triggers from config that fired:
- `injection` → DEP-004 (Handlebars JavaScript Injection / CVSS 8.1) → TheGuardians
- `injection / RCE` → DEP-001, DEP-002 (vitest protobufjs chain) → TheGuardians

Non-triggers (do NOT escalate):
- Architecture violations (QO-003) → TheFixer
- Spec-drift / missing routes (QO-001) → TheFixer
- DoS-only CVEs without code injection (DEP-003, DEP-009, DEP-010, DEP-011, DEP-012) → TheFixer

### Service Availability Pattern

Both services were offline during this audit (localhost:3001 and localhost:5173 unreachable).
Result: performance-profiler and chaos-monkey were skipped.
**Impact on grade:** Static-only audits miss latency regressions and fault-handling bugs.
Always note "services offline" in the scope section so operators know to re-run dynamically.

### Specialist Report Parsing

- quality-oracle report: JSON summary embedded at bottom of markdown — parse for grades, findings list
- dependency-auditor report: Summary text + detailed DEPENDENCY_AUDIT_{date}.md in findings/ dir
- Both specialist self-grades (C, D/F by project) should be noted but the team-leader's combined grade overrides per config thresholds

### Cross-Reference Discovery

Three root causes accounted for 14/31 findings. When synthesising:
1. Group findings that share a fix command (e.g. same `npm update` in same project)
2. Group findings that share a structural cause (missing service layer → both QO-001 and QO-003)
3. Group tooling gap findings (QO-002 and QO-004 both trace to spec-drift-audit.py scanning the wrong directories)

Cross-refs spanning multiple specialists: DEP-010 cross-refs performance-profiler (js-yaml DoS in critical path) — useful for prioritisation when dynamic profiler runs.

### Report Structure Notes

- All 16 sections must be present; "None" or placeholder for sections with no data (§14 Fixed, §12 Latency in static-only runs)
- §8 Cross-Reference Map is the highest-value section for remediation teams — build it carefully
- §10 Risk Matrix: "CI/Build pipeline" exploitability column captures devDep CVEs correctly (DEP-001, DEP-002 are devDeps but still P1 because CI is the attack surface)
- Grade badge color: A=green, B=blue, C=amber, D=orange/red, F=red (see --grade-d var in HTML)

### Baseline for Next Run

Targets to reach **Grade C** by next sprint:
- P1 count: 5 → 0 (fix all CVEs + implement search route)
- P2 count: 11 → ≤8 (clear portal CVE sprint)
- Spec coverage: maintain ≥80% (currently 96% for Source/ scope — guard against regression)
- Re-run with services live to get performance-profiler and chaos-monkey data

### Watch List for Next Audit

- `GET /api/work-items` has no pagination — expected to appear as perf finding when profiler runs dynamically
- Concurrent state transition race condition in in-memory store — expected chaos-monkey finding
- In-memory store: no persistence — chaos scenario "backend restart loses all data" needs documentation as accepted design constraint vs. bug
