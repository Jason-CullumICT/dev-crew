# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-06 — First full audit run

**Grading gotcha — dependency CVEs amplify P1 count fast:**
The grading thresholds use P1 count as the primary gate. A single outdated test toolchain (jest 29 + vitest 2) contributed 3 P1 CVEs and 35+ HIGH vulns. This turned what would have been a C into a D. When scoping the audit, check `npm audit` early — if it returns critical CVEs, expect the grade to drop two levels.

**Spec stale = systemic trust failure:**
When `Specifications/` diverges from `Source/`, it misleads every downstream agent and reviewer. The traceability enforcer only looks at `Plans/*/requirements.md` — it cannot detect this drift. Add a pre-audit step: count untraced FRs in `Specifications/*.md`. If that count is non-zero and no plan covers them, flag immediately as P1 before running other specialists.

**Services offline → two specialists cannot run:**
performance-profiler and chaos-monkey both require live services. When backend/frontend are offline, the audit is incomplete. The report should note this prominently and recommend scheduling a follow-up dynamic audit. Consider adding a scoping-phase note to the audit plan that warns the parent session if services are not reachable.

**Cross-reference map is the highest-value synthesis product:**
Section §8 is the most actionable output for engineering. Three cross-refs in this audit identified that updating jest + vitest would close 5 findings in one command, and archiving the stale spec would close 3 findings. Always build this map before writing §15 Recommendations — it prevents redundant fix tickets.

**Escalation flow — no PR available in this run:**
The project was audited on a branch with no open PR (`gh pr view` returned empty). The escalation fell back to stdout. Recommend always checking PR status in the scoping phase and noting it in the scope output, so the parent session can decide whether to open a draft PR before running TheInspector.

**Grade path to B is clear:**
From D → B requires: (1) patch 4 CVE P1s via npm update, (2) archive stale spec. These are mechanical changes with no code logic. After those two actions the grade would be B (0 P1s, 6 P2s, 100% active-plan coverage). Communicate this "grade path" in the executive summary so stakeholders understand the effort required.

**inspector.config.yml `report.output_dir` is the canonical save path:**
Always save to `Teams/TheInspector/findings/` using the `filename_pattern` from config. Do not save to the repo root. The summary `inspector-report.md` at the repo root is acceptable as a quick-reference but the full HTML report and JSON backlog belong in findings/.
