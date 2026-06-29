# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-06-29 — First Combined Audit

### Grade History

| Date | Grade | P1 | P2 | Specialists | Notes |
|------|-------|----|----|-------------|-------|
| 2026-06-29 | **D** | 5 | 13 | quality-oracle, dependency-auditor | First combined audit; perf-profiler + chaos-monkey not run (services offline) |

### Key Discoveries

1. **Services were offline during scoping** — backend (http://localhost:3001) and frontend (http://localhost:5173) both unreachable. This forced static-only mode for all specialists. performance-profiler and chaos-monkey were NOT run. Always check service health at audit start and document in report.

2. **Dependency audit dominates combined grade** — quality-oracle graded C (2 P1s), but dependency-auditor graded F (3 P1 RCE CVEs). Combined grade landed at D due to 5 total P1 findings exceeding the C threshold (max_p1=2). The F grade from dependency-auditor would only apply to the combined report if an auth bypass + critical domain failure were both present.

3. **First run has no baseline for trend section** — Section 5 (Trend) must gracefully handle "First audit — no baseline". The QO-004 and QO-005 "STILL OPEN" items came from the plan's own delta table, not a prior audit report.

4. **Deduplication of cross-cutting findings** — DEP-002 (protobufjs) and DEP-006/DEP-007 (OpenTelemetry) all stem from the same stale observability stack. Section 8 (Cross-Reference Map) must group these so TheFixer knows one coordinated upgrade resolves multiple IDs.

5. **Grading thresholds are cumulative across specialists** — count ALL P1s from ALL specialists against the thresholds. Do not grade per-specialist and average.

6. **Escalation trigger** — found 3 P1s tagged [ESCALATE -> TheGuardians] from dependency-auditor. The escalation block in team-leader.md should be run; however, no open PR was found (gh pr view returned nothing), so the terminal fallback message applies.

### File Paths for Future Audits

| Path | Purpose |
|------|---------|
| `Teams/TheInspector/findings/audit-2026-06-29-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-06-29.json` | JSON bug backlog with escalations array |
| `quality-oracle-report.md` (repo root) | Quality oracle specialist handoff |
| `dependency-auditor-report.md` (repo root) | Dependency auditor specialist handoff |

### Cross-Reference Map Key Groups (for next audit comparison)

- **Stale test tooling chain:** DEP-001 (handlebars/jest), DEP-003 (vitest), DEP-009 (esbuild), DEP-010 (ws) — single fix: upgrade jest+vite+vitest
- **Stale observability stack:** DEP-002 (protobufjs), DEP-006 (grpc-js), DEP-007 (OTel Prometheus), DEP-011 (path-to-regexp) — single fix: upgrade @opentelemetry/* + express
- **Traceability tooling gaps:** QO-001 (enforcer blind), QO-006 (FR-TMP untraced), QO-003 (ghost FR-090), QO-007 (malformed ID) — single fix: expand enforcer

### Synthesis Process Notes

- HTML report requires all 16 sections; Section 12 (Latency Baselines) must say "None" when profiler not run, not be omitted
- JSON backlog must have a top-level `escalations` array separate from `p1_findings`
- Grading config: F requires BOTH auth bypass AND critical domain failure — not applicable when app has no auth layer
- The grading note in inspector.config.yml: "F is reserved for: exploitable auth bypass + critical domain failure" — treat as AND condition
