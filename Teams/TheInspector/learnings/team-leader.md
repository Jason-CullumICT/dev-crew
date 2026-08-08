# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-08-08 (audit/inspector-2026-08-08-676c57)

### Synthesis Patterns That Worked

1. **Grade can't be a specialist average.** quality-oracle self-graded A, dependency-auditor self-graded C. The combined grade per config thresholds is D (3 P1s > max_p1=2 for Grade C). Always apply `inspector.config.yml` grading thresholds to the *combined* P1/P2 counts, not individual specialist grades.

2. **Dependency CVEs dominate grade.** A codebase with excellent spec coverage (97%) still lands at Grade D due to 3 P1 CVEs in transitive dependencies. The path to an A/B grade almost always runs through `npm audit fix` first.

3. **Cross-reference map is high-value for remediators.** XREF-B ("stale transitive deps → 6 findings resolved by one npm update pass") was the most actionable insight. Group findings by root cause, not just by specialist.

4. **Escalation trigger matching:** The config lists `security_triggers: ["auth bypass", "injection", "sensitive data exposed", "hardcoded secret", "missing access control"]`. The handlebars finding matched "injection" (JavaScript Injection in the title). Always scan finding *titles and descriptions* for trigger keywords, not just categories.

5. **static-only runs are incomplete:** performance-profiler and chaos-monkey didn't run because services were offline. Note this clearly in scope section; the grade may improve (or worsen) when dynamic testing is enabled. Recommend always re-running with live services before a release.

### Grade→Fix Mapping Pattern

For this project, the grade trajectory is:
- **Grade D → B:** Fix P1 CVEs (DEP-001, DEP-002, DEP-003) via `npm update`. ~2 hours. Grade moves to B (0 P1s, 5 P2s < max_p2=8).
- **Grade B → A:** Reduce P2s to ≤3. Fix QO-001 (enforcer) + QO-002 (service layer) + one dep P2. ~1 sprint.

### Traceability Blind Spot Pattern

This project has a structural pattern: `portal/` is the implementation home for 70+ requirements but is excluded from all automated gates. Watch for this in future audits — if spec families don't appear in enforcer output, check whether their implementation lives in an unscanned directory.

### Specialist Output Format Notes

- **dependency-auditor:** Reports P1/P2/P3/P4 in the markdown body, but the JSON summary uses "critical_findings" / "high_findings" / "moderate_findings" labels. The markdown body is authoritative for severity classification.
- **quality-oracle:** Self-assigned grade A is correct at the specialist level. It only reflects code quality, not CVE risk.
- **No performance or chaos data this run:** Both require live services. Static config threat scenarios provide a useful checklist but can't confirm exploit paths.

### Report Generation Notes

- HTML report: 16 mandatory sections — none may be omitted. Even empty sections (Fixed Findings on first audit) must say "None / First audit."
- Bug backlog JSON: `escalations` array is separate from `p1_findings` array. Escalated findings appear in both.
- File naming: `audit-{date}-{grade}.html` and `bug-backlog-{date}.json` per config.
- Inspector-report.md in repo root serves as the human-readable summary pointer — keep it concise and link to artifacts.
