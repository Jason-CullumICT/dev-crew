# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-13 — First audit run

**Services offline pattern:** The backend (3001) and frontend (5173) were offline during the audit run. Both performance-profiler and chaos-monkey require live services — skip them gracefully and document in the report. Static mode still yields high-value findings (quality + dependency).

**Dependency auditor output format:** The dependency-auditor delivers two files: a `.md` for human reading and a `.json` for structured integration. The `.json` is in `Teams/TheInspector/findings/`. Use the JSON directly when synthesizing — it has clean severity categorisations.

**Quality oracle grade vs. dependency grade interaction:** The quality-oracle may emit its own grade (D in this case); the dependency-auditor also emits a grade (C). The team-leader synthesises these against `config.grading` thresholds using the *combined* P1/P2 totals across all specialists — do not average or defer to a specialist's individual grade.

**CVE P1/P2/P3/P4 mapping:** Use this mapping when assigning priority tiers to CVEs:
- CVSS ≥ 8.0 or arbitrary code execution / secret exposure → **P1** (escalate to TheGuardians)  
- High severity (DoS, XSS, path traversal, CRLF, ReDoS, crash) → **P2**  
- Moderate severity → **P3**  
- Low severity → **P4**

**Escalation with no open PR:** When `gh pr view` returns nothing, use the `printf`-based escalation path — print the escalation block to stdout and include in `inspector-report.md`. Do not silently skip escalation.

**False-green traceability gate:** This project's `tools/traceability-enforcer.py` only checks the most-recently-modified plan file in `Plans/`. It never reads `Specifications/`. Always note this when reporting spec coverage — the "TRACEABILITY PASSED" CI result is misleading and requires a separate spec-level audit.

**Spec status confusion:** `dev-workflow-platform.md` and `tiered-merge-pipeline.md` describe future/aspirational systems — not the current implementation. This creates 0% coverage on ~80 FRs. The fix is `status: roadmap` frontmatter, not implementation. Surface this prominently so agents reading the report don't misinterpret the coverage gap as code rot.

**Cross-reference map value:** The cross-reference map (§8) is where remediation velocity is won. Grouping QO-001+QO-008 under the same root ("missing search route") shows a single TheFixer task resolves two findings. Grouping QO-003+QO-004+QO-005 under "spec status markers" shows a solo-session task resolves three P2s. Always build this map.

**Output file paths:**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (repo root, for easy PR visibility)
