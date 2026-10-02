# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-02 — First combined audit (quality-oracle + dependency-auditor)

**Grade calculation nuance:** When dependency-auditor runs, expect P1 count to jump significantly even on a codebase that quality-oracle rated C (0 P1). CVEs in direct dependencies automatically become P1 regardless of code quality. A combined D grade is often the accurate first result.

**Static-only mode is partial:** Both performance-profiler and chaos-monkey require live services. If services are offline, note this prominently in the scope section and flag that the grade may improve once dynamic testing runs. Always check service health at the start of scoping.

**Cross-reference mapping adds real value:** The handlebars (DEP-001 + DEP-004 → 1 fix) and vitest (DEP-002 + DEP-005 → 1 fix) cross-refs reduce the apparent P1 burden from 5 to 3 distinct patches. Operators appreciate knowing a single update closes multiple CVEs.

**Traceability enforcer false-positive risk:** The enforcer reports PASSED even when 74 domain FRs are completely uncovered — it only checks the most-recently-modified requirements.md. Future audits should flag QO-004 as a systemic risk until the enforcer is extended to cover all spec files.

**Spec drift is a red herring at first glance:** The domain spec (dev-workflow-platform.md) describes a different system than what is implemented. This is not an implementation failure — it is a documentation failure. The WorkItem engine is real and functional; the spec was never updated after the domain pivot. Route to RequirementsReviewer, not TheFixer.

**Escalation path when no PR/repo context:** Use the console escalation block (printf path). Include CVE IDs, CVSS scores, affected directories, and the specific branch. Make the message actionable: name the fix commands, name the team to trigger, and give the timeline.

**Grade projection is useful:** After identifying cross-refs, calculate what grade the codebase would achieve after the quickest fixes. Here: patching vitest + handlebars + protobufjs eliminates all 5 P1s → projected C→B improvement provides a clear motivation for the 48h sprint.

**npm workspaces fragmentation:** 13 package.json files across the monorepo creates inconsistent dependency versions and makes `npm audit` results harder to aggregate. Future audit note: recommend workspace consolidation as a backlog item in every audit until resolved.
