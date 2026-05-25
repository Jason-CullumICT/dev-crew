# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-05-25 — Grade F

### What Was Found
- **Root cause is singular**: Zero authentication on both `Source/Backend/` and `portal/Backend/`. A single `requireAuth` middleware call neutralises ~70% of the finding list simultaneously. Emphasise this in future briefs to the fixer team.
- **Two codebases in scope**: Pen-tester analyzed `Source/Backend/` (work-item state machine); red-teamer ran against `portal/Backend/` (feature-request voting domain). They are structurally parallel — same vulnerability patterns, different domain models. Both must be fixed. Future runs should explicitly scope the red-teamer to whichever codebase is live at test time and note the divergence upfront.
- **Red team found one net-new finding** (RED-011: internal orchestrator URL leaking in 502 error body) that was not in the pen-tester's attack surface map. Flag for pen-tester learnings: check error responses for internal URL disclosure.
- **Vote retrigger farming (RED-003)** was a finding class not anticipated by pen-tester or static-analyzer because it requires understanding the probabilistic nature of AI vote results. Add "probabilistic re-roll attack on AI-generated verdicts" to the pen-tester's standard check list for AI-voting systems.

### Synthesis Calibration Notes
- **Deduplication**: PEN-001/SAST-001/COMP-001 all map to the same root cause (no auth). Merged into C-001 correctly. Future runs: treat "no auth" as a single severity-escalating finding, not three separate items.
- **Grading**: With all 4 red-team objectives achieved, Grade F is automatic per rubric regardless of theoretical finding counts. Do not attempt to negotiate grade — the rubric is correct and the F is justified.
- **COMP pass rate**: 28% is accurate. The two passing controls (V7.1.1 no secrets in logs, V8.1.1 no unnecessary sensitive data) are genuine positives. Do not discount them — they represent intentional good practices worth calling out.
- **Portal vs Source codebase discrepancy**: The pen-tester scoped to `Source/Backend/` per security.config.yml, but the live Docker environment runs `portal/Backend/`. Both need security fixes. Recommend updating `security.config.yml` to add `portal/Backend/` to `static_analysis.source_dirs` for the next run.

### What Worked Well
- The four attack chains from the pen-tester (Chain A–D) mapped directly to the four red-team objectives — excellent alignment.
- Parallel Phase 1 dispatch (static-analyzer + compliance-auditor + pen-tester) produced comprehensive, non-overlapping coverage with minimal duplication. The compliance-auditor caught H-009 (TLS) and H-008 (audit logging) that the pen-tester did not flag.

### Recommendations for Next Run
1. Add `portal/Backend/` to `security.config.yml static_analysis.source_dirs`.
2. After TheFixer remediates auth, re-run with focus on RBAC bypass and post-auth privilege escalation — the RBAC layer (H-008) will be the next critical gap.
3. Add "AI vote re-roll attack" to pen-tester's checklist for any system with probabilistic AI verdicts.
4. Add "error response internal URL disclosure" to static-analyzer's always_check list.
