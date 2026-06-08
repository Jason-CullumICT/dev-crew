# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## 2026-06-08 — First Audit (run-20260608-070058)

**Grade assigned: D** — 4 P1 findings across 2 specialists.

### Key observations

1. **Two specialists ran, two were skipped.** performance-profiler and chaos-monkey both require live services. When backend is offline, mark those as skipped (not failed) and note missing baselines in §4 and §12 explicitly.

2. **Dependency-auditor grades on its own scale (CVE count) but team-leader grades on the combined P1 count.** The dependency-auditor reported grade D on its own. After combining with quality-oracle's 1 P1, the combined P1 count = 4, which also lands at D. Always recompute the grade from combined totals using inspector.config.yml → grading thresholds, not from individual specialist grades.

3. **portal/ is a second codebase the tooling doesn't know about.** The enforcer, the config source.dirs, and probably CI all hardcode Source/ only. Every new specialist should be briefed on this. It's a recurring theme — call it out in scoping.

4. **RCE vulnerabilities in transitive deps are common and the dependency-auditor found two (CVSS 9.8).** Both got [ESCALATE → TheGuardians] tags because "injection" was in their description. The escalation trigger match is case-insensitive and includes "RCE" if that matters in future; the config.escalation.security_triggers list is the authoritative source.

5. **No PR was open at synthesis time** — escalation printed to stdout rather than posting a PR comment. This is expected behaviour. The output text was logged for the operator.

6. **The Cross-Reference Map (§8) is the highest-value section for remediation planning.** Four root causes collapsed 8 findings into 4 fix actions. Build this carefully — it's what developers actually use.

7. **First-audit trend section**: Always record "First audit — no baseline" in §5 and §7. Do not attempt to synthesise trends from a single data point.

### Grading calibration

| Threshold | Requires |
|-----------|---------|
| A | P1=0, P2≤3, spec coverage ≥80% |
| B | P1=0, P2≤8, spec coverage ≥60% |
| C | P1≤2, P2≤15, spec coverage ≥40% |
| D | P1>2 or other failures |
| F | exploitable auth bypass + critical domain failure |
