# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-01 — First audit run

**Grading applied correctly:**
- Count P1+P2 across ALL specialists (not per-specialist). This audit had 4 P1s total (1 from quality-oracle, 3 from dependency-auditor) which exceeds the C-grade threshold of max_p1=2 → grade D.
- Each specialist may self-grade differently (quality-oracle graded itself C; dependency-auditor effectively D). The team-leader must aggregate and apply config.grading to the combined finding set.

**Cross-reference map is high-value:**
- The most useful cross-refs were: (1) route handler complexity + ReDoS CVE sharing a root cause, (2) CI dependency-hygiene gap explaining why 3 critical CVEs accumulated undetected. Finding shared root causes across specialists is more useful to developers than listing findings in isolation.

**Spec coverage nuance:**
- "100% enforcer coverage" vs "27% full spec coverage" can both be true simultaneously. The enforcer scope covers only 12% of declared requirements. Always report both numbers to avoid misleading stakeholders.
- The 73% uncovered full-spec gap is largely intentional scope exclusion (portal/ and orchestrator FRs not in Source/), but this is undocumented — flag it as a P3 finding.

**Escalation routing:**
- DEP (CVE) findings with RCE/injection/file-read triggers → TheGuardians escalation. Check the security_triggers list in config.escalation.
- QA/spec-drift/architecture findings → TheFixer even if P1 (e.g., QO-001 missing route is P1 but not a security issue — routes to TheFixer).
- When no PR exists, use the printf escalation path; note the branch name for traceability.

**First-audit baseline:**
- The "Fixed Findings" section must be included but will show "None — first audit" with explanation. Do not omit it.
- All findings are tagged NEW on first audit. The trend section must explicitly say "First audit — no baseline."

**Static-only mode caveats:**
- When services are offline, performance-profiler and chaos-monkey produce no data. Always note this in Section 4 (Scope & Environment) and Section 12 (Latency Baselines) so stakeholders understand the coverage gap.
- Include the configured latency budgets from inspector.config.yml in Section 12 even without runtime data — gives operators the targets they'll check against on the next live run.

**Lock files missing → audit not reproducible:**
- When 4 of 6 workspaces lack lock files, note this as a data caveat in Section 4. The vulnerability counts may differ on next run if npm resolves different transitive versions.

**HTML report must include all 16 sections even when empty:**
- Section 14 (Fixed Findings) and Section 12 (Latency Baselines) both had no data this run. Include them with explanatory content rather than omitting.
