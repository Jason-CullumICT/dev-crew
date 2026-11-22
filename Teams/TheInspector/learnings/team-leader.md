# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-22 — First Audit Run

**Grading logic order matters:**
- Check P1 count first. If P1 > config.grading.C.max_p1 (2), grade is D regardless of P2 count or spec coverage.
- Spec coverage drives distinction between B and C when P1=0; with high P1 it only affects whether we're at D vs F.
- The F grade applies specifically to "exploitable auth bypass + critical domain failure" — CVE-based RCE counts as injection/escalation, not domain auth bypass per se.

**CVE-sourced P1s vs architecture P1s are different escalation paths:**
- CVE P1s (DEP-001 through DEP-005) → TheGuardians (security triggers: auth bypass, injection, sensitive data exposed)
- Architecture P1s (QO-001 traceability blindspot, QO-002 OTel absent) → TheFixer

**Services offline pattern:**
- When services are offline, performance-profiler and chaos-monkey are both SKIPPED (chaos-monkey requires ALL services healthy).
- Note this clearly in Scope & Environment section and recommend re-running when services are healthy.
- Do not attempt static-only versions of these specialists — the finding set would be incomplete.

**Traceability enforcer auto-discovery is unreliable:**
- The enforcer picks up Plans/ requirements, not Specifications/. This is a known gap (QO-001).
- When computing spec coverage, do not trust the enforcer exit code — read the enforcer output for which file it selected.

**Cross-reference map is high-value for remediation:**
- Grouping by root cause (e.g., "outdated deps" covers 5 P1 CVEs with one npm update pass) makes the report actionable.
- The dependency feature incomplete implementation (5 P2s) is best expressed as one root cause with one fix.

**JSON backlog structure:**
- Use `escalations` array for TheGuardians findings (separate from `findings` array for TheFixer).
- Include `trigger` field on each escalation to map to inspector.config.yml `security_triggers`.

**HTML report format:**
- All 16 sections are mandatory; use "None" or placeholder text rather than omitting sections.
- Section 8 (Cross-Reference Map) is the most useful for remediation planning — build it carefully.
- Grade badge color: D = orange (#f97316), place escalation banner immediately after header.
