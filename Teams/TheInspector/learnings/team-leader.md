# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-05-23 — Full Audit (Grade D)

### Project Architecture (Critical Context)

This project has **three separate codebases** against three specifications — NOT one:

| Codebase | Spec | Requirement IDs | Enforcer Status |
|----------|------|-----------------|-----------------|
| `Source/` | `Specifications/workflow-engine.md` + Plans/ | FR-WF-001–013, FR-dependency-* | ✅ Scanned by default |
| `portal/` | `Specifications/dev-workflow-platform.md` | FR-001–069, FR-dependency-* | ❌ Enforcer blind (QO-001 open) |
| `platform/orchestrator/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–010 | ❌ Enforcer blind (QO-001 open) |

**Always scope specialists to all three codebases.** The quality-oracle must be explicitly told to check portal/ and platform/ or it may miss drift.

### Grading Baseline

- **First audit: Grade D** (2026-05-23)
- 4 P1 findings: 2 security (DEP-001, DEP-032) → escalated to TheGuardians; 2 code quality (QO-001, QO-002) → TheFixer
- 11 P2 findings, 12 P3 findings, 4 P4 findings — total 31

**Grade thresholds (from inspector.config.yml):**
- A: max_p1=0, max_p2=3, min_spec_coverage=80%
- B: max_p1=0, max_p2=8, min_spec_coverage=60%
- C: max_p1=2, max_p2=15, min_spec_coverage=40%
- D: anything worse

**To reach Grade C next run:** Must close QO-002 (enum missing) so non-security P1 count drops to ≤2 AND close DEP-032+DEP-001 escalations. Also close ≥4 P2s to stay under 15.

### Open Security Escalations (2026-05-23)

Must re-verify on next run whether TheGuardians has actioned these:

1. **DEP-032** — `protobufjs ≤7.5.7` via `dockerode@4.0.10` in `platform/orchestrator`. CRITICAL RCE. Fix: `dockerode@5.0.0` (solo-session).
2. **DEP-001** — `handlebars@4.7.8` via `ts-jest@29.4.6` in `Source/Backend`. 8 CVEs (CVSS 9.8). Dev-time only. Fix: ts-jest upgrade.

### Cross-Reference Clusters (Most Efficient Remediation Order)

1. `dockerode@5.0.0` upgrade → closes DEP-032 + DEP-033 + DEP-034 (3 findings, 1 command)
2. Traceability enforcer fix → closes QO-001 + QO-007 (2 findings, 1 file edit)
3. Complete dependency-linking sprint → closes QO-002 + QO-003 + QO-004 + QO-005 (4 findings)
4. `npm audit fix` in Source/Backend → closes DEP-002 + DEP-004 (2 findings, 1 command)
5. `vite@>=5.4.3` in Source/Frontend → closes DEP-022 + DEP-023 + DEP-024 (3 findings, 1 command)

### Specialist Dispatch Notes

- **performance-profiler**: Services were offline this run. Next run: check `http://localhost:3001/` and `http://localhost:5173` before dispatch. If offline, mark static mode — do NOT skip entirely, use static pattern analysis.
- **chaos-monkey**: Same — requires both services healthy. Static scenarios: malformed request body, concurrent state transitions, soft-deleted item access.
- **quality-oracle**: Must be given portal/ and platform/ dirs explicitly — the default enforcer scan only covers Source/. Learnings file has full file path list.
- **dependency-auditor**: Three package.json locations: `Source/Backend`, `Source/Frontend`, `platform/orchestrator`. Note: portal/ also has node_modules but was not audited in 2026-05-23 run.

### Report Paths

| Artifact | Path |
|---------|------|
| HTML report (2026-05-23) | `Teams/TheInspector/findings/audit-2026-05-23-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-05-23.json` |
| Quality oracle detailed | `Teams/TheInspector/findings/audit-2026-05-23-B.md` |
| Dependency audit detailed | `Teams/TheInspector/findings/dependency-audit-2026-05-23.md` |
| This summary | `inspector-report.md` (repo root) |

### Services (from config)

- Backend: `http://localhost:3001/` (was offline 2026-05-23)
- Frontend: `http://localhost:5173` (was offline 2026-05-23)
- Metrics: `http://localhost:3001/metrics`
