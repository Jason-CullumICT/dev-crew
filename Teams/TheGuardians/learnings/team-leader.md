# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-10-05 — Grade F

### What Was Found
- **Zero authentication or authorization** on every API endpoint — the single dominant root cause behind 12+ findings.
- **Red-teamer achieved all 4 critical objectives** + 1 bonus (unauthenticated cycle injection), resulting in an automatic Grade F.
- **10 confirmed live breaches** (RED-001 through RED-010); 12 theoretical SAST/PEN/COMP-only findings.
- **Compliance: 20% pass rate** (4/20 controls) — both OWASP-ASVS L2 and SOC2-Type2 at 20%.
- XSS, vote stuffing, and state-machine bypass were all confirmed live with zero credentials required.

### Scope Decisions
- The pen-tester correctly analysed `Source/Backend/` (work-items domain).
- The red-teamer ran against the ephemeral portal/ application (feature-requests/bugs/cycles domain).
- All PEN-ID vulnerability classes mapped 1:1 to the portal domain — the architecture is identical, confirming the findings are not domain-specific.

### Deduplication Notes
- SAST-001 + PEN-001 + COMP-001 all describe the same root cause (no auth). Merged into F-001.
- SAST-005 + PEN-004 + COMP-008 + RED-003 all describe the same pagination issue. Merged into F-008.
- SAST-006 + PEN-007 + COMP-004 + COMP-005 + RED-005 merged into F-012.
- SAST-007 + PEN-008 + COMP-009 + RED-006 merged into F-013.
- PEN-006 covered two separate issues: the overrideRoute bypass (→ F-003) and the NeedsClarification silent mapping (→ F-018); keep separate.

### Grading Calibration
- The compliance-auditor graded it as "C" on static analysis alone; the red-teamer's confirmed breaches automatically triggered Grade F. The static-only grade underestimated severity.
- When there is zero auth, always assume the red-teamer will achieve all critical objectives — dispatch it only against ephemeral environments, but pre-grade the static findings as F-risk.

### False Alarm Patterns (None This Run)
- No false alarms encountered. All PEN-IDs were validated against live service equivalents.

### Specialist Reliability Notes
- **static-analyzer**: Reliable. Correctly flagged all 8 distinct SAST issues. Ran LLM pattern scan when gitleaks/semgrep were unavailable — sufficient for this codebase.
- **pen-tester**: Reliable. Produced a comprehensive attack surface map (12 PEN-IDs) covering all critical entry points. The overrideRoute bypass (PEN-003) was a valuable novel finding not in SAST.
- **compliance-auditor**: Reliable. Produced a detailed 11-finding compliance report and matrix. Note: reported Grade C (static-only view) — team-leader must always apply red-team confirmed-breach grade override.
- **red-teamer**: Reliable and thorough. Achieved all objectives + bonus. The domain mismatch (work-items vs. portal) was well-handled — vulnerability classes confirmed across domains.

### Next Run Recommendations
- If auth is added before the next run, focus compliance-auditor on RBAC enforcement (CC6.3, V4.2.x) and audit event completeness (CC7.1, V7.1.2).
- Ensure the next red-teamer run explicitly tests the `/api/intake` webhook endpoints for HMAC bypass (F-006 was not confirmed live this run).
- Add XSS findings to the standard pen-tester checklist — F-011 was only found by the red-teamer.
- The `overrideRoute` pattern is a recurring risk in state-machine implementations — add it to static-analyzer's `always_check` list.
