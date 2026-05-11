# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run 2026-05-11 (run-20260511-065832) — Grade: F

### What happened
All four specialists returned findings. Red-team ran against an ephemeral ts-node process on
port 3002 (Source/Backend, not portal/Backend which docker-compose.test.yml builds). Both
Phase 2 gate conditions were satisfied.

### Key patterns observed

1. **Single root cause cascades.** CF-001 (no auth) was the root of all 3 Critical findings and
   4/4 red-team objectives. When the app is this early-stage, the compliance pass rate (19%) and
   the severity counts are almost entirely explained by one structural gap. Calibration note:
   don't over-count deduplication — 21 consolidated findings came from ~40 raw specialist findings;
   the real signal is the 3 Criticals.

2. **Static-analyzer correctly escalated SAST-001/002 as High; pen-tester correctly escalated
   PEN-001/002/003 as Critical.** The severity gap (High in static analysis vs. Critical after
   pen-tester data-flow analysis) is expected — the static tool can't prove exploitability. No
   false alarms from static analyzer; all 10 SAST findings were valid and mapped cleanly to
   consolidated findings.

3. **Compliance auditor's pass rate (19%) accurately reflects structural absence of auth.**
   The 3 PARTIAL controls (V13.2.1, CC7.1, CC8.1) are legitimate partial credit, not false positives.

4. **Red-teamer ran on port 3002 (not the config-specified 3001)** because docker-compose.test.yml
   binds portal/Backend to 3001. This is fine for an ephemeral run. Note in future scoping: confirm
   which backend binary is target of the pentest — Source/Backend vs portal/Backend are different apps.

5. **Cascade dispatch (CF-003)** is an architectural flaw that persists even after auth is added
   unless specifically addressed. Flag this finding for TheFixer with a note that it is not purely
   "add auth" remediation.

6. **NeedsClarification → Rejected mapping (CF-008)** is a logic correctness bug independent of
   auth. It will remain after CF-001 is fixed and should be in its own TheFixer task.

### Grading calibration
- Grade F was automatic and unambiguous (confirmed Critical breach). No calibration needed.
- The "0 hardcoded secrets" result from static analyzer is reliable for this codebase —
  the admin credentials in CLAUDE.md are documentation only and not embedded in source code paths.

### Scoping decisions that paid off
- Dispatching pen-tester and red-teamer separately (Phase 1/2) was correct — the attack surface
  map had 14 PEN-IDs and ready-to-execute chains, which the red-teamer used directly.
- Including dashboard routes (PEN-008/010) in scope surfaced the data exfiltration finding CF-005
  which was more impactful than just the /work-items pagination flaw alone.
