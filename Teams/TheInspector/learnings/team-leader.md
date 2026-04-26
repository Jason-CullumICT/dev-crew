# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-04-26 (run-20260426-052402)

### Grading

- With combined quality-oracle + dependency-auditor, total P1s can exceed the grading threshold even when code quality alone is acceptable. The dependency scan added 2 P1 CVEs that pushed the combined grade from C to D.
- When dependency-auditor reports P2 "High" counts in its executive summary but classifies individual findings as P3 in the detailed report (e.g., OTel gap DEP-014), use the executive summary count for grading to be consistent with the auditor's own assessment.

### Service Availability

- Services (backend: localhost:3001, frontend: localhost:5173) were offline at audit time. This is expected in CI/remote audit environments.
- Always include a note in §4 and §12 explaining that performance/chaos results are deferred when services are offline — don't omit these sections, just flag them clearly.
- Re-run with live services to complete latency baselines and chaos scenarios.

### Cross-Reference Map (§8)

- The most valuable cross-references are "one fix resolves N findings" — surface these explicitly (e.g., updating OTel resolves both the protobufjs RCE and the OTel version gap).
- For dependency CVE clusters (Vite/vitest/postcss/esbuild), group them under a single "toolchain update" action to avoid overwhelming TheFixer with individually small tasks.

### Escalation Triggers

- Both "injection" and "RCE" patterns trigger the security_escalation_team (TheGuardians). Handlebars template injection and protobufjs code execution both qualify.
- When no PR is open and no repo remote is found, the escalation falls back to console output — this is expected behaviour; document it in §3 header banner so operators see it immediately.

### Report Structure

- The escalation banner should appear at the top of §1 (before the TOC) so it's impossible to miss.
- §12 (Latency Baselines) should always be included even with no data — show the configured budgets from inspector.config.yml as "targets pending measurement".
- §7 (Re-Verification) should note "first audit — all NEW" clearly rather than leaving the FIXED/STILL OPEN rows empty without explanation.

### Spec Coverage Nuance

- The Specifications/ corpus has 0% coverage for features not yet built (FR-001–069, FR-TMP-*). This is intentional — don't alarm the reader. Explain that these are future features not yet in Source/.
- For grading, prefer the "active plan" coverage (100%) as the primary spec coverage metric, since that's what the enforcer actually tracks. Flag the broader corpus as a secondary concern.
