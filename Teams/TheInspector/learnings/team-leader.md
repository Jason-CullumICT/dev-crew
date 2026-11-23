# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-23 — First Audit (run-20261123-103519)

**Synthesis pattern:**
- Quality Oracle grades by spec-drift and architecture rules; Dependency Auditor grades by CVE severity. Take the worse of the two grades as the floor for the combined grade, then apply the config grading thresholds.
- When P1 counts from multiple specialists are summed across the full report, the combined total frequently drops the grade below what any individual specialist reported. Quality Oracle gave C (2 P1s), Dependency Auditor gave D (4 P1s) — combined total: 6 P1s, clearly D under the config thresholds.

**Escalation trigger:**
- DEP-001 (handlebars) is a transitive build dependency — its exploitability depends on whether the backend processes untrusted Handlebars templates. TheGuardians must assess the actual exposure. Mark [ESCALATE → TheGuardians] but document the conditional nature.
- proxy-addr (DEP-002) affects `req.ip` in Express — always escalate when IP-based controls exist in the app.
- vitest injection (DEP-003) is a CI/CD concern, not a production runtime concern — the escalation path is to secure the CI pipeline and PR review process, not to patch a production server.

**Cross-reference grouping:**
- Grouping findings by root cause in §8 (Cross-Reference Map) is the highest-value synthesis step. DEP-001+DEP-002+DEP-005+DEP-006 all share the root cause "Express transitive chain stale" — one `npm update` command resolves four findings.
- QO-001+QO-002 share "dependency-linking feature not ported from portal/ to Source/" — a single porting effort resolves both P1s.

**Static-only audit limitations:**
- When both backend and frontend services are offline, Performance Profiler and Chaos Monkey produce no reports. The HTML report must clearly call this out in §4 (Scope), §6 (Specialist Reports), §12 (Latency Baselines), and §15 (Recommendations). Do not omit sections — use "None" or "Not available" as instructed.
- Always recommend in §15 that the next audit be run with services live.

**Grading config application:**
- C threshold: max_p1=2, max_p2=15 — if P1 count exceeds 2, cannot award C regardless of P2 count.
- D threshold: max_p1=999 — anything worse than C lands here unless exploitable auth bypass + critical domain failure (F).
- Since this app has no auth layer by design, F is not applicable even with RCE risks.

**Report file naming:**
- HTML: `audit-{date}-{grade}.html` → `audit-2026-11-23-D.html`
- JSON: `bug-backlog-{date}.json` → `bug-backlog-2026-11-23.json`
- Both in `Teams/TheInspector/findings/`

**Traceability enforcer blind spot (structural):**
- The enforcer's hard-coded `source_dirs = ["Source", "E2E"]` is a systemic risk. When portal/ and platform/ codebases grow, their spec drift is invisible to CI. Fixing QO-004 (extend the enforcer) has multiplicative value — it surfaces hidden compliance issues across 79+ FRs with no additional specialist work.

**Pipeline state:**
- Run ID comes from `tools/pipeline-state-TheInspector.json` → key `runs` → first run's `pipeline.id`.
- Dashboard update script: `tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" --agent team_leader --action complete --verdict passed --metrics '{...}'`
