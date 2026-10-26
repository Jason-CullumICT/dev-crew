# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-10-26 — Grade F (dev-crew Source App)

### What the run found
- The entire API is completely unauthenticated. This single root cause (CRIT-001) triggered 5 of 7 confirmed red-team breaches as prerequisite.
- The red-teamer tested `portal/Backend` (localhost:3001) while the pen-tester analyzed `Source/Backend`. The two backends are architecturally similar (Express, in-memory store) but differ in route names. All critical findings translated directly across targets.
- PEN-003 (soft-delete ghost blocker) manifested differently in portal: portal uses hard delete, but the missing FK CASCADE still created the same orphaned-dependency DoS. The exploit path changed but the root cause and fix are identical.
- PEN-007 (missing /api/search) was "not applicable" in portal because portal implements the route. Source/Backend gap remains a Low-priority item.
- Compliance pass rate was 9.5% — lowest possible outcome. The biggest driver: absent authentication means every auth-dependent ASVS/SOC2 control fails automatically. Fixing CRIT-001 alone would unlock ~12 subsequent control passes.

### Synthesis calibration notes
- When the pen-tester marks a finding Critical and the red-teamer confirms it with a live exploit, merge into CRIT-XX (not PEN-XX). Compliance findings on the same root cause merge into the CRIT/HIGH entry via the Sources field.
- Pagination `limit` was marked Medium by pen-tester but confirmed as a full-data-dump exploit by red-teamer. Elevated to High-Confirmed in synthesis. Rule: if red-teamer confirms full data exfiltration, upgrade to High.
- Unauthenticated /metrics was High from pen-tester; confirmed High by red-teamer. Kept as High-Confirmed. Rule: confirmed information disclosure of operational telemetry stays High, not Critical.
- Rate limiting (PEN-011/SAST-005) stayed Medium-Confirmed — it is a critical amplifier but not independently a data breach. Status "Confirmed" because red-teamer verified 0/100 requests received 429.

### What to focus scope on next run (if re-audited after fixes)
1. Verify CRIT-001 and CRIT-002 are fixed — re-run pen-tester and red-teamer against those specific endpoints first.
2. After auth is in place, re-audit RBAC specifically: check that manager role is required for approve/reject/dispatch, and that contributor cannot access admin endpoints.
3. Check that compliance audit events (login_attempt, permission_denied) are now emitted correctly after auth middleware is wired up.
4. Re-check pagination with auth in place: ensure limit cap is enforced at the store layer, not just route layer.

### Red-team reliability observations
- The red-teamer reliably succeeds on: unauthenticated API access (trivial), pagination bypass, metrics exposure.
- The red-teamer encountered "Not Applicable" on: webhook intake (not present in portal target), cascade reject dispatch (no reject endpoint in portal).
- Ensure the pen-tester and red-teamer targets are the same codebase. In this run, the mismatch (Source/Backend vs portal/Backend) caused 2 PEN findings to be non-testable. Future runs should confirm target URL aligns with static analysis scope.

### Grading calibration
- Grade F triggers immediately on any confirmed red-team breach of a critical objective. With 4/4 confirmed, the grade was never in question.
- Compliance pass rate of 9.5% is well below D threshold (no minimum). The rubric penalizes compliance independently of live exploits — both must improve to raise the grade.
- To reach Grade B after fixes: need 0 Critical, ≤ 6 High, ≥ 75% compliance. Fixing CRIT-001 alone would not achieve B unless all auth-dependent compliance controls pass, reducing High count, and adding rate limiting + headers.
