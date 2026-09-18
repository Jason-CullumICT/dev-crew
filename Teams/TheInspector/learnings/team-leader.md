# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-18 — First Audit Run (Grade D)

**Grading**
- With transitive dependency CVEs counted as findings, scores can reach D quickly even if application code quality (Quality Oracle) would have scored B alone. Treat dependency P1s (CVSS ≥9.0) as true P1s for grading — they are real exploitable risks.
- Grade D assigned: 5 P1s (1 QO functional gap + 4 DEP CVEs) and 28 P2s. Config C threshold is max_p1=2.

**Specialists**
- Performance-profiler and chaos-monkey both required live services (localhost:3001, localhost:5173). Services are offline during audit-branch runs. These two specialists will almost always run in static mode unless audit is triggered while app is running.
- Quality Oracle runs reliably in static mode. Dependency Auditor runs reliably in static mode.

**Escalation routing**
- 5 findings escalated to TheGuardians: DEP-001 (Handlebars injection), DEP-002 (Vitest RCE), DEP-003 (protobufjs RCE), DEP-007 (form-data CRLF), DEP-010 (PostCSS file read)
- No PR context available on audit branch — escalation was printed to console. In future, ensure audit is triggered from a PR branch for inline comment escalation.

**Cross-reference map**
- The most valuable synthesis output: XREF-1 (handlebars fix resolves 3 findings), XREF-4 (search route fix resolves 2 findings), XREF-5 (spec header fix resolves 3 P2 traceability issues). Always build this map — it dramatically reduces remediation effort.

**Traceability enforcer**
- The enforcer auto-selects the most recently modified plan. This is a reliability risk — it can silently pass while the dependency-linking plan fails. Document in CLAUDE.md which plans to explicitly target.
- `FR-TMP-001-010` (Tiered Merge Pipeline) are untraced because the enforcer doesn't scan `platform/`. Document this scope gap.

**Dependency audit**
- portal/Backend is the highest-risk workspace (54 CVEs, 500+ transitive deps). Flag it first in future synthesis.
- Source/E2E is clean (0 CVEs) — note this positive as baseline.
- No Go/Python/Rust/Java packages detected — npm-only project.
- License checker not available in runtime environment — recommend CI integration.

**Report structure**
- All 16 mandatory sections generated. Section 8 (Cross-Reference Map) and Section 10 (Risk Matrix) are the highest-value sections for remediation planning.
- HTML report saved to `Teams/TheInspector/findings/audit-{date}-{grade}.html` per config pattern.
- JSON backlog saved to `Teams/TheInspector/findings/bug-backlog-{date}.json` per config pattern.

**Baseline for next audit**
- Grade: D
- P1: 5, P2: 28, P3: 23, P4: 5
- Spec coverage: 96%
- Total CVEs: 53
- Worst workspace: portal/Backend (54 CVEs)
- Cleanest workspace: Source/E2E (0 CVEs)
