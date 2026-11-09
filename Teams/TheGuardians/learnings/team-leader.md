# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-11-09 (run-20261109-112048) — Grade F

### What the run found
- **Zero authentication on the entire API surface** — this single root cause triggered failures across all 4 compliance frameworks and enabled every red-team objective.
- **Red-team discovered Stored XSS (F-004)** that neither SAST nor pen-tester flagged explicitly (COMP-014 noted the risk but RED-004 confirmed it). Always ensure the red-teamer targets free-text fields for XSS even if static analysis doesn't flag them.
- **force-approve endpoint** was not in the pen-tester's critical_entry_points list in security.config.yml, but the red-teamer found it anyway. Add `/api/*/force-approve` and `/api/*/vote` patterns to `pentest.critical_entry_points` for future runs.
- **All 4 red-team objectives achieved** in a live ephemeral environment. Grade F is correct and automatic.

### Synthesis calibration notes
- PEN-001 (Critical) + SAST-001 (High) + RED-001 (Critical) → merged as F-001 Critical Confirmed. Correct — the pen-tester correctly escalated to Critical what SAST rated High, and red-team confirmed.
- Compliance pass rate 29% — well below any grade threshold. No grade above F is achievable until authentication is fully implemented.
- The 23-finding count after deduplication from 9 SAST + 11 PEN + 6 RED + 14 COMP raw findings is accurate. Many COMP findings map to the same root cause as SAST/PEN.

### Scoping decisions that paid off
- Running all three static agents in Phase 1 in parallel worked well — the pen-tester's attack surface map provided the red-teamer with a clear chain to follow.
- Verifying the ephemeral environment gate before dispatching the red-teamer is critical — confirmed correct per security.config.yml `require_ephemeral_environment: true`.

### For next run
- Add `/api/*/force-approve`, `/api/*/vote`, `/api/*/bulk` to `pentest.critical_entry_points`
- Once auth is added (F-001), re-run with focus on RBAC bypass and privilege escalation between roles
- If auth is added, expected grade improvement: D (compliance pass rate must reach ≥60% for C)
- Watch for XSS in any new free-text fields — route all such fields through sanitize-html server-side before the next audit
