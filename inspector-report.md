# TheInspector Audit Report — 2026-06-02

**Grade: D** · Run: `run-20260602-065752` · Branch: `audit/inspector-2026-06-02-9d5326`

## Summary

| Metric | Value |
|--------|-------|
| **Overall Grade** | **D** (5 P1s exceeds max_p1:2 for grade C) |
| **P1 Critical** | 5 |
| **P2 High** | 8 |
| **P3 Medium** | 11 |
| **P4 Low** | 3 |
| **Total Findings** | 27 |
| **→ TheGuardians (escalated)** | 3 |
| **Spec Coverage** | 98% (56/57 canonical FRs) |
| **Specialists Run** | quality-oracle (static) · dependency-auditor (static) |
| **Specialists Skipped** | performance-profiler · chaos-monkey (services offline) |

## Outputs

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-06-02-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-06-02.json` | Structured bug backlog with escalations array |

## Top 5 Findings

1. **3 RCE-class CVEs (CVSS 9.8)** in Handlebars (DEP-001), Vitest (DEP-002), Protobufjs (DEP-003) — escalated to TheGuardians.
2. **Traceability enforcer blind to portal/** (QO-001, P1) — 100% false-negative rate on 100+ portal FRs; CI gate broken.
3. **9/13 npm projects have CVEs; 50+ total** — immediate `npm audit fix` pass needed.
4. **teamDispatches.ts architecture violations** (QO-003/004, P2) — direct DB calls, no service layer, untracked scope creep.
5. **DependencySection + BlockedBadge** have wrong FR IDs and zero test coverage (QO-005/006, P2).

## Escalations to TheGuardians

```
⚠  ESCALATION → TheGuardians
   Finding : 3 transitive CVE chains with CVSS ≥9.8 RCE potential:
             DEP-001 (Handlebars JS injection, Source/Backend)
             DEP-002 (Vitest file disclosure + RCE, Source/Frontend + portal/Frontend)
             DEP-003 (Protobufjs RCE via proto deserialization, platform/orchestrator)
   Branch  : audit/inspector-2026-06-02-9d5326
   When    : before next release, or wait for the scheduled security run

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see bug-backlog-2026-06-02.json)
```

## Grade Rationale

Config thresholds: `A: max_p1:0` · `B: max_p1:0` · `C: max_p1:2` · `D: anything worse`

With **5 P1 findings** (1 from quality-oracle, 4 from dependency-auditor), grade C threshold (max_p1:2) is exceeded → **Grade D**.

Spec coverage of 98% meets all coverage thresholds, but dependency CVE severity drives the grade down.
