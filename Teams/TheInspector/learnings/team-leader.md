# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-19 — First audit run

**Specialist availability pattern:**
- performance-profiler and chaos-monkey will not run (and produce no report) when both backend (3001) and frontend (5173) are offline. Check service health before scoping — do not wait for missing reports.
- If a specialist report is absent, note it explicitly in §6 (Specialist Reports) and §4 (Scope & Environment). Do not treat absence as a clean pass.

**Grade calculation:**
- With 4 P1 findings, grade is D (threshold: C requires max_p1 ≤ 2). The dependency-auditor alone contributed 3 critical CVEs. Always sum across all specialists before grading.
- Spec coverage is computed against ALL files in `Specifications/`, not just the enforcer's scope. The enforcer only checks 13 FRs; true coverage is 31%.

**Escalation path:**
- No PR was open on this branch; escalation used the fallback `printf` path. This is correct. The escalation block checks `$PR_NUM` first.
- All 3 DEP P1 CVEs were tagged `[ESCALATE → TheGuardians]` by the dependency-auditor. Collect them in the `escalations` array of the JSON backlog, separate from regular P1 findings.

**Cross-reference mapping (§8):**
- "Dependency tree not updated" is a single root cause for all 31 CVEs — one coordinated `npm audit fix` sprint resolves the majority.
- "Traceability enforcer scope" is a root cause for 3 QO findings (QO-001, QO-002, QO-004). Extending the enforcer tool surfaces all three at once.

**Specification authority finding:**
- This project has an authoritative spec (`Specifications/dev-workflow-platform.md`) that has 0% implementation. This is a P1 spec-drift finding, not just a P2, because it undermines the entire spec-first architecture. Always treat primary spec 0% as P1.

**Remediation sequencing:**
- Security CVEs (TheGuardians) → P1 deps → P2 deps (bulk `npm audit fix`) → spec work → P3 cleanup.
- `platform/orchestrator` changes must go through solo session — pipeline agents cannot touch that directory.

**Report structure note:**
- The 16-section HTML report is the canonical deliverable. The `inspector-report.md` summary is for quick human consumption. The JSON backlog is for TheFixer/TheATeam machine processing.
- Save HTML to `Teams/TheInspector/findings/audit-{date}-{grade}.html` per config. The `.md` quality oracle finding file and the `.html` report are separate artifacts.
