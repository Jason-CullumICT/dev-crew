# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-31 — First Audit (run-20260531-063444)

**Grade: C** — 2 P1 (escalated), 6 P2, 11 P3, 1 P4

#### Scoping Discoveries

- **Both services were offline** at scan time (backend :3001, frontend :5173). This prevented performance-profiler and chaos-monkey from running. On future runs, ensure services are up before dispatching those specialists. The audit was limited to static analysis only.

- **inspector.config.yml `source.dirs` only lists `Source/`**. The portal app (`portal/`) — which contains the main product and 70+ active FRs — is missing from config. This caused quality-oracle to note it as a separate finding (QO-007). The next scoping pass should detect this discrepancy and include portal/ even if config doesn't yet list it.

- **The traceability enforcer gives a false-green** for the majority of the codebase. `tools/traceability-enforcer.py` hardcodes `["Source", "E2E"]` in `source_dirs`. Never trust enforcer green alone — always cross-check that portal/ was actually scanned.

#### Synthesis Discoveries

- **Dependency auditor grades its own domain independently** (it said D). The consolidated report grade (C) is determined by applying `inspector.config.yml grading` thresholds to the combined P1/P2 counts. With 2 P1 and 6 P2: C-level criteria satisfied (max_p1=2, max_p2=15, min_spec_coverage=40). Do not adopt specialist sub-grades directly.

- **Both P1 findings were injection-class CVEs** triggering security escalation to TheGuardians. Escalation was via the terminal block (no active PR found). Next time, check `gh pr view` earlier in the flow to prepare the comment template.

- **DEP-002 and DEP-012 share the same root package** (protobufjs). The cross-reference map (Section 8) is valuable for communicating "one upgrade fixes two findings" — populate it carefully.

- **Portal/ coverage gap cascades**: QO-001, QO-003, QO-004, QO-007 all trace back to portal/ being excluded from tooling scope. A single fix (add portal/ to enforcer + config) partially or fully resolves four separate findings. Always group by root cause.

#### Report Generation Notes

- HTML report saved to `Teams/TheInspector/findings/audit-{date}-{grade}.html` per config.
- JSON backlog saved to `Teams/TheInspector/findings/bug-backlog-{date}.json` per config.
- All 16 mandatory report sections included.
- Escalations array in JSON backlog is separate from the backlog array — TheFixer should read `backlog` only.

#### Recommended Pre-Run Checklist (for next audit)

1. Verify services are up before dispatching specialists: `curl -sf http://localhost:3001/ && curl -sf http://localhost:5173/`
2. If services offline, dispatch only quality-oracle + dependency-auditor; note dynamic tests deferred.
3. Check if QO-001 (enforcer) has been fixed before trusting `python3 tools/traceability-enforcer.py` output.
4. Load prior `bug-backlog-{prev-date}.json` to build re-verification context for all specialists.
5. Confirm inspector.config.yml `source.dirs` includes portal/ (QO-007 fix).
