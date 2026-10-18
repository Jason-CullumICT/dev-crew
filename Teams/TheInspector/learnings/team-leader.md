# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-18 — First full synthesis run

**Grading when specialists report partial data:**
- Two specialists were skipped (services offline). Grade is still computed from available data — do not wait for skipped specialists before synthesising. Note clearly in the report which specialists ran and which were skipped.
- A D grade can be assigned with only 2 specialists if P1 count exceeds the C threshold (max_p1: 2). In this run, 6 P1 findings (5 CVEs + 1 spec-drift) drove the D grade regardless of coverage metrics.

**Cross-reference deduplication is high value:**
- DEP-001 + DEP-004 shared a root cause (outdated vitest). Surfacing this in §8 Cross-Reference Map gave the reader a clear "one `npm update vitest` closes 3 findings" signal. Always group by root cause, not by finding ID.
- Similarly DEP-002 + DEP-006 + DEP-010 all traced to the same OpenTelemetry version. One upgrade closes all three.

**Escalation routing:**
- The dependency-auditor's escalation list (DEP-001/002/003/004/008) is the canonical set for TheGuardians. Do not re-escalate findings the specialist already routed; do add any QO findings that match the `escalation.security_triggers` patterns.
- DEP-005 (Handlebars via jest) did NOT appear in the dependency-auditor's escalation list despite being P1 — routed to TheFixer instead. When in doubt on test-only vulnerabilities, route to TheFixer unless the exploit is achievable from outside the test environment.

**Spec governance findings are P1 when they affect agent decision-making:**
- QO-001 was correctly elevated to P1 because a future agent reading the spec as authoritative could build the wrong product. The risk is not to runtime users but to the development pipeline itself. This is a valid P1 in the inspector.config.yml "spec-drift" category.

**Static-only runs should always note what was not tested:**
- Latency baselines (§12) and chaos scenarios are critical for production-readiness. When services are offline, the report must explicitly list the untested scenarios and recommend a follow-up dynamic run. Never leave §12 empty — include the configured budgets as a reference.

**Bug backlog JSON structure:**
- Keep `escalations` array separate from `backlog`. Tools that consume the JSON can filter by `route` field ("TheGuardians" vs "TheFixer" vs "requirements-reviewer") without needing to know the severity.

**Baseline note:**
- Always populate §5 Trend. First run = "First audit — no baseline" with a table of the baseline metrics. Future runs must compare against this.
