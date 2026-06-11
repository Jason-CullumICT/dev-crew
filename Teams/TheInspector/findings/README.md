# TheInspector Findings

This directory contains audit reports from the **TheInspector** specialist team.

## Recent Audits

### Dependency Auditor – 2026-06-11
- **Status:** ⚠️ **GRADE D** (Critical CVEs in production/build infrastructure)
- **Report:** [dependency-audit-2026-06-11.md](dependency-audit-2026-06-11.md)
- **JSON Summary:** [dependency-audit-2026-06-11.json](dependency-audit-2026-06-11.json)

**Quick Summary:**
- 18 total CVEs (2 critical, 5 high, 9 moderate, 2 low)
- **Critical:** JavaScript injection in handlebars (via ts-jest) + Vitest path traversal chain
- **Action Items:** 3 immediate fixes, then medium-term upgrades
- **Escalations:** TheGuardians (code injection + source exposure), red-teamer (query string + redirect attacks)

---

## File Organization

- `dependency-audit-YYYY-MM-DD.md` — Human-readable audit report
- `dependency-audit-YYYY-MM-DD.json` — Machine-readable findings (for dashboard integration)

## Audit Cadence

- **Dependency Auditor:** Monthly (or on-demand for new package additions)
- **Quality Oracle:** Continuous (spec coverage, test coverage)
- **Red Teamer:** On-demand or per-phase
- **Chaos Monkey:** Per deployment or on-demand

## Escalation Contacts

| Finding Type | Escalate To | Reason |
|---|---|---|
| Code injection, hardcoded secrets, auth bypass | [TheGuardians](../../../Teams/TheGuardians) | Security team owns threat modeling |
| Code quality, test coverage, perf regression | [TheFixer](../../../Teams/TheFixer) | Fix team owns code quality |
| Spec drift, missing requirements | [Requirements Team](../../../Teams) | Requirements owns traceability |

---

For details on the audit process, see [Teams/TheInspector/README.md](../README.md).
