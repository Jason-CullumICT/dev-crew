# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-19 — First Audit Run

- **Services are offline in CI/audit branches.** Both localhost:3001 and localhost:5173 are unavailable when running as a subagent. Always expect performance-profiler and chaos-monkey to run in static-only mode unless the parent session explicitly confirms services are live. Don't block on them — proceed with quality-oracle + dependency-auditor static results and note the gap in §12 and §6.

- **Grading with 3 P1s → D.** config.grading sets C.max_p1=2. Two CVE P1s (DEP-001, DEP-002) from dependency-auditor combined with one structural P1 from quality-oracle (QO-001) pushed the grade to D. In future audits, check whether test-toolchain-only CVEs should count the same as production-path CVEs — the config does not distinguish.

- **dependency-auditor reports P1 CVEs that need escalation triage.** Not all P1 CVEs are production exploits. DEP-001 (Handlebars, CVSS 9.8) is a transitive via jest — it's in the test toolchain. Still escalate to TheGuardians per policy, but annotate the context (test-only vs production path) clearly in the report so TheGuardians knows where to focus.

- **Quality Oracle findings directory.** The quality-oracle agent saves its own findings file to `Teams/TheInspector/findings/audit-{date}-{grade}.md` (using its own grade, not the final inspector grade). The team leader should not confuse this with a prior audit when checking for historical baselines.

- **inspector-report.md starts empty.** The file exists (1 line) before synthesis runs — it was created as a placeholder. The Write tool correctly overwrites it.

- **Cross-reference map is high value.** The §8 cross-reference map (e.g., upgrading Vite resolves DEP-005 + DEP-006 simultaneously) is the most actionable synthesis output. Spend time on it — developers use it to prioritize PRs.

- **No GitHub repo context in this environment.** `gh repo view` and `gh pr view` return empty. Always fall through to the console escalation path rather than assuming a PR exists.
