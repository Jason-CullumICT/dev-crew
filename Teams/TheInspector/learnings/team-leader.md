# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-27 — First audit

**Grading arithmetic:** When combining specialist grades, use total P1 count across ALL specialists against config thresholds. Quality-oracle alone was C (2 P1s), dependency-auditor alone was C (2 P1s), but combined = 4 P1s → D. Do not average grades — apply thresholds to aggregate counts.

**Transitive CVE classification:** Dependency-auditor correctly classified transitive-dependency CVEs as P1 even when the direct dependency doesn't have the CVE. The escalation path (TheGuardians) is correct for CVSS ≥8.0 regardless of transitive vs direct. Keep this classification.

**Performance/Chaos specialists absent when services are offline:** Services at localhost:3001 and localhost:5173 were not available in the audit environment. Document this explicitly in Section 4 (Scope & Environment) and Section 12 (Latency Baselines) with "Not measured" rather than omitting those sections. The 16 mandatory sections must always appear.

**Spec drift is structural, not code:** QO-002 (Specifications/ vs Source/ mismatch) routes to requirements-reviewer, not TheFixer. TheFixer handles code changes; structural spec decisions require a human or requirements-reviewer agent decision. Don't route spec strategy decisions to TheFixer.

**Cross-reference map saves remediation effort:** The Vite upgrade (one command) resolves 3 P2/P3 findings (DEP-005, DEP-006, DEP-007). The Express upgrade resolves 2 (DEP-003, DEP-009). Always build this map before writing recommendations — it changes the priority order.

**False-green CI warning pattern:** When a traceability enforcer passes but only covers a subset of Specifications/, flag this explicitly as a P1 spec-drift finding. The enforcer passing is a misleading signal if it doesn't cover the full Specifications/ directory.

**First audit baseline:** With no prior audit, Section 7 (Re-Verification) and Section 5 (Trend) have no data. Use "First audit — no baseline" explicitly. Do NOT leave these sections empty — they must render with a clear "first audit" message per the 16-section requirement.
