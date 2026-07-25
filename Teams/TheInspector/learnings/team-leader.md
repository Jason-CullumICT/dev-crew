# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-25 — First audit run (audit/inspector-2026-07-25)

**Spec identity problem is a recurring synthesis challenge.**  
This project has two incompatible requirement sets: `Specifications/` (79 legacy requirements for a different product) and `Plans/*/requirements.md` (13 active FR-WF-XXX requirements for the implemented product). The enforcer is wired to Plans/ and produces a false green. In synthesis, always report both coverage numbers separately (`official_specifications_pct` vs `active_plan_pct`) — the contrast tells the real story. Grade is always driven by the canonical Specifications/ coverage, not Plans/.

**Grade is D when spec coverage is 0%, regardless of P2 count.**  
The grading config's `D: { max_p1: 999 }` means D applies whenever the project fails C thresholds. C requires `max_p1=2` AND `min_spec_coverage=40%`. This project fails both simultaneously — the P1 count (4) would already push to D even if spec coverage were acceptable.

**Security escalations are a net positive for the grade narrative.**  
DEP-001 and DEP-002 are critical CVEs but they're development toolchain dependencies (test runner, test framework). If TheGuardians confirms they are not exposed in production and the upgrades are applied, those two P1s drop — potentially lifting the project to a C or B. Flag this in the executive summary to give operators a clear "how to move the grade" story.

**Dependency auditor report format needs post-processing.**  
The dependency-auditor produced its report in a rich narrative markdown format (not a JSON-first format). The synthesis step must manually extract finding IDs, severities, and escalation flags. A structured JSON findings format from the specialist would simplify cross-referencing. Consider adding a JSON findings block requirement to the dependency-auditor prompt.

**Cross-reference map is the highest-value synthesis output.**  
Operators consistently care about "what is the minimum number of PRs to fix this?" The cross-ref map (§ 8) that groups findings by shared root cause — with explicit single-fix descriptions — is more actionable than any individual finding card. Invest time here; don't skip it.

**performance-profiler and chaos-monkey need live services.**  
Without a running backend and frontend, half the specialist suite produces nothing. The audit scope note should always record service availability at audit time and set reader expectations upfront. In the next run, confirm services are live before dispatching specialists.

**Static escalation output (no PR context) is the common path in CI.**  
The escalation block printed to stdout (no open PR). This is expected for branch-based audit runs. The branch name `audit/inspector-2026-07-25-XXXX` suggests audits run on dedicated audit branches, not feature PRs. Ensure the escalation console output is captured in CI logs and routed to the security team's notification channel.

**Inflight memory leak (inflight@1.0.6) is a recurring transitive risk.**  
This package appears as "Not Supported" in every npm audit. It's pulled transitively via glob/jest. Flag it every audit until replaced. The fix is `lru-cache` as a direct dependency override or jest upgrade.
