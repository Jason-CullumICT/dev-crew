# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

---

## Run: 2026-08-31 · Grade F · run-20260831-094505

### What happened
Full synthesis run. Read all four specialist reports (static-analyzer, compliance-auditor, pen-tester, red-teamer). 23 consolidated findings produced after deduplication.

### Target correction (important for future runs)
The pen-tester mapped `Source/Backend/` (work-items state machine app) but `docker-compose.test.yml` runs `portal/Backend/` (feature-request/bug portal). The red-teamer correctly identified this and adapted all chains to the actual live service. Vulnerabilities are structurally identical across both services. **Future runs should confirm which backend the Docker stack runs before dispatching the red-teamer.**

### Deduplication patterns that worked
- SAST-001 + PEN-001 + RED-001 + COMP-001 all identify the same auth gap — merge into F-001 with all source IDs.
- PEN severity escalation from SAST: PEN-001 escalated "no auth" from SAST High → Critical (correct — pen-tester assessed exploitability). Final synthesis uses the higher severity only when RED-ID confirms it live.
- PEN-002 was Critical per pen-tester (unvalidated enums) but no explicit RED-ID confirmed it — downgraded to High (Theoretical) in synthesis.

### Grading calibration
- Automatic F triggered by RED-002 (state machine bypass — critical objective). Do not over-think the rubric when a confirmed Critical objective breach exists; apply F immediately.
- 12% compliance pass rate. The entire SOC2 CC6.x family fails because there is no auth layer. Single fix (F-001) unblocks 5+ controls.

### Red-teamer reliability notes
- Red-teamer reliably confirms auth absence (always RED-001 equivalent).
- Red-teamer reliably confirms pagination (limit=999999) — always test this.
- Force-approve and PATCH status bypass are reliably confirmed when a `/force-approve` or unchecked `PATCH status` endpoint exists.
- Webhook spoofing (SAST-002/PEN-007) was NOT given a named RED-ID despite rate-flooding being tested — mark as Theoretical unless explicitly confirmed.

### Synthesis shortcut for future runs
If PEN-001 is "no auth on entire API" and RED-001 confirms it, the grade is automatically F (or at minimum D). Do not wait for full deduplication before deciding grade direction.

### False alarm candidates to watch
- V7.4 (error handling) PASSES in ASVS — the compliance auditor correctly notes generic errors are returned in most 500 paths. The isolated RED-008 (orchestrator URL leak) does not change the overall V7.4 pass.
- COMP (SOC2 CC8.1) is PARTIAL, not FAIL — change history tracking exists in the model, just lacks actor identity and persistence.
