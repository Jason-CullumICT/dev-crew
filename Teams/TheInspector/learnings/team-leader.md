# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run — 2026-09-19

### Grade Assigned: D

**Grade reasoning:** 5 P1 findings (3 DEP security CVEs + 2 QO spec-drift) exceed the C-grade threshold of max 2 P1s. The grading config uses max_p1=2 for C, max_p1=999 for D, so D was automatic.

### Specialist Modes Used

- quality-oracle: static (always static)
- dependency-auditor: static (always static)
- performance-profiler: NOT RUN — services offline (localhost:3001 and :5173 unreachable)
- chaos-monkey: NOT RUN — services offline (chaos mode requires at least backend available)

**Learning:** Check service availability early with `curl -sf {url} > /dev/null 2>&1` before dispatching dynamic specialists. When offline, note in scope clearly — operators need to know which dimensions were not covered.

### Escalation Handling

Three DEP findings (DEP-001, DEP-002, DEP-003) matched the injection/code-execution security escalation triggers in `inspector.config.yml`. All three have CVSS 9.8. Used the PR-or-terminal escalation block — no open PR found (`gh pr view` returned empty), so the stdout escalation path was appropriate.

**Learning:** The escalation block should always be run when any `[ESCALATE → TheGuardians]` findings exist. Check `gh pr view` first — if PR exists, post the badge comment; if no PR, use terminal output.

### Cross-Reference Map Building

The cross-reference map (§8) was valuable for remediation planning. Key pattern: portal/Backend was the most affected single location (54 CVEs, multiple P2 findings) — one `npm audit fix` run there closes 4 findings at once.

**Learning:** Always look for "same location" groupings in dependency findings — they produce high-value cross-refs. Also look for "same root cause" groupings across different specialists (e.g., QO-001 + QO-005 both stem from enforcer incompleteness).

### JSON Bug Backlog

The JSON backlog was split into `escalations` (3 TheGuardians items), `p1_findings` (TheFixer), `p2_findings`, `p3_p4_findings`, and `cross_reference_map`. This structure makes it easy for TheFixer to filter by priority.

### Findings That Were Cross-Specialist

No explicit cross-specialist findings in this run (only 2 of 4 specialists ran). In future runs with all 4 specialists, look for:
- Performance findings that correlate with QO architecture violations (e.g., unbounded list + QO-003 service layer bypass)
- Chaos findings that correlate with QO error handling violations (e.g., QO-008 silent errors + chaos fault injection)

### Report File Naming

Used `audit-{date}-{grade}.html` per config. Grade is **D** so filename is `audit-2026-09-19-D.html`. Bug backlog is `bug-backlog-2026-09-19.json`.

### Spec Coverage Note

The traceability enforcer returning PASSED (exit 0) while 69 requirements have 0% coverage is a significant finding (QO-001 + QO-005). Future team leaders should be aware that the enforcer passing does NOT mean comprehensive spec coverage — it only checks the most-recently-modified plan.

### Vulnerability Distribution

Portal/Backend is disproportionately vulnerable (54/103 total CVEs = 52%). It has the largest transitive dependency tree (200+) driven by protobufjs, vitest, @opentelemetry/*, and vite. This should be tracked as a persistent risk.

### Dashboard Reporting

```
RUN_ID=run-20260919-072143
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent team_leader --action complete --verdict passed \
  --metrics '{"grade": "D", "p1_total": 5, "p2_total": 12}'
```
