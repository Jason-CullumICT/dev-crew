# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-25 — First Audit Run (run-20260425-044833)

**Services were offline for this audit.** Both localhost:3001 (backend) and localhost:5173 (frontend) were unreachable. performance-profiler and chaos-monkey were skipped. Always check service health before dispatching dynamic-mode specialists and document which specialists ran in the scope section.

**Traceability enforcer auto-selects only one plan** (the most recently modified requirements.md). When synthesising, quality-oracle findings about the dependency-linking plan require manual verification because CI doesn't target it automatically. QO-005 documents this gap.

**Two P1 CVEs escalated to TheGuardians** — protobufjs (portal/Backend) and handlebars (Source/Backend). No PR was open on this branch so the escalation was printed to stdout. When a PR exists, use `gh pr comment` for visibility.

**Grade C from 2 P1s** — Grade B requires zero P1s per inspector.config.yml. Even one critical CVE drops the entire audit to C. Dependency hygiene is a strong grade lever.

**Cross-reference map is high value** — QO-002 and QO-011 share a single root cause (missing Histogram in metrics.ts). Surfacing this saves TheFixer from treating them as independent tasks.

**Spec coverage was 93%** — all FR-WF-* implemented; FR-dependency-search and dependencyCheckDuration histogram were the two gaps. The frontend was already calling the dead search endpoint, so spec-drift had real user impact.

**bug-backlog JSON filename pattern:** Use `bug-backlog-{date}.json` (not `bug-backlog-{date}-{grade}.json`) — the grade belongs in the HTML report filename only.

**HTML report is gitignored** — findings/.gitignore excludes *.html. Only the JSON backlog and this MD report are committed. Don't reference HTML paths in commit messages as if they're tracked.
