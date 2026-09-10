# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-10 — First Audit Run

**Grading mechanics:**
- Grade came out D (not C) because 5 P1s exceeded the C threshold of max_p1:2. The dependency-auditor contributed 3 P1s (CVSS 9.8 CVEs) on top of quality-oracle's 2. Always sum P1s across ALL specialists before assigning grade.
- The dependency-auditor internally graded itself "A" for licensing/abandonment — but CVEs independently contribute P1s to the overall grade. Don't use the specialist's own grade; compute from raw P1/P2 counts.

**Specialist integration:**
- quality-oracle report filed at both `quality-oracle-report.md` (repo root, for handoff) and `Teams/TheInspector/findings/audit-*-quality-oracle.md` (canonical). The root-level file is the primary input for synthesis.
- dependency-auditor report was at `dependency-auditor-report.md` (summary) and `Teams/TheInspector/findings/audit-2026-09-10-A.md` (full). The findings/ file is more detailed.
- performance-profiler and chaos-monkey did not run because services were offline. The HTML report sections for latency and chaos should still be included with "offline" status rather than omitted.

**Escalation triggers:**
- 3 CVSS-9.8 CVEs (handlebars RCE, vitest file-exec, protobufjs RCE) all match the "injection" escalation trigger and must go to TheGuardians. When in doubt, escalate any finding with "RCE", "code injection", "file read", or "prototype pollution" at CVSS ≥ 8.0.
- Neither quality-oracle nor chaos-monkey found auth-bypass type findings — if they had, those would also escalate.

**Cross-reference map:**
- Building the cross-ref map requires grouping by root cause, not by finding ID. The spec-governance gap (QO-002 + QO-003 + QO-004) is a single root cause with 3 symptoms — one fix resolves all three.
- Dependency CVEs cluster by package manager workspace, not by finding — a single `npm update` pass can fix multiple DEP-H findings simultaneously.

**Report generation:**
- All 16 sections must be included even when specialists are offline (sections 12 latency, chaos findings). Include them with "None/Offline" rather than omitting.
- Bug backlog JSON structure: top-level `escalations` array (TheGuardians), then `p1_findings`, `p2_findings`, `p3_findings`, `p4_findings`. Escalated P1s appear in BOTH `escalations` and `p1_findings` for completeness.

**Next audit notes:**
- Bring backend (localhost:3001) and frontend (localhost:5173) online before triggering next audit so performance-profiler and chaos-monkey can run dynamic tests.
- On next run, compare all findings against this audit's findings to produce FIXED / STILL OPEN / REGRESSED / NEW labels.
- Watch for: handlebars/vitest/protobufjs patch status, service layer refactor (QO-001), enforcer fix (QO-002).
