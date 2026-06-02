# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-02 — First audit run

**Report files:**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html` (16-section)
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (root level)

**Grading reality check:** With dependency audits in scope, expect grade D on first run of most Node.js projects. CVE counts from `npm audit` often push P1 counts above the C-grade max_p1:2 threshold even on well-maintained codebases. Factor this into expectation-setting.

**Escalation routing:**
- Dependency CVEs with CVSS ≥8.0 and RCE potential → [ESCALATE → TheGuardians]
- Architecture violations (direct DB calls, missing service layer) → TheFixer, NOT TheGuardians (not an injection risk when params are bound)
- Traceability/spec-drift → TheFixer (for code) or requirements-reviewer (for spec backfill)
- Outdated specs (doc-stale) → requirements-reviewer, not TheFixer

**Services offline pattern:** When both services are offline, performance-profiler and chaos-monkey are skipped. The HTML report should still include §12 (Latency Baselines) and specialist cards for the skipped specialists with "SKIPPED — services offline" rationale. Never omit sections.

**Cross-reference map (§8) value:** The most actionable insight is often a two-finding cluster that can be resolved with one PR. teamDispatches.ts (QO-003 + QO-004) and dependency components (QO-005 + QO-006) are both examples of this — single-PR fixes for double P2 value.

**First audit baseline:** All 27 findings are NEW. The grade D from this run becomes the baseline for the next audit. The most important single action is fixing QO-001 (traceability enforcer) so the next audit has accurate spec coverage data.

**DEP-002 (Vitest) note:** Vitest RCE (CVSS 9.8) is a dev-time vulnerability but still escalated to TheGuardians because CI environments often expose test runner ports. Always escalate CVSS 9.8 RCE regardless of "dev-only" framing.

**portal/Backend dependency tree:** 577 transitive dependencies is the largest surface in the repo and the primary driver of CVE count. Recommend dependency rationalization as a long-term initiative.
