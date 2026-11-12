# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-12 — First Audit Run

**False traceability gate is a recurring risk.**
The traceability enforcer uses `os.path.getmtime` to auto-pick only the most-recently-modified requirements file. This produces a false PASS that masks massive spec drift. Always note this in the executive summary and verify enforcer behavior before trusting its CI verdict.

**Specialist grades must be synthesized carefully.**
- quality-oracle gave D (2 P1, 26% spec coverage)
- dependency-auditor gave F (12 critical CVEs including exploitable auth bypass)
- The combined grade is F because config.grading.F is triggered by "exploitable auth bypass + critical domain failure" — proxy-addr IP spoofing (CVSS 9.1) qualifies as exploitable auth bypass even without authentication in the app layer, because it bypasses Express trust-proxy checks.

**Services were offline — performance-profiler and chaos-monkey were skipped.**
When services are offline, the report should explicitly call out what static analysis DID check (unbounded Map iteration, missing input validation) so operators understand partial coverage. Don't just say "skipped" — say what would have been tested.

**Cross-reference map is valuable for remediation planning.**
The vitest → tinypool finding (DEP-001 + DEP-005 share one fix) and the spec drift cluster (QO-002 + QO-003 + QO-004 + QO-005 share one root cause) are the most actionable insights. Always build the cross-ref map even when only 2 specialists run.

**portal/Backend is a scope ambiguity that must be resolved.**
CLAUDE.md says pipeline agents must not touch platform/. portal/Backend has 578 transitive deps and 61 vulns. The scope question (in-scope for production vs dev-only isolation) must be a solo-session architectural decision — flag it prominently in executive summary.

**Escalation triggers from config.escalation.security_triggers:**
- "auth bypass" → DEP-003 proxy-addr — ✅ escalated
- "injection" → DEP-002 handlebars — ✅ escalated (RCE via template injection)
- Watch for "sensitive data exposed", "hardcoded secret", "missing access control" in future runs
