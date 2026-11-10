# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-11-10 (run-20261110-094219)

**Grade: D** — 15 P1 findings, 76 P2, 219 total. First audit, no baseline.

#### Key Synthesis Discoveries

1. **Stale domain specs dominate P1 count** — QO-002 and QO-003 together produce 23 of the 15 P1 findings (spec-drift). Governance decisions to add `STATUS: BACKLOG` headers would immediately reduce P1 count from 15 to 3 for the next audit. Always assess spec-drift P1s separately from implementation P1s — they require different remediation paths (planning, not coding).

2. **dependency-auditor P2 count dwarfs quality-oracle** — 74 high CVEs vs 2 architecture violations. When combining, make sure to surface the security escalations (4 CVEs → TheGuardians) separately from the fixable P2s (TheFixer). Without this split, the report becomes unactionable.

3. **Cross-reference map resolves 4 P1/P2s with 2 fixes** — `workItemService.ts` creation resolves QO-004 AND provides the natural OTel span injection point for QO-005. Enforcer regex fix resolves QO-001 and QO-006 together. Always look for root-cause consolidation before writing recommendations.

4. **Services offline → performance-profiler and chaos-monkey cannot run** — both need live services. When services are down, mark them as skipped in the report rather than failing. Static concerns from inspector.config.yml (unbounded list iteration, synchronous I/O) should be noted as "unverified static risks" in the latency section.

5. **Escalation block** — `gh pr view` may exit 4 when no PR exists for the branch. Fall back to stderr notice gracefully. The escalation message is still important even without a PR.

6. **Grade thresholds from config.grading** — always apply them: A (0 P1, ≤3 P2, ≥80% coverage), B (0 P1, ≤8 P2, ≥60%), C (≤2 P1, ≤15 P2, ≥40%), D (anything worse). F requires confirmed exploitable auth bypass + critical domain failure — don't grade F on CVE presence alone.

7. **First-audit baseline note** — always state "First audit — no baseline" in §5 Trend and §7 Re-Verification. All findings are NEW. Fixed/Regressed sections are empty.

8. **Report file naming** — `audit-{date}-{grade}.html` and `bug-backlog-{date}.json` go in `Teams/TheInspector/findings/`. Also write `inspector-report.md` in repo root as a quick summary for the requesting session.
