# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Learnings

### 2026-07-07 — First Audit Run

**Grade calculation with multiple specialists:**
The grading config thresholds apply to the *combined* P1/P2 totals across all specialists. In this run, quality-oracle alone gave a C (1 P1, 3 P2s), but adding dependency-auditor's 3 P1 CVEs raised the combined count to 4 P1s → grade D. Always aggregate before grading.

**Escalation vs TheFixer routing:**
- DEP-CRIT-002 (Handlebars injection) and DEP-CRIT-003 (Protobufjs RCE) hit the "injection" escalation trigger.
- Vitest CVSS 9.8 (DEP-CRIT-001) is high severity but NOT an injection vector — route to TheFixer, not TheGuardians.
- When a finding is both P1 and an escalation trigger, it goes to TheGuardians first, then TheFixer patches after validation.

**Dependency CVE severity → finding severity mapping:**
The dependency-auditor classifies findings into P1/P2/P3/P4 based on its own risk matrix (CVSS scores, directness of dependency, patch availability). Use these directly — do not re-classify in synthesis.

**portal/Backend is the highest-risk manifest in this project:**
It carries 54 of 94 total CVEs (2 CRITICAL + 6 HIGH) because it has the most direct dependencies and uses @grpc/grpc-js. Always highlight portal/Backend as the first patching target.

**Services offline → specialists not run → note in scope section:**
When performance-profiler and chaos-monkey have no report, note them as "not run" in the specialist cards and add a callout in the Scope section. Do not attempt to infer their findings.

**Cross-reference map is the most actionable section:**
QO-002+QO-003+QO-004 (pending_dependencies feature) share a single root cause — the enum value. Highlighting this in §8 means TheFixer can fix 3 P2s in a single PR. Always look for coupled findings before writing recommendations.

**traceability-enforcer.py is scope-limited:**
The enforcer only covers plans listed in its config (here: FR-WF-*). It will report PASSED even when FR-dependency-* requirements have defects. QO-006 should be a standing P3 in every audit until the enforcer is extended.

**Finding count summary for this run:**
- quality-oracle: 1 P1, 3 P2, 3 P3, 1 P4 (8 total)
- dependency-auditor: 3 P1, ~8 P2, ~27 P3, ~21 P4 (94 CVE total, but grouped into distinct finding IDs)
- Combined report: 4 P1, 11 P2, 30 P3, 22 P4
