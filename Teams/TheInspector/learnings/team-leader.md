# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-21 — First Audit Run

**Audit ID:** `inspector-2026-06-21-D` | **Grade:** D

#### Synthesis Process

1. **Two specialists ran (static mode only).** Both quality-oracle and dependency-auditor produced reports. Performance-profiler and chaos-monkey were not run because backend/frontend services were unavailable at audit time. Always check service liveness before assuming static-only mode.

2. **Traceability enforcer PASSED but was misleading.** The enforcer reported success because it only scans `Source/` against the most-recently-modified requirements.md. This is a known gap (QO-004). Do not cite enforcer PASS as a positive signal until QO-004 is resolved.

3. **Two cascading upgrades close 10 of 15 CVE findings.** When synthesising dependency findings, look for package-level root causes before counting individual CVEs — one `@opentelemetry` upgrade closes 6 findings; one `vite` upgrade closes 4.

4. **Grade D driven by P1 count alone.** Quality oracle gave itself Grade C; dependency auditor gave itself Grade D. The combined score is D because 4 P1 findings exceed the C threshold (max 2). Always re-apply the grading thresholds from `inspector.config.yml` to the *combined* finding set, not each specialist's self-grade.

5. **No prior audit = no trend, no FIXED section, no REGRESSED.** All findings are NEW on first run. The trend section should read "First audit — no baseline" and the fixed findings section should be empty.

6. **No PR exists on this audit branch.** The escalation block fell through to the console/printf path. On future runs where a PR exists, the `gh pr comment` path should post the security signal automatically.

7. **Performance profiler and chaos monkey absence creates two blind spots:**
   - No latency baselines captured — static performance risks only (unbounded list, no validation)
   - No fault injection coverage — static observations noted but not verified
   - Re-run with services live for complete coverage

#### File Paths Used

- HTML report: `Teams/TheInspector/findings/audit-2026-06-21-D.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-2026-06-21.json`
- Markdown summary: `inspector-report.md` (project root)

#### Cross-Reference Findings Worth Tracking

- OpenTelemetry upgrade pattern recurs across audits — portal/Backend has the largest transitive dep tree (578 deps) and is the highest-risk workspace.
- Traceability enforcer scope is a systemic quality gap — until QO-004 is resolved, coverage numbers are unreliable for portal/.
