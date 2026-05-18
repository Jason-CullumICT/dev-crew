# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit 2026-05-18 — run-20260518-062751

### Grading Arithmetic
- Count P1s from **all specialists combined** (not per-specialist) before assigning grade.
- Quality-oracle may self-grade as C, but if dependency-auditor adds 3 more P1s, the combined total (4) pushes the final grade to D.
- Always recalculate totals during synthesis — never inherit a specialist's self-assigned grade.

### Spec Coverage Caveat
- 15.8% coverage looks alarming but is expected: `Specifications/` defines two *future* applications not yet built.
- The traceability enforcer produces a false PASS (QO-004) — do not rely on `python3 tools/traceability-enforcer.py` output alone; read the raw `Specifications/` FR count vs. `// Verifies:` grep counts.
- Per-test `// Verifies:` density is 11–19% (file-level comments exist but most individual `it()` blocks are untagged).

### Services State
- Backend (`http://localhost:3001`) and Frontend (`http://localhost:5173`) were unreachable during the 2026-05-18 audit.
- performance-profiler and chaos-monkey were both skipped — **the audit picture is incomplete without dynamic testing**.
- Re-run immediately when services are healthy; note this caveat prominently in the report.

### Escalation Routing
- Injection-class CVEs (handlebars, protobufjs) → TheGuardians even when they are transitive/dev dependencies.
- ReDoS (path-to-regexp) → TheFixer unless it's on the primary attack surface; in this case the orchestrator API is network-accessible, so consider escalating on the next run if still open.
- No PR/remote detected → use console escalation path (print to stdout), not GitHub PR comment.

### Cross-Reference Observations
- OpenTelemetry staleness is a root cause for 5 findings across 2 specialists: always check OTel version as a standalone step during scoping.
- Test toolchain vulnerabilities (jest → handlebars → RCE) appear in `Source/Backend/package-lock.json` — scan dev deps, not just prod deps.

### Report Generation Notes
- HTML report with all 16 sections generated cleanly from specialist markdown reports.
- `bug-backlog-{date}.json` must have a top-level `escalations` array (separate from `p1_findings`) so TheFixer can skip those and route to TheGuardians.
- Spec coverage bar chart in Section 11 needs real numbers per spec file (not just total) — the per-file breakdown is more useful than the aggregate.
