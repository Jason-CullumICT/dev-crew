# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-08-03 — Grade F

### What happened
Full-spectrum audit run: static-analyzer (9 findings), compliance-auditor (12 findings, 13% pass rate), pen-tester (15 findings + attack surface map), red-teamer (9 chains, 7 confirmed exploits, all 4 objectives achieved). Automatic Grade F.

### Root cause pattern
Zero authentication on all API routes was the root cause for ~80% of all findings. When a project has no auth layer, virtually every other security control is irrelevant until F01 is fixed. In future runs, if SAST-01 / PEN-001 fires ("zero auth"), immediately flag this as a synthesis multiplier — every other finding's severity should be elevated because they are all trivially reachable.

### Config discrepancy — flag for next auditor
`security.config.yml` lists `/api/work-items/:id/transition` and `/api/work-items/:id/assessment` as critical entry points. Neither exists. Actual workflow endpoints are `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`. Update the config before the next run or instruct the pen-tester to probe both the listed and actual paths.

### Red-teamer behavior
- Red-teamer ran successfully against an ephemeral isolated instance (port 3099). Ephemeral gate was confirmed by the red-teamer's report header.
- All 4 objectives achieved in a single run — no need to chain multiple red-team invocations for a project this exposed.
- RED-009, RED-010, RED-011 confirmed effective controls (no breach). Record these as "working defenses" so future runs don't wastefully re-probe them unless the code in those areas changes.

### Grading calibration
- 13% compliance pass rate is the lowest possible without an actively hostile codebase. The 4 passing controls (CC8.1, V8.1, Art.25, changeHistory structure) are all passive/structural — they pass because the domain doesn't store PII and changeHistory is well-designed.
- An F grade here is unambiguous and correct. No borderline synthesis decisions were needed.

### What to watch in follow-up runs
1. After Sprint 1 (auth), re-run ONLY the pen-tester and red-teamer — static-analyzer and compliance-auditor findings are largely unchanged until persistence is added (Sprint 3).
2. The soft-delete cascade bug (F08) is the subtlest finding — it requires a specific sequence (add dep → approve both → delete blocker → try dispatch) that reviewers may miss. Add this to the pen-tester learnings.
3. Prototype pollution via intake enums (F07) produced permanent Prometheus label pollution. After a fix is deployed, verify the metrics endpoint no longer carries the polluted labels (requires process restart).

### False alarm notes
None in this run. All findings were real. No false positives from static analysis to filter.
