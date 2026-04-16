# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-16 — First Synthesis Run

**Grading mechanics:**
- Always check `inspector.config.yml` grading thresholds before assigning grade. The thresholds are `max_p1` + `min_spec_coverage` combined — a project can fail on coverage alone even with 0 P1s.
- Combined P1 count across all specialists, not per-specialist, determines the grade. Two specialists each reporting 2 P1s → 4 combined → grade D.

**Specialist report format:**
- quality-oracle writes to `Teams/TheInspector/findings/audit-{date}-{grade}.md`
- dependency-auditor writes `AUDIT-{date}.md`, `audit-summary-{date}.json`, `AUDIT-COMPLETION-{date}.md`
- The dependency auditor's JSON summary is the canonical structured input for synthesis

**Cross-reference pattern:**
- Look for root causes that span multiple findings from different specialists — the Vite lag caused 3 separate CVE findings; fixing one root cause resolves all three
- The enforcer underscoping pattern is a recurring risk: check if the gate is actually enforcing the right inputs on every audit

**Escalation:**
- `injection` keyword trigger fires on Handlebars/JavaScript injection CVEs (not just SQL injection)
- When no PR exists, use the terminal escalation block and print the branch/audit info clearly
- Always check `config.escalation.security_triggers` list — it's short and easy to miss subtle triggers

**Performance/Chaos skipping:**
- Services were offline at audit time; both specialists were skipped
- Static-mode fallback for these specialists is meaningful — next run should try to schedule during a time when services are up
- Note in the Scope & Environment section exactly which services were checked and what the health endpoint returned

**Spec coverage caveat:**
- `tiered-merge-pipeline.md` FRs are correctly implemented but in `platform/` not `Source/` — the 0% reading is a gate blind spot, not actual missing implementation
- When weighted coverage looks dire, investigate whether it's truly missing implementation vs. gate blind spot before grading

**HTML report:**
- The 16-section HTML template is well-structured; the risk matrix (§10) is the most time-intensive section to fill correctly
- Use `border-left:4px solid var(--p1/p2/p3)` for finding cards — it makes severity scannable at a glance
- The escalation banner in §3 Executive Summary should be the very first visual element when an escalation exists
