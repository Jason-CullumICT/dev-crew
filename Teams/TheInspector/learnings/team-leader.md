# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-08-24 — First Audit (inspector-audit-2026-08-24)

### Grading nuance: "14% spec coverage" is misleading

The project has **two spec scopes** that give very different coverage numbers:
- **Plans-level (active):** 100% — all 13 FRs in `Plans/self-judging-workflow/` are fully traced
- **Full Specifications/ scope:** ~14% — because `Specifications/dev-workflow-platform.md` contains 69 FRs for a superseded product that was never built

The D grade would flip to B if the superseded spec were archived. When grading, always distinguish between "structural spec governance gap" (QO-001 type) and "genuine implementation gap." Both matter, but they have different remediation paths.

### The traceability enforcer is scoped to Plans/ only — this is a recurrent risk

`tools/traceability-enforcer.py` only scans the most-recently-modified `requirements.md` under `Plans/`. It never reads `Specifications/`. Despite `inspector.config.yml` setting `specs.dir: "Specifications/"`, the enforcer ignores this. Future audits: always check that the enforcer config is actually being read and applied.

### Services were offline — always note which specialists were skipped

performance-profiler and chaos-monkey both require live services. When services are offline, document:
1. Which specialists were skipped and why
2. What static-analysis observations are available (e.g., unbounded list risk from config)
3. A recommendation to re-run with services online

### Dependency CVEs: distinguish build-time vs runtime exploitability

Several "critical" CVEs (e.g., brace-expansion) only affect build tooling (npm install), not the running application. When summarising, note whether a CVE is runtime-exploitable vs build-time-only. This affects deployment-block decisions.

### Escalation trigger matching

The two DEP-P1 findings (handlebars, protobufjs) were correctly escalated because:
- `handlebars` = JavaScript Injection → matches trigger `"injection"`
- `protobufjs` = unsafe deserialization → matches trigger `"injection"` (deserialization injection class)

Cross-ref: `config.escalation.security_triggers` must be read carefully. "Injection" is intentionally broad — it covers SQL, template, deserialization, and command injection.

### portal/Backend is the highest-risk project

55 total vulnerabilities, 577 transitive dependencies, 2 critical CVEs. In future audits, prioritise this project for dynamic testing when services are available. Its OTel instrumentation (gRPC, Prometheus) creates a large attack surface for supply-chain CVEs.

### First-audit checklist for next run

- [ ] Services online? → enables performance-profiler + chaos-monkey
- [ ] Prior report available? → enables FIXED/STILL OPEN/REGRESSED comparison
- [ ] Specifications/dev-workflow-platform.md archived? → restores spec coverage to ~100%
- [ ] Dependabot enabled? → auto-reduces CVE backlog
- [ ] TheGuardians triggered for DEP-P1-001/002? → resolves security escalations
