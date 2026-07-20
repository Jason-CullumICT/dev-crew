# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run 2026-07-20 — Grade F (run-20260720-063859)

### What happened
- All four specialists ran successfully. Red-teamer confirmed 6 live breaches against an ephemeral Docker environment.
- Automatic F grade triggered by RED-001: full pipeline traversal (potential → completed) in 4 unauthenticated HTTP calls.

### Key synthesis decisions
- **PEN-001 + PEN-002 + SAST-01 + COMP-001 + RED-001** were all expressions of the same root cause (zero auth) — merged into a single F-001 Critical. Avoids over-counting what is structurally one gap.
- **PEN-009 → RED-006** (cascade raw SQL bypass) was a separate confirmed breach from the auth absence — kept as its own finding F-004 even though it also depends on the auth gap, because the cascade logic flaw is independently exploitable once auth exists.
- **PEN-002** (fast-track override) and **RED-001** both represent state machine bypass but via different mechanisms (in-code override param vs. live force-approve endpoint). Merged under F-001 since both trace to auth absence as the enabler — the fast-track override is a business logic flaw inside the auth gap.
- **Compliance pass rate of 22%** was the dominant driver for grade in the absence of red-team breaches; it would have landed a D on its own (fails the 60% floor for C). Red-team breach superseded this with automatic F.

### Deduplication patterns that worked well
- Any SAST finding that matched a PEN finding on the same file/endpoint was merged — the PEN finding's detailed exploit path was preserved, SAST's CWE attribution was added.
- Compliance findings that exactly mirrored SAST/PEN findings (e.g., COMP-001 = no auth = SAST-01 = PEN-001) were listed only in `merged_from`; the primary finding carried the merged description.
- Four separate COMP-00{7,8,9,10} audit-event findings were collapsed into one F-012 since they share a single root cause and a single remediation track (implement auth first, then structured audit logging).

### False-alarm patterns to watch for
- V7.4 (error messages to clients) was rated PASS by the compliance-auditor because `errorHandler.ts` is correct — but SAST-06 correctly identified that route-level catch blocks bypass the global handler. The finding is real but narrow scope; correct to keep as Medium (F-010), not escalate.
- SAST-11 / PEN-011 (sequential docIds) rated Low — the primary UUID is correctly crypto-random. DocId counter is a human-readability feature. Do not escalate unless F-001 (auth) is never fixed and docId becomes the primary identifier.

### Red-teamer notes
- Red-teamer ran against `portal/` (the Docker container) while pen-tester analyzed `Source/Backend/` (the workflow engine prototype). These are architecturally similar but different codebases. RED-001 used `/force-approve` (portal-specific endpoint) which has no direct equivalent in the Source/Backend static analysis scope. Map findings carefully on future runs.
- Dead ends list is reliable: SQL injection, mass assignment, deny-after-approve, concurrent vote race, and IDOR on deleted items are all correctly blocked. Skip these on re-runs.
- Red-teamer found RED-006 (cascade bypass) not in the original 4 objectives — emerged from chaining PEN-009 against the live environment. Good example of the pen-tester's static analysis surfacing a finding the red-teamer confirmed via a different exploit path.

### Scope note for next run
- If auth (F-001) is fixed before the next run, the entire attack surface changes. Re-run pen-tester and red-teamer with RBAC bypass objectives (horizontal privilege escalation, JWT manipulation, role confusion). Static-analyzer should focus on the new auth middleware for logic flaws.
- If the cascade SQL fix (F-004) is applied, verify the fix uses the service-layer function and not just a status check wrapper.
