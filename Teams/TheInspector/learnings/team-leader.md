# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-07-15 — First Audit (run-20260715-051300)

### Grading calibration
- With 6 P1s and ~24% spec coverage, the project scores **D** (grade C requires max 2 P1s and 40% spec coverage).
- P1 findings split into two categories this audit: spec-drift (enforcer bug, missing FR coverage) and CVEs (RCE vulnerabilities). Both legitimately block deployment.

### Specialist report gaps
- performance-profiler and chaos-monkey submitted **no reports** when services are offline. Future audits should prompt these specialists to produce a static-only fallback (e.g., source analysis of pagination limits, concurrency handling) even when dynamic mode is unavailable.
- When dispatching these specialists, explicitly require a report even in static mode.

### Cross-reference synthesis patterns
- The traceability enforcer bug (QO-001) masks the spec coverage findings (QO-002, QO-003). These three findings share a single-fix root cause — fixing the enforcer immediately surfaces the coverage gap in CI. Tag as Root Cause Group when presenting to stakeholders.
- `npm audit fix` in Source/ resolves ~8 CVEs in a single command. Flag this to TheFixer as a high-ROI action.

### Routing decisions
- `platform/` findings (DEP-003, DEP-007, DEP-008) cannot be routed to TheFixer — that directory is solo-session only. Document this constraint explicitly in the backlog JSON so TheFixer doesn't attempt them.
- Spec coverage gaps (QO-002, QO-003) at 0% require a **product decision** before coding. Routing to TheFixer without direction wastes effort. Use "product-decision" as a routing category for these.

### Escalation triggers fired
- All three DEP-001/002/003 meet `config.escalation.security_triggers`: "injection" (Handlebars), code execution (Vitest, Protobufjs). The escalation_block was correctly constructed.
- No auth bypass, hardcoded secrets, or missing access control findings this audit — those would trigger different escalation language.

### First-audit baseline
- Grade D is the baseline. Future audits should show improvement on:
  1. Traceability enforcer fix (QO-001) → immediate CI regression prevention
  2. CVE remediation (DEP-001–008) → significant risk reduction
  3. Spec coverage requires product backlog work — long-tail improvement
