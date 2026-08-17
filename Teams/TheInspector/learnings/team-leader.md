# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit Run: 2026-08-17

### Grade Issued: D

**P1 breakdown:** 6 total (4 DA critical CVEs + 2 QO architecture violations)
**P2 breakdown:** 31 total (3 QO + 28+ DA high-severity CVEs)
**P3 breakdown:** 67 total (3 QO + 64+ DA moderate CVEs)
**Spec coverage:** 99% real, 12% enforcer-visible

### Grading Calibration

The config thresholds worked correctly:
- C threshold is `max_p1: 2` — exceeded by 4 (6 P1 total)
- Grade D correctly issued
- Important nuance: the D grade reflects dependency state, not architecture quality. The codebase is
  well-structured with 99% real spec coverage. Future audits can recover to B quickly if CVEs are patched.

### Service Availability Pattern

Services (localhost:3001, localhost:5173) are typically offline during automated audit runs. This means:
- performance-profiler always runs static on this project in CI
- chaos-monkey always skipped in CI
- Plan for this: scoping block should detect offline services early and set expectations

**Reliable check command:**
```bash
curl -sf http://localhost:3001/ > /dev/null 2>&1 && echo "UP" || echo "DOWN"
curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "UP" || echo "DOWN"
```

### Specialist Report Location Pattern

Specialists write their reports to the working directory root (e.g. `quality-oracle-report.md`,
`dependency-auditor-report.md`). Always glob for `*-report.md` at the repo root before synthesis.
Also check `Teams/TheInspector/findings/` for any pre-existing specialist findings JSON files.

### Synthesis Deduplication Notes

On this run, no true cross-specialist deduplication was needed (the two specialists had
non-overlapping finding sets). However, the injection risk in QO-001 (search input unsanitised)
connects to the DA injection CVEs — this was captured in the Cross-Reference Map (Section 8)
as a shared root cause rather than a duplicate finding.

### Grading Config Location

Always read `Teams/TheInspector/inspector.config.yml` before assigning a grade.
The thresholds are: A(max_p1:0, max_p2:3), B(max_p1:0, max_p2:8), C(max_p1:2, max_p2:15), D(catch-all).
F is reserved for exploitable auth bypass + critical domain failure — not triggered in this run.

### Security Escalation Triggers (from config)

Escalate to TheGuardians when findings match:
- "auth bypass", "injection", "sensitive data exposed", "hardcoded secret", "missing access control"

In this run, the following escaped to TheGuardians:
- DA-001 (handlebars SSTI = injection)
- DA-002 (vitest = sensitive data exposed)
- DA-003 (protobufjs = injection/RCE)
- form-data CRLF (= injection)
- postcss (= injection/XSS)
- nanoid (= cryptographic failure — verify use in security contexts)

DA-004 (@grpc/grpc-js DoS) was routed to TheFixer (not injection/auth class — availability only).

### No PR Found — Terminal Escalation

On this run, no open PR was found (`gh pr view` returned empty). The escalation was printed to
terminal. This is expected for branch-scoped CI runs without an associated PR. The escalation
text is also captured in `inspector-report.md`.

### Report File Convention

- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (repo root — read by parent session)

Always check if `inspector-report.md` already has content before overwriting — on first run it was
empty, but on subsequent runs it will have the prior audit. Consider appending or creating versioned
files instead.

### Dependency Auditor Grade Interaction

The dependency-auditor graded itself D (critical CVEs). The quality-oracle graded itself C. The
composite grade was D — the minimum of component grades when any P1 exceeds the threshold.
This is correct per config.

### Things to Do Differently Next Time

1. Check whether `inspector-report.md` is empty vs. has prior content BEFORE writing
2. Collect run IDs from specialist reports to populate the dashboard `pipeline-update.sh` calls
3. The dependency-auditor run ID (`run-20260817-030823`) should feed into the dashboard metric
4. When both services are offline, proactively note in the report header (done ✓) and mention
   in the Scope section what scenarios are deferred (done ✓)
5. Cross-reference ESC IDs to finding IDs in the bug-backlog JSON — ensures TheGuardians can
   trace each escalation back to the specialist that surfaced it (done ✓)
