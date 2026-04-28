# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-28 — First audit run

**Service availability:**
- Backend (localhost:3001) and frontend (localhost:5173) were both offline during the audit.
- This automatically skips performance-profiler and chaos-monkey to static mode.
- When both services are offline, still run quality-oracle and dependency-auditor — both are always static and provide most of the value.
- The static fault scenarios from `inspector.config.yml` (concurrent transitions, malformed bodies) should still be surfaced even if dynamic chaos-monkey is skipped.

**Grading gotcha — security CVEs count as P1s for grade calculation:**
- DEP-001 and DEP-002 were CVSS 9.8 dependency CVEs that also triggered the security escalation path.
- They still count as P1 findings for grade calculation even though they route to TheGuardians instead of TheFixer.
- With 3 P1s total (2 security + 1 code), the grade fell to D (grade C allows max 2 P1s).

**Traceability enforcer scope gap — critical pattern to check first:**
- The enforcer reads Plans/ not Specifications/. Always check which spec files exist and whether the enforcer covers them.
- This project has 3 specs → 3 implementation layers → but enforcer only gates 1 (Source/ via Plans/).
- Filing this as a P2 finding (QO-002) was correct — it's an architecture rule violation that masks spec drift.

**Cross-reference map is the most valuable synthesis output:**
- Three root causes each span 3-5 findings. Presenting these as a map gives TheFixer clear leverage points.
- "Fix the dependency-linking feature" resolves QO-001 (P1) + QO-004, QO-005, QO-006 (3xP2) in one sprint.
- "npm update in orchestrator + portal" resolves DEP-001 (P1) + DEP-002 (P1) + DEP-003 (P2) in ~30 minutes.

**Dependency audit grade vs overall grade:**
- Dependency-auditor assigned its own internal grade D to the dependency posture.
- The overall system health grade is computed separately using the grading config thresholds (P1 count, P2 count, coverage).
- Both happen to be D in this run, but they're independent assessments.

**First-audit baseline:**
- With no prior audit, all findings are NEW and FIXED count = 0.
- The most important thing is establishing clean baselines for latency (next run, when services are up) and for the finding list (so future runs can show FIXED/STILL OPEN/REGRESSED).

**When backend is offline:**
- Note in §4 (Scope & Environment) exactly which services were offline and the consequence (no latency data, no chaos results).
- Recommend re-run with services online in §15 Recommendations under Backlog.
- Static analysis from quality-oracle and dependency-auditor still provides 75-80% of audit value.
