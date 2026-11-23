# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-11-23 — Grade: F

### What Was Found
- Root cause of all critical findings: zero authentication middleware on the entire Express API (`app.ts`). Single architectural gap cascades into 13 control failures across SOC2, OWASP-ASVS, ISO27001, and GDPR.
- Red-teamer confirmed 2 critical breaches (RED-001 workflow takeover, RED-002 full data enumeration + deletion) and achieved all 4 pentest objectives. Automatic Grade F.
- Target mismatch: pen-tester's attack surface map described `Source/Backend` workflow engine; live environment runs the portal backend (`/api/feature-requests`, `/api/bugs`, `/api/cycles`). Same vulnerability classes present in both. Red-teamer correctly adapted.
- Compliance pass rate: ~19%. Only 3 partial passes (CC7.1, CC8.1, V7) out of 16 controls. Zero full passes.

### Synthesis Decisions
- SAST-01 + PEN-001 + PEN-002 + COMP-001 + COMP-002 + RED-001 merged into single CRIT-01 (all describe the same auth absence; RED-001 confirms it live).
- SAST-05 + PEN-003 split: PEN-003 merged into CRIT-02 (confirmed enumeration objective); SAST-05 kept as separate MED-04 (DoS-specific angle, not yet confirmed).
- SAST-07 + PEN-010 + COMP-006 + RED-005 merged into MED-01 (confirmed by red-teamer but Medium severity — no PII exposed, only operational metadata).
- Compliance auditor included GDPR and ISO27001 beyond the SOC2+OWASP scope in `security.config.yml`. Both are relevant given the data retention and audit-logging gaps. Retained all findings.

### Patterns to Watch
- When an app has zero auth, all pentest objectives tend to be trivially achievable. Dispatch red-teamer but expect all 4 objectives to fall quickly.
- The compliance auditor surfaced GDPR Art. 17 (soft-delete) independently — worth including in scope even when not in `compliance.frameworks` if the codebase contains PII-capable fields.
- Hardcoded actor strings (`'user'`, `'manual-override'`) are a LOW finding in isolation but become a HIGH compliance gap once SOC2 CC7.1 is considered. Merge these in synthesis to avoid duplicate LOW/HIGH representation.
- Target mismatch between pen-tester (static analysis of `Source/Backend`) and red-teamer (live portal backend) is expected when the live environment runs a different app variant. Document in report but do not block synthesis — vulnerability classes are the same.

### Grading Calibration
- Grade F triggers on the first confirmed red-team breach of any critical objective. With zero auth, Grade F is essentially guaranteed once the red-teamer runs.
- The grading rubric in `security.config.yml` orders: F > D > C > B > A. D requires ≤2 Critical. This app has 2 Critical confirmed breaches AND all 4 objectives breached — well into F territory.
- Do not use "D" as a floor just because Critical count ≤ 2. The F override for confirmed breach takes precedence.

### Scoping Notes
- Phase 2 (red-teamer) ran because: (1) `require_ephemeral_environment: true` and the live environment was confirmed as the Docker Compose stack, and (2) the attack surface map existed with PEN-001 through PEN-011 findings.
- If the target is unavailable or red-teamer reports services down, record as "Phase 2: Not executed — services unavailable" and grade from Phase 1 findings only.
