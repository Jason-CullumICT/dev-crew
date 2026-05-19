# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-19 — First Consolidated Audit

**Grade calculation: always use config grading thresholds, not individual specialist grades.**
- quality-oracle self-graded C (1 P1, 4 P2). dependency-auditor added 2 more P1s.
- Combined P1 count = 3, which exceeds C threshold (max_p1=2) → overall grade D.
- Do not average or use the most common specialist grade; use the config thresholds directly.

**Performance-profiler and chaos-monkey are skipped when services are offline — note this clearly.**
- Both require live services. When offline, include a static-analysis note in Section 12 (Latency)
  and Section 6 (Specialist Reports) with "SKIPPED — static concerns only" rather than omitting the section.

**Two specialist reports (quality-oracle-report.md, dependency-auditor-report.md) are written as agent output summaries, not structured JSON.**
- Parse them by reading the markdown heading structure. Finding IDs (QO-NNN, DEP-NNN) are in ### headers.
- The dependency-auditor also writes a structured JSON to Teams/TheInspector/findings/audit-{date}.json — prefer this for machine-readable data.

**Escalation trigger: DEP-001 + DEP-002 were both [ESCALATE → TheGuardians] tagged by dependency-auditor.**
- Tags appear as `**Cross-ref:** [ESCALATE → TheGuardians]` in the markdown report.
- Always grep for this pattern in specialist reports before generating the escalation block.

**Prior audit comparison: check findings/ for *.html files from earlier dates before writing Section 5.**
- First audit has no prior baseline. Be explicit: "First consolidated audit — no prior baseline."
- Future audits should grep findings/*.html by date (not including today) and read the grade + P1/P2 counts.

**Cross-reference map (Section 8) is the highest-value section for remediation planning.**
- Group by root cause, not by finding. The most common pattern: fragmented implementation of a single spec
  requirement (QO-001 + QO-003 both traced to FR-dependency-* gap) and tool config not updated as codebase grew.

**Traceability enforcer gives a false 100% green because it only scans Source/.**
- This is a recurring risk for this project. Always note it in Section 11 (Spec Coverage) with a warning.
- Actual coverage (~92%) is measured by quality-oracle across all app trees.

**inspector.config.yml contains grading thresholds, escalation triggers, and service health URLs.**
- Always read it first. It overrides auto-discovered values and defines the grade cut-offs used in synthesis.

**Dependency audit findings split across two files:**
- `dependency-auditor-report.md` in repo root = agent summary narrative (human-readable)
- `Teams/TheInspector/findings/audit-{date}.json` = machine-readable structured findings
- When counts differ between the two (e.g., DEP-005 vs DEP-005+DEP-006 for OTel packages), prefer the
  JSON for finding IDs and the markdown for narrative descriptions.
