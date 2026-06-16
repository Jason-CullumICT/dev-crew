# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-16 — First Audit Run

**Grading interaction pattern:** When dependency-auditor returns P1 CVEs (critical build-toolchain vulnerabilities),
it can drag the combined grade down by 2 full letter grades (quality-oracle alone = B; combined with dep-auditor D = C).
Always synthesise both specialist grades before assigning the final grade — never average them; apply the config.grading
thresholds to the *combined* P1/P2 totals.

**Services were offline:** performance-profiler and chaos-monkey were both skipped this run (localhost:3001 and
localhost:5173 unreachable). The full 4-specialist suite has never been exercised on this project. Next run should
start services first: `npm run dev` in Source/Backend and Source/Frontend before triggering the audit.

**Two CVE clusters map to two npm upgrades:**
1. Frontend: `npm install vite@^8 vitest@^3.2.6 --save-dev` → closes DEP-001/003/004/006 (4 CVEs)
2. Backend: `npm install ts-jest@^30 --save-dev` → closes DEP-002/010/018/019 (4 items)

**Ghost FR IDs are a real risk:** FR-090–095 exist in production portal code with no spec backing. The enforcer
doesn't catch this because it only scans Source/. Extend the enforcer first; write the missing specs second.

**No PR found:** The `gh pr view` call returned nothing (no open PR on this branch). The escalation banner was
printed to stdout instead of posted as a PR comment. This is correct behaviour per the escalation block.

**Report convention:** `audit-{date}-{grade}.html` in Teams/TheInspector/findings/ + matching `bug-backlog-{date}.json`.
The JSON backlog separates `escalations` (→ TheGuardians) from `backlog` (→ TheFixer / solo-session).

**Cross-reference map (Section 8) is high value:** Grouping findings by root cause (XR-1, XR-2, XR-3) made it clear
that 3 npm upgrade commands and 1 enforcer extension would resolve more than half of all findings. Synthesise
cross-refs before writing recommendations.
