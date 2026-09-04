# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-04 — First Audit

**Services offline → static-only run**
- Backend (localhost:3001) and frontend (localhost:5173) were not reachable during this audit.
- performance-profiler and chaos-monkey were both skipped.
- For future runs: check service health before dispatching specialists; if services are down, note this prominently in the report scope section and recommend re-running the dynamic specialists.

**portal/ is a governance blind spot**
- quality-oracle (QO-003) and dependency-auditor (DEP-P4-002) both surfaced that portal/ is outside automated enforcement.
- The traceability enforcer doesn't cover portal/ FRs; the dependency audit timed out on portal projects.
- Cross-reference these findings as a single root cause in the cross-reference map (Root Cause #1).
- Recommend creating `Plans/dev-workflow-platform/requirements.md` to bring portal/ FRs under the enforcer.

**Dependency scanning gap = grade cliff**
- The quality-oracle scored B (0 P1s, 5 P2s).
- The dependency-auditor surfaced 3 P1 CVEs, which immediately pushed the combined grade to D.
- Always synthesize specialist grades together using the config grading thresholds — do not average them.
- The grading config uses `max_p1` as the primary gate: grade C = max 2 P1s; D = anything worse.

**Injection trigger → TheGuardians**
- DEP-002 (handlebars JavaScript Injection) matched the `injection` security trigger from `escalation.security_triggers`.
- DEP-001 (protobufjs RCE CVSS 9.8) was also escalated even though "arbitrary code execution" is not literally listed — RCE severity warrants escalation regardless.
- Always escalate all P1 CVEs from dependency-auditor if they involve code execution or injection.

**dependency-backlog CSV has the full P2 list**
- The dependency-auditor summary report only lists 4 explicit P2 findings (DEP-004 through DEP-007).
- The full 21-item P2 list is in `Teams/TheInspector/findings/dependency-backlog-2026-09-04.csv`.
- In the synthesis report, reference the CSV for the full list rather than trying to enumerate all 21 in the HTML report.

**portal dependency audit needs longer timeout**
- `portal/Backend` and `portal/Frontend` timed out during npm audit.
- Recommend 300s+ timeout for portal projects in future runs.
- Track this as DEP-P4-002 audit gap.

**First-audit baseline**
- No prior audit existed, so the re-verification summary (Section 7) shows all findings as NEW.
- The trend section (Section 5) shows "First audit — no baseline".
- Next audit should load `Teams/TheInspector/findings/audit-2026-09-04-D.html` to compare FIXED / STILL OPEN / REGRESSED / NEW.
