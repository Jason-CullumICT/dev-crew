# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run: 2026-05-29 (First Full Audit)

### Architecture Notes for Future Runs
- This repo has **three distinct applications** with separate specs and dirs:
  | App | Spec | Dir | Enforcer covers? |
  |-----|------|-----|-----------------|
  | Self-Judging Workflow Engine | `Specifications/workflow-engine.md` | `Source/` | ✅ Yes |
  | Dev-Workflow Platform | `Specifications/dev-workflow-platform.md` | `portal/` | ❌ No |
  | Tiered-Merge Pipeline | `Specifications/tiered-merge-pipeline.md` | `platform/` | ❌ No |

- **10 npm workspaces** in total: Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend, abac-demo (+ abac variants)
- Services were **offline** for this audit — both performance-profiler and chaos-monkey had to be skipped. Schedule a follow-up dynamic audit run when services are available.

### Grading Notes
- Quality Oracle alone = **B** (0 P1s, 4 P2s, ~88% measured coverage)
- Dependency Auditor alone = **D** (3 P1 CVEs)
- Combined = **D** — dependency vulnerabilities dominate the grade
- Grade will lift to **B** immediately once DEP-001, DEP-002, DEP-003 are patched

### Escalation Pattern
- No GitHub PR was open at audit time — escalation was emitted to console
- Escalation triggers fired: DEP-001 (injection/RCE), DEP-002 (injection/prototype pollution)
- DEP-003 (DoS) does NOT trigger TheGuardians — goes to TheFixer backlog as P1

### Key Cross-References Found
1. **No automated dep scanning in CI** → root cause of all 11 CVE findings
2. **Enforcer blind spot (QO-004)** → root cause of unmeasured portal/ coverage + QO-007 false reqs
3. **dependency-linking incomplete** → root cause of QO-001, QO-002, QO-003, QO-008

### Report File Paths
- HTML report: `Teams/TheInspector/findings/audit-2026-05-29-D.html`
- Bug backlog JSON: `Teams/TheInspector/findings/bug-backlog-2026-05-29.json`
- Dependency detail: `Teams/TheInspector/findings/DEPENDENCY-AUDIT-2026-05-29.md`
- Summary: `inspector-report.md` (root)

### Findings to Re-Verify on Next Run
All 22 findings are NEW (first audit). On next run, check each for FIXED / STILL OPEN / REGRESSED:
- DEP-001, DEP-002, DEP-003 — should be FIXED (high-urgency patches)
- QO-001, QO-002, QO-003, QO-008 — dependency-linking sprint items
- QO-004 — enforcer scope fix (tooling sprint)

### Learnings for Scoping Phase
- Always check `npm audit` output in `Teams/TheInspector/findings/` — the dep-auditor writes structured JSON
- Performance-profiler and chaos-monkey require both backend (http://localhost:3001) AND frontend (http://localhost:5173) to be healthy
- If services are offline, mark them skipped in the scope plan — do not hold up the rest of the audit
- The quality-oracle enforcer only auto-targets `Source/`; manually specify `--file` per plan for full coverage
