# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

---

## Run: 2026-06-22 (run-20260622-092803) — Grade F

### What triggered the F
RED-002 (force-approve overrides AI governance consensus) was confirmed live against the ephemeral environment. One unauthenticated POST bypassed a 3-deny / 2-approve AI vote. This is the automatic F-trigger per grading rubric.

### Target mismatch pattern
The pen-tester analyzed `Source/Backend` (workflow engine). The docker-compose test environment ran `portal/Backend` (feature-request/bug-tracking portal). The red-teamer correctly re-mapped all four objectives to the live application — vulnerability classes were identical, only domain object names differed (work items → feature requests / bugs). This mismatch did not affect the grade but should be noted: future runs should confirm which backend the test environment exposes before pen-tester scoping.

### Root cause is a single missing layer
The application has zero security dependencies in `package.json`. Every high- and critical-severity finding collapses to this single root cause. Once authentication is added, 7 of 8 high-severity compliance gaps resolve naturally. In synthesis, group all auth-absent findings under one root-cause node rather than listing them independently — this avoids inflating "theoretical High" counts.

### Deduplication: many findings, one cause
12 findings across all four specialists traced to auth absence. Merging them into 4–5 consolidated findings produces a cleaner backlog and avoids TheFixer scheduling the same fix eight times.

### Defenses worth noting
Two defenses were confirmed working:
- State machine direct-transition enforcement (RED-009) — all invalid status jumps correctly rejected with 400. The vulnerability is only the *privileged override* path (force-approve), not the state machine itself.
- CORS on `portal/Backend` (RED-008) — correctly restricts browser origins to localhost:5173. This is a defense, not a gap. Do not re-raise CORS for portal/Backend in future runs.

### CORS split: portal vs Source/Backend
`portal/Backend` has correct CORS. `Source/Backend` does not. Future static-analyzer runs should distinguish these — SAST-008 applies only to Source/Backend. Raising COMP-003 as High is appropriate for Source/Backend; it would be a false alarm for portal/Backend.

### Compliance pass rate calibration
7% compliance pass rate is accurate and will remain near-zero until authentication is added. Do not attempt to improve this metric via documentation alone — the controls actually require working auth, rate-limiting, TLS, and audit logging. Expect a jump to 40–60% after P0 remediation and a further jump to 80%+ after P1.
