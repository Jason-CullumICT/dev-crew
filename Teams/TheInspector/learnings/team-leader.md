# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-12 — First audit run

**Grade calculation:** Apply `inspector.config.yml` grading thresholds strictly using *combined* P1/P2 counts across all specialists. The quality-oracle may assign a local B grade, but if dependency-auditor adds P1s that push the combined count above C threshold, the overall grade must drop to D.

**Static-only mode:** When both services are offline, performance-profiler and chaos-monkey are skipped entirely — do not attempt static approximations for those specialists; note the gap explicitly in §4 (Scope) and §12 (Latency Baselines).

**Dependency-auditor P1 classification:** CVEs with CVSS ≥9.8 are P1 regardless of runtime scope (test-time vs production). DEP-003 (Vitest UI RCE) is test infrastructure but still P1 — the risk is developer machine compromise and CI runner compromise.

**Cross-reference map (§8) discovery:** Group findings by *root cause workspace*, not by specialist. Three platform/orchestrator + portal/Backend CVEs (DEP-001, DEP-004, DEP-005) all resolve with a single `npm update` pass — present as one group to reduce remediation overhead.

**Escalation routing:** escalation.security_triggers in the config are keywords to match against finding descriptions — "injection" matched both DEP-001 (protobufjs code injection) and DEP-002 (template injection) and DEP-003 (missing authorization = access control). When no PR is open, emit the plain-text escalation block and direct to Teams/TheGuardians/team-leader.md.

**Report filename convention:** `audit-{date}-{grade}.html` per `config.report.filename_pattern`. The grade letter goes in the filename so it's visible in directory listings.

**Spec coverage caveat:** The traceability enforcer only covers `Plans/` scope (FR-WF-* and FR-dependency-* from the Plans/ directory). Specs in `Specifications/` that have no Plans/ entry (like tiered-merge-pipeline) are invisible to the enforcer — always report both enforcer-visible and true coverage separately.

**First audit baseline:** When no prior HTML report exists in findings/, §5 (Trend) and §7 (Re-Verification) must clearly state "First audit — no baseline" rather than leaving them empty or using placeholders.
