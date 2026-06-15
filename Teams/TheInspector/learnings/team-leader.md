# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-15 — First audit run

**Grade D issued (4 P1 findings):** The combined P1 count from quality-oracle (1) and dependency-auditor (3) totalled 4, exceeding the C-grade maximum of 2. Always aggregate P1s across all specialists before grading — individual specialist grades (both C) can mask the combined severity.

**Services were offline:** backend (port 3001) and frontend (port 5173) were both unreachable. Performance profiler and chaos monkey were skipped. Note for future runs: if services are down, static analysis still surfaces significant findings — don't skip the audit entirely.

**Cross-reference map (Section 8) is high-value:** Two root causes (portal/ tooling exclusion, esbuild build toolchain) each resolved 3 findings with a single fix. Always build the cross-reference map — it's the most actionable output for remediation planning.

**portal/ was invisible to all tooling:** The inspector.config.yml had `source.dirs: ["Source/"]` only, and the traceability enforcer only scanned `Source/` and `E2E/`. This means portal/ — the primary production app — was invisible to both quality-oracle and future chaos-monkey/performance-profiler. For future scoping: always verify that `inspector.config.yml` includes all production app directories, not just the reference implementation.

**P1 CVE escalation (DEP-001, DEP-002, DEP-003):** No open PR was found, so the escalation printed to console. The escalation block handled both cases correctly. For future runs: check `gh pr view` first and log whether we're in PR context or not.

**Grade trajectory after fixes:** Phase 1 (48h, DEP-001–003 + QO-001 traceability fix) should bring grade from D → C. Phase 2 architecture fixes (QO-002, QO-003) should bring C → B assuming P2 count drops below 8.
