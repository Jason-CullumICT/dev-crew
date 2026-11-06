# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

_(none yet — add discoveries here after your first run)_

## 2026-11-06 — First Full Combined Audit

### Synthesis observations
- When services are offline, performance-profiler and chaos-monkey cannot run. Document this clearly in the report rather than skipping those sections — the static risks from inspector.config.yml are still worth flagging.
- The dependency-auditor may surface CVEs that cross the security escalation threshold (config.escalation.security_triggers). Check all CVE CWEs against triggers: CWE-862 → "missing access control", CWE-290 → "auth bypass", CWE-22/94 → "injection".
- Stacked CVEs (individually medium CVSS but combined = P1) require team-leader synthesis — no single specialist sees the full stack. The @vitest/mocker CVEs (CVSS 5.9 and 4.7) become P1 when combined with the vitest RCE network access path (CVSS 9.8).
- When grading, check ALL P1 counts from ALL specialists together against the config.grading thresholds — not per-specialist.
- Cross-reference map (Section 8) is valuable for remediation: grouping DEP-001/003/004 under "vitest outdated" means the engineer knows ONE command resolves THREE P1 CVEs.
- Quality oracle's false-green gate finding (QO-002) is itself a P1 — it hides QO-003. Always surface meta-tooling findings at high severity.
- First audit has no FIXED/STILL OPEN/REGRESSED deltas — make this clear in Section 7 and Section 14 rather than leaving them blank.
