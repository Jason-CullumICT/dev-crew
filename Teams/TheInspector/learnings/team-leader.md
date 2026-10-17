# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-17 — First Audit (run-20261017-065513)

**Services offline pattern**: Backend (localhost:3001) and frontend (localhost:5173) were both offline. This forced performance-profiler and chaos-monkey into skipped mode. In future runs, attempt to detect whether services need to be started before the audit begins, or flag clearly in the scope output that dynamic specialists will be skipped.

**First-audit baseline**: No prior audit existed. All 67 findings are NEW. Grade D (4 P1 findings: 3 critical CVEs + 1 traceability enforcer blindspot). The grading thresholds in inspector.config.yml require max_p1=2 for grade C, so clearing even 2 P1s would unlock the C range.

**Dependency auditor aggregation**: The dependency-auditor reports individual CVEs (59 total) but maps them to 3 explicit P1 finding entries in its JSON, then aggregates high/moderate/low into summary counts. The team leader should treat these as:
- P1 = explicit DEP-00x findings (3 in this run)
- P2 = high-severity count (40), reported as 2 aggregate backlog entries
- P3 = moderate count (12), reported as 2 aggregate entries
- P4 = low count (3), reported as 1 aggregate entry

**Escalation trigger**: DEP-003 (proxy-addr auth bypass) and DEP-001/DEP-002 (injection) both matched `inspector.config.yml` security_triggers. No PR was available in this environment so the console escalation path was used. In a normal PR workflow, `gh pr comment` would post the security signal automatically.

**Spec coverage calculation**: The enforcer's 100% "PASSED" result is misleading — it only covers 13/109 requirements. When reporting spec coverage, always use the real coverage ratio (requirements covered / total requirements across all spec files), not the enforcer's per-run pass/fail.

**Cross-reference map value**: Three root causes span multiple findings:
- Root Cause A: Outdated npm deps → resolves DEP-001/002/003/HIGH-BACKEND/HIGH-FRONTEND with npm audit fix --force
- Root Cause B: Spec infrastructure gap → resolves QO-001/004/005/008 with enforcer extension + spec amendment
- Root Cause C: Observability pattern → resolves QO-002/003/006 with service layer refactor + logger module

**Grade path to C**: Clear DEP-001, DEP-002, DEP-003 (reduces P1 count from 4 to 1) + raise spec coverage above 40% (fix QO-001). That would satisfy C thresholds: max_p1=2 ✓, spec_coverage>40% ✓ (if enforcer covers >3 of 8 spec files).
