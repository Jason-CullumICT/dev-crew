# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit 2026-04-21 (run-20260421-050018)

### Grading note: specialist grades ≠ combined grade
Quality-oracle graded the codebase C (1 P1). Dependency-auditor graded it B (2 P1s). The combined total is 3 P1s, which falls below the C threshold (max 2 P1s) → combined grade D. Always recompute grade from the merged finding counts, not by averaging specialist grades.

### platform/ findings count toward the grade even if non-fixable by pipeline agents
DEP-001 (protobufjs RCE) is in `platform/orchestrator/` and cannot be fixed by pipeline agents. However, it still counts as a P1 finding in the combined grade. Don't discount infrastructure findings — they represent real risk even with a different remediation path.

### performance-profiler and chaos-monkey require services to be running
Both specialists were skipped because backend/frontend were offline. When scoping an audit, check service health first. If services are offline, note in the report that dynamic results are absent and recommend a re-run with services up.

### Security escalation triggers: check all specialists, not just quality-oracle
The "injection" trigger in DEP-002 was surfaced by dependency-auditor, not quality-oracle. Always scan all specialist findings against `config.escalation.security_triggers` during synthesis.

### First combined audit has no FIXED items
When writing Section 14 (Fixed Findings), if this is the first combined audit (no prior HTML report in `findings/`), mark it clearly as "first audit — no baseline" rather than leaving the section empty or omitting it. This prevents confusion on next run.

### Dual logger modules are a common pattern violation
quality-oracle found two logger modules (`logger.ts` compat wrapper + `utils/logger.ts` canonical). This is a common pattern in Express backends where a compat shim was added to avoid refactoring all callsites. Flag it as P2 and include a cross-reference with the LOG_LEVEL finding since both share the same root module.

### Supply chain risk: 61:1 transitive-to-direct ratio is a structural signal
799 total dependencies from 13 direct is a high-risk ratio. Note this in the report and recommend CI-level scanning (npm audit) as a systemic fix rather than individual CVE patching.

### Spec coverage: 24% total vs 90% active scope — distinguish in the report
When spec coverage looks low (24%), always check whether inactive/roadmap specs are inflating the denominator. In this case, 79/82 untraced FRs are in specs tagged as roadmap or platform — the active scope coverage is actually 90%. Surface both numbers and explain the discrepancy.
