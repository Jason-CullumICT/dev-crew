# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-27 — First audit run (Grade D)

**Grading dynamics across specialists:**
- Grade must be computed on combined P1/P2 counts across ALL specialist reports, not each specialist independently. Quality-oracle alone graded C (1 P1), but combined with dependency-auditor (3 P1 CVEs) the total was 4 P1 → Grade D. Always merge before grading.

**Dependency auditor contributes most P1s when CVE severity is high:**
- CVSS 9.8 CVEs (protobufjs, vitest UI, Handlebars) all trigger security escalation. When dependency-auditor surfaces CVSS ≥9.0, auto-route to TheGuardians regardless of whether the config explicitly lists the exact trigger phrase — the spirit of the escalation policy covers any critical injection or access-control bypass.

**Performance-profiler and chaos-monkey were not run:**
- No reports found. Likely services were offline. Add a pre-synthesis check: if a specialist report is missing, note it in section 4 (Scope) and section 6 (Specialist Reports) as "skipped — services offline". Do not hold up synthesis waiting for these reports.

**Enforcer false PASS is a systemic risk:**
- QO-006: The traceability enforcer reported PASS while 11 FRs were untraced. This misleads all agents that trust the gate. Cross-reference enforcer scope against the config's `specs.dir` on every audit — if the enforcer doesn't cover all spec files, flag it as P2.

**Cross-reference map is essential for TheFixer efficiency:**
- 4 root causes covered 12 findings. Presenting them as a cross-reference map (rather than 12 individual tickets) gives TheFixer a clear batching strategy and avoids duplicate PRs.

**OTel upgrade resolves both a security P1 and a quality P2:**
- DEP-001 (protobufjs ACE) and DEP-004 (OTel DoS) are both fixed by a single portal/Backend OTel upgrade. Always check whether a security P1 fix transitively resolves other P2 findings before assigning separate remediation tasks.

**Inspector.config.yml `security_triggers` list is not exhaustive:**
- "arbitrary code execution" is not in the trigger list but clearly meets the escalation intent. Apply judgment: any finding involving code injection, ACE, or unauthenticated file access should be escalated to TheGuardians even if the exact phrase doesn't match.

**Performance-profiler and chaos-monkey specs are well-defined in config:**
- `inspector.config.yml` has detailed threat scenarios (concurrent state transitions, malformed body) and latency budgets. On next run when services are available, pass these directly to the specialists so they don't need to re-discover them.

**First-run baseline:**
- Run ID: run-20260727-060851, Grade D. All 28 findings are NEW. Next audit should compare against this run to track FIXED/STILL OPEN/REGRESSED.
