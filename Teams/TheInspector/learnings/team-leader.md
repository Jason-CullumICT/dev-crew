# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-09-06 — First Audit Run

### Synthesis findings
- **Grade D is driven by dependency-auditor**, not quality-oracle (which would be B alone). When specialists diverge sharply, overall grade is the lowest specialist grade.
- **False-positive traceability is a compounding risk**: QO-001 (missing route) slipped through CI because the enforcer accepted a test-file reference. Always cross-check P1 spec-drift findings against enforcer design — test-file refs ≠ implementation refs.
- **Performance-profiler and chaos-monkey were skipped** (services offline). Schedule a follow-up audit with all services live to complete the picture — current grade may improve or worsen once dynamic data is available.
- **OpenTelemetry version drift compounds CVE counts**: A single package update (@opentelemetry/sdk-node in orchestrator) resolves 12+ CVEs because Protobufjs is a transitive dep of the entire OTel chain.
- **Cross-reference map (§8) is high-value for remediation planning**: engineers can see that fixing one root cause (OTel update) resolves DA-003 + DA-004 together. Invest time in this section.

### Process notes
- No prior audit baseline existed — "First audit" wording used in §5 and §7.
- Report path: `Teams/TheInspector/findings/audit-{date}-{grade}.html` per config.
- Backlog path: `Teams/TheInspector/findings/bug-backlog-{date}.json` per config.
- `platform/` changes (orchestrator dependency updates) require solo-session per module ownership rules — flag this clearly in recommendations so TheFixer doesn't attempt it.
- Escalation block ran without a PR (no open PR on this branch at synthesis time) — used printf path successfully.
