# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-29 — First Audit Run

**Grading behaviour:** The config thresholds are applied to combined totals across ALL specialists. Even if quality-oracle grades itself C (1 P1), the combined 6 P1s from dependency-auditor push the overall grade to D. Always aggregate across specialists before computing grade.

**Dependency auditor always runs last — its CVE count dominates the grade.** If dependency findings are present, they will typically drive the overall grade lower than any single specialist's self-assessment. Expect this pattern.

**No PR context in audit branches:** Audit branches (`audit/inspector-*`) are not associated with open PRs by default. The escalation block falls through to the stdout path. This is expected and correct — still write the escalation notice clearly in both inspector-report.md and the HTML report.

**Services were offline for this run.** performance-profiler and chaos-monkey could not produce dynamic results. Two of four specialists ran (static-only). The recommendations section should always flag "re-run with services online" as a backlog item when dynamic specialists are skipped.

**Spec coverage calculation:** Use "active plan FRs" (plans with source implementations) as the numerator for the headline coverage figure. Include orphaned specs from Specifications/ to drive the "effective" coverage downward in the grade calculation. Document both figures in the report.

**Cross-reference map is valuable for prioritisation:** The pattern "missing `pending_dependencies` status → QO-001 + QO-003" (one fix resolves two findings) is the most impactful section for operators. Always build this map — it directly reduces remediation cost.

**Traceability enforcer gap (QO-005) is a recurring risk.** On projects with multiple active plans, the bare `python3 tools/traceability-enforcer.py` command only checks the most-recently-modified plan. Document this clearly in the report and in CLAUDE.md recommendations.
