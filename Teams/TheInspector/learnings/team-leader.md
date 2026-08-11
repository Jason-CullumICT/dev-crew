# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-11 — First audit run (audit-2026-08-11-D)

**Baseline grade established:** D. Prior to this run, there were no prior audits to compare against.

**Traceability enforcer watches the wrong file (P1 pitfall).**  
`tools/traceability-enforcer.py` resolves to the *most recently modified* `requirements.md` under `Plans/`, not the domain spec. The result: `python3 tools/traceability-enforcer.py` exits 0 while 74 domain FRs are untraced. Always run the enforcer with `--file Specifications/dev-workflow-platform.md` explicitly, or pin it in `inspector.config.yml`. Don't trust the default.

**Services were down — static fallback for perf/chaos.**  
`localhost:3001` and `localhost:5173` were unreachable. performance-profiler and chaos-monkey ran in static-only mode. Dynamic findings (race conditions, latency validation, fault injection) were NOT obtained. For future runs, ensure services are started before triggering TheInspector, or document the static-only caveat prominently in the report.

**The dependency tree is lean and supply chain is clean.**  
~40 direct + ~40 transitive deps across all projects. No viral licenses, no post-install scripts, no abandoned packages. This is a healthy baseline to maintain. The CVEs are all fixable with npm update — not structural supply chain risk.

**Cross-reference map is high-value for remediation.**  
The service-layer bypass (QO-003) blocks clean OTel instrumentation (QO-007). Fixing QO-003 first unblocks QO-007. This kind of dependency between findings should always be captured in the cross-reference map — it shows TheFixer the correct order of operations.

**Grading: 7 P1s = grade D regardless of P2/P3 counts.**  
The config threshold for grade C is max 2 P1 findings. With 7 P1s (3 architecture/spec + 4 CVEs), the system is solidly D. Even if all P2/P3s were cleared, the grade would remain D until P1s are fixed. Communicate this clearly to avoid false progress signals.

**Escalation routing:**  
- Code injection + missing access control (Vitest, Handlebars) → TheGuardians  
- Infrastructure DoS (gRPC) → TheGuardians  
- Architecture violations, spec drift, CVE patches → TheFixer  
- The `[ESCALATE → TheGuardians]` tag is applied when `security_triggers` match: injection, missing access control. DoS is a judgment call; gRPC was escalated because it affects orchestrator infrastructure availability.
