# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-20 — First Audit Run

**Specialist report format:** quality-oracle writes a markdown file with a JSON block at the bottom. dependency-auditor writes to `Teams/TheInspector/findings/` directly (not a root-level report file). Synthesiser must `cat` or `find` the findings directory alongside the root-level report files.

**Grade D trigger:** The single largest grade driver was spec coverage. `dev-workflow-platform.md` contains 74 FRs for a product the codebase no longer implements. Archiving or superseding that one file would lift spec coverage from 13.4% to ~88%, moving the grade from D to B in a single documentation decision. Communicate this clearly to operators — the code quality is actually reasonable (P2-level only), the D grade is almost entirely a docs/spec hygiene issue.

**Escalation path (no PR / no repo):** When `gh pr view` and `gh repo view` both return nothing (offline/sandbox environment), fall through to the printf escalation block. Write the escalation notice prominently in the report header as a banner — operators reading the HTML see it immediately without needing to parse the JSON backlog.

**Vite cross-finding consolidation:** DEP-002, DEP-005, and DEP-011 all resolve with a single `npm install vite@^5.4.3`. Surface this in the Cross-Reference Map (§8) and in the Block Deployment recommendations — one command fixes three findings.

**performance-profiler / chaos-monkey:** Services were not running. Include them in §6 with a clear SKIPPED badge and opacity reduction rather than omitting the cards — operators need to know they weren't run, not assume they were clean.

**Handlebars conditional risk:** Handlebars CVSS 9.8 is transitive via @babel/core. The actual runtime risk depends on whether any code calls `Handlebars.compile()` with user input at runtime. Flag as P1/escalate, but include the investigation command (`grep -r "require.*handlebars\|import.*Handlebars" Source/ portal/`) prominently so operators can confirm or lower the severity themselves.

**Spec coverage metric:** Two numbers matter — Plans/ coverage (what the enforcer measures, 100%) and Specifications/ coverage (what CLAUDE.md says is "source of truth", 13.4%). Always report both; the gap between them is the headline finding for quality-oracle.
