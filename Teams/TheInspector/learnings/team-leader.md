# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-12 — First Audit Run

**Grading nuance — spec coverage:** The `min_spec_coverage` threshold in `inspector.config.yml` applies to ALL specs in `Specifications/`, not just the active implementation plan. When the primary spec (`dev-workflow-platform.md`) covers a different domain from the current source, overall coverage will be artificially low (27%). The quality-oracle grades its own segment based on active-plan coverage (100%), but the team-leader synthesis must use the full coverage figure. Be consistent: report both metrics and explain the divergence.

**DEP-001 Handlebars escalation context:** Handlebars.js appears in the npm audit as a transitive dependency of Backend and Frontend. Whether it's actually exploitable in production depends on whether user-controlled input ever reaches `Handlebars.compile()` or the CLI precompiler. The dep-auditor cannot determine this statically — TheGuardians must verify. Always escalate, even if likely dev-only.

**`npm audit fix` is a single-command remediation:** DEP-002, DEP-003, DEP-004, DEP-005 and most remaining moderate CVEs are all resolved by `npm audit fix` in Backend and Frontend. Cross-reference these in the report so TheFixer doesn't create separate tickets for each — one PR fixes them all.

**Performance-profiler and chaos-monkey require live services:** Both specialists need the backend (port 3001) and/or frontend (port 5173) to be healthy. When services are offline, mark them SKIPPED (not FAILED) and note the data gap prominently in §4 Scope. Do not penalise the grade for missing dynamic data — note it as a caveat.

**First audit baseline is critical:** Always include a "First audit — no baseline" note in §5 Trend. Future audits will use today's grade (D) as the baseline. Set expectations: grade should improve to C once QO-001 is fixed, CVEs are patched, and spec alignment is documented.

**Cross-reference map reduces TheFixer tickets:** Grouping findings by root cause (e.g., "no npm audit fix run" covers 4 CVEs) prevents TheFixer from creating redundant tickets. This is the most operationally useful section of the report for engineering teams.

**Escalation path when no PR exists:** When `gh pr view` returns no PR and `gh repo view` fails, fall back to the `printf` escalation block (not the `gh pr comment` block). Include the branch name and audit ID so the team can trace it.

**Direct deps need manual version bumps:** `npm audit fix` only patches transitive dependencies. Direct deps like `uuid@9` require explicit `npm install uuid@latest` and may have breaking API changes. Always flag these separately from transitive CVEs.

**Spec divergence is a strategic decision, not a coding bug:** QO-002 (69 FRs with zero coverage) is the most confusing finding for new readers. The key point is that source implements `WorkItem`/`workflow-engine.md` while the primary spec describes `FeatureRequest`/`BugReport`. This is an intentional divergence that was never documented. The fix is a CLAUDE.md note, not a code change — assign to requirements-reviewer, not backend-coder.
