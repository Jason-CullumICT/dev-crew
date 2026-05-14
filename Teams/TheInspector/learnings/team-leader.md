# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-05-14 — First Audit Run

### Scoping

- Services were offline (localhost:3001 and localhost:5173 unreachable). Always check health endpoints early; performance-profiler and chaos-monkey both require live services. Document clearly in report.
- `inspector.config.yml` is the authoritative override for service URLs, grading thresholds, and escalation triggers. Read it before auto-discovering anything from CLAUDE.md.
- `portal/` is explicitly excluded from `source.dirs` in config. The 0% spec coverage for Specifications/ FRs in Source/ is expected and must be noted with context, not treated as a raw failure.
- The traceability enforcer uses mtime heuristic (most-recently-modified requirements.md) — this is fragile. Flag it and route to TheFixer.

### Synthesis

- Cross-reference groups are extremely valuable for TheFixer routing: three groups (Vite chain, Observability stack, Spec-contract drift) each resolve multiple findings with a single fix. Always build the cross-ref map before writing recommendations.
- Deduplication: QO-004 (logger no dev pretty-print) and QO-009 (dual logger abstraction) share the same root cause — consolidating the logger resolves both. Tag with same cross-ref group.
- Grade D was correctly assigned: 3 P1 findings exceed max_p1=2 for grade C per config.grading thresholds.

### Escalation

- The `injection` trigger in config.escalation.security_triggers fired for DEP-001 (Handlebars JavaScript Injection, CVSS 9.8). Escalation is conditional — if Handlebars is only used at build time, severity is lower. Always note the condition in the escalation notice.
- No PR existed on this branch; used the printf fallback escalation block (not gh pr comment).

### Routing

- QO-005 (OTel) and QO-006 (tiered merge pipeline) are new implementation work, not bug fixes — route to TheATeam, not TheFixer.
- All other findings → TheFixer (code-quality bugs, dependency patches, small fixes).

### Report

- HTML report with all 16 sections generated at `Teams/TheInspector/findings/audit-2026-05-14-D.html`.
- JSON bug backlog at `Teams/TheInspector/findings/bug-backlog-2026-05-14.json` — includes a separate `escalations` array as required.
- `inspector-report.md` at repo root requested by parent session — useful one-page summary for quick triage.
