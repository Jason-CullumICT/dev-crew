# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Audit: 2026-06-11

**Grading logic:** When dependency-auditor returns P1 CVEs, the combined grade is determined by config.grading thresholds, not the specialist's own grade. Specialist D + specialist B → combined C (2 P1s fit C threshold: max_p1=2). Never blindly inherit a specialist's worst grade.

**First synthesis baseline:** No prior inspector HTML existed — only a quality-oracle sub-report in findings/. Always check for a prior `audit-*-*.html` before generating trend section; if absent, label all findings NEW and note "first audit — no baseline."

**Escalation routing:** Both P1 findings this run were dev/build toolchain CVEs (handlebars via ts-jest, vitest path traversal). Neither was a production runtime CVE, but both still escalate to TheGuardians because CI code execution and dev-server source exfiltration are security-domain concerns, not just dependency hygiene.

**Cross-reference map pays off:** Root Cause A (missing blocked_by in Shared/api.ts) resolved QO-001 + QO-003 together. Root Cause C (vitest@2 outdated) resolved DEP-007 (P1) + DEP-009 + DEP-012 with one command. Always build this map — it dramatically reduces perceived remediation burden.

**Skipped specialists:** When backend is offline, mark performance-profiler and chaos-monkey as skipped with clear caveat in Section 4 and Section 12. Do not invent latency numbers; do show the configured budgets as context.

**FR ID collision risk:** Two plans (orchestrator-cycle-dashboard, image-upload) both define FR-070..076 for different features. This makes the traceability enforcer unreliable. Surface this as a P2 spec-drift finding whenever detected — it is not cosmetic.

**Supply chain signal:** Zero post-install scripts across all 10 npm manifests is a strong positive signal. Record it explicitly in the scorecard to differentiate from repos that have install-time script exposure.
