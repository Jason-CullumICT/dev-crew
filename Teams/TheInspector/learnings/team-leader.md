# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-10 — First Full Audit (run-20260710-062029)

**Services were offline.** Backend (http://localhost:3001) and Frontend (http://localhost:5173) were both unreachable. Two specialists (performance-profiler, chaos-monkey) could not run. Always check service health first and set mode accordingly; document the gap in Section 4 (Scope).

**Quality Oracle grades independently.** QO gave Grade D on its own assessment. The team-leader overall grade also came out D (3 P1s exceeds C threshold of 2). The two grades converged because the dominant failure mode (broken CI gate) was also a P1 finding from QO.

**The traceability enforcer blindspot is a systemic amplifier.** QO-001 (false CI gate) is the root cause that makes all other spec-drift findings invisible. When synthesizing, identify which P1 findings are "gate failures" that mask other issues — they should be promoted to Block Deployment even above code CVEs.

**Dependency auditor escalation overlap.** DEP-003 (Vite path traversal) was escalated to TheGuardians by the dependency-auditor even though it is a P2 (not P1). The escalation trigger was the security nature (path traversal with potential source disclosure), not just severity. When reviewing the dependency audit JSON, always check the `escalate_to` field on each finding, not just P1s.

**Cross-reference map is worth the effort.** Root Cause B (no npm audit in CI) covered 8 separate CVE findings — one CI step would have caught all of them. Highlighting this in the report gives the reader a single highest-leverage action rather than 8 separate tickets.

**First audit baseline matters.** The Trend section and Re-Verification section were empty ("first audit — no baseline"). Make the current report a rich baseline: record all finding IDs, file paths, and package versions precisely so the next audit can compute accurate FIXED/REGRESSED deltas.

**Grading application.** Applied `inspector.config.yml` grading thresholds literally:
- C requires max_p1:2 and min_spec_coverage:40% — we had 3 P1s and 13% coverage → C excluded
- D is the catch-all for anything worse than C thresholds
- F was not applied: no confirmed exploitable auth bypass detected in static analysis
- Grade D is the correct call; document the P1 count and coverage as the two disqualifying factors
