# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## 2026-04-15 — First Audit Run

### Project topology
- Port 3001 is the **portal backend** (`portal/Backend/`), NOT `Source/Backend/`. They are separate services.
  Source/Backend is the work-item workflow engine; portal/Backend is the debug UI backend.
  Dynamic tests that target port 3001 cover portal/Backend only.
- The traceability enforcer hardcodes `["Source", "E2E"]` as scan directories and entirely misses `portal/` (1,068 Verifies comments) and `platform/` (FR-TMP-* implementation). Coverage numbers for portal-based specs are inferred, not enforced.

### Grading
- Config thresholds: A (0 P1, ≤3 P2, ≥80% coverage), B (0 P1, ≤8 P2), C (≤2 P1, ≤15 P2), D (≤999 P1), F (exploitable auth bypass + critical domain failure).
- With 6 P1s this run landed on D. The two escalated P1s (SSRF + Handlebars RCE) are security-class but not a combined "auth bypass + critical domain failure" — D is correct, not F.

### Escalation routing
- `[ESCALATE → TheGuardians]` triggers on: injection, SSRF, stored XSS, missing rate limiting on external-facing proxies, CORS credentials scope issues.
- No PR or REPO context on this branch — use stdout escalation format (not gh pr comment).

### Cross-reference clustering saves remediaiton effort
- Grouping findings by root cause (projection layer, dashboard pre-aggregation, process lifecycle, error middleware, enforcer blind spots) lets TheFixer tackle 5 groups of 2–6 findings each with a single change, rather than 53 individual tickets.
- Always build the cross-reference map before writing recommendations — it changes the priority order.

### Common patterns to watch next run
- Both backends still lack SIGTERM handlers, graceful shutdown, uncaughtException handlers → will show as STILL OPEN if not fixed.
- Dashboard performance (PERF-002, PERF-003) needs Source/Backend running to get live latency measurements — static analysis can only project risk.
- If portal/Backend is at port 3001, chaos-monkey dynamic tests reach portal only; Source/Backend dynamic tests require a separate run with that service started.
- GET /api/dashboard returns 404 in the live portal (CHAOS-005) — possible stale build artifact or swallowed startup import error. Check compiled output on next run.

### Report file naming
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Root summary: `inspector-report.md`
