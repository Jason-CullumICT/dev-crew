# TheInspector Audit Report — 2026-07-14

**Grade: C** · Run `run-20260714-051432` · Branch: `audit/inspector-2026-07-14-44a76c`

## Files

| Artifact | Path |
|----------|------|
| Full HTML Report | `Teams/TheInspector/findings/audit-2026-07-14-C.html` |
| Bug Backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-07-14.json` |
| QO Specialist Report | `quality-oracle-report.md` |
| DEP Specialist Report | `dependency-auditor-report.md` / `Teams/TheInspector/findings/audit-2026-07-14-D.md` |

## Grade Rationale

| Criterion | Value | Threshold (C) | Pass? |
|-----------|-------|---------------|-------|
| P1 findings | 2 | ≤ 2 | ✅ |
| P2 findings | 8 | ≤ 15 | ✅ |
| Spec coverage (measured) | ~90% | ≥ 40% | ✅ |

Grade **B** requires 0 P1s — the 2 P1 CVEs (DEP-001 Handlebars RCE, DEP-002 Vite bypass) push the project to **C**.

## Summary

| Specialist | P1 | P2 | P3 | Status |
|-----------|----|----|-----|--------|
| Quality Oracle (static) | 0 | 6 | 3 | ⚠️ Partial Pass |
| Dependency Auditor (static) | 2 | 2 | 10 | 🔴 Critical |
| Performance Profiler | — | — | — | ⏭ Skipped (backend offline) |
| Chaos Monkey | — | — | — | ⏭ Skipped (services offline) |
| **TOTAL** | **2** | **8** | **13** | **Grade C** |

## Escalations → TheGuardians

4 findings require security team review before next release:

| ID | Severity | Title | Trigger |
|----|----------|-------|---------|
| DEP-001 | P1 | Handlebars.js RCE (CVSS 9.8) | injection |
| DEP-002 | P1 | Vite dev-server code injection | injection |
| DEP-003 | P2 | form-data CRLF header injection (CVSS 7.5) | injection |
| DEP-004 | P2 | ws WebSocket DoS + memory disclosure | sensitive data exposed |

**To trigger TheGuardians:** read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

## Top 5 Operator Actions

1. **[BLOCK]** Audit Handlebars template usage — confirm no user-controlled templates; upgrade to 4.7.9+ (DEP-001, CVSS 9.8)
2. **[BLOCK]** Trigger TheGuardians for DEP-001/002/003/004 security review
3. **[THIS SPRINT]** `npm audit fix` across all manifests — closes DEP-003 through DEP-012 in one pass
4. **[THIS SPRINT]** Implement 3 missing dependency-linking spec items: `blocked_by` types, seed script, 2 test files (QO-001/002/003)
5. **[THIS SPRINT]** Fix traceability enforcer to scan `portal/` — makes future spec drift visible automatically (QO-006)

## Trend

First audit — no prior baseline. Target for next run: resolve DEP-001/002 → grade B.
