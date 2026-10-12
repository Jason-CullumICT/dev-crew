# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-10-12 — Grade F

### What changed
First-ever run on this codebase. No prior baseline.

### Synthesis notes

**Root cause pattern — everything chains from one finding:**
The entire attack surface collapsed to a single root: no authentication anywhere. All 3 Critical findings and all 5 High PEN findings chain from PEN-001/SAST-001/COMP-001. When you see this pattern in future runs, dispatch the red-teamer immediately for the state machine and dependency objectives — they will all succeed.

**Target discrepancy — document it clearly:**
The pen-tester scoped `Source/Backend` (the canonical source); the live docker-compose test environment runs `portal/Backend` with different route namespaces (`/api/feature-requests`, `/api/bugs` vs `/api/work-items`). Both share the same structural vulnerability class. In synthesis: treat both as the same finding category, note the discrepancy under "Key Discovery", and confirm the vulnerability is present in both codebases before reporting severity.

**Deduplication pattern:**
- SAST-001 + COMP-001 + COMP-004 + PEN-001 + RED-001 → one C-001 finding. Do not report them separately.
- PEN-002 + PEN-003 + RED-002 + RED-007 → one C-002 finding (multiple bypass chains for the same control gap).
- SAST-005 + COMP-006 + PEN-004 + RED-004 → one H-002 finding.
- SAST-006 + PEN-008 + RED-005 → one M-001 finding.
- SAST-008 + PEN-013 → one M-006 finding.

**Grade F is automatic — don't over-think it:**
Per grading config, any confirmed red-team breach of a critical objective triggers F. When all 4 objectives are achieved, assign F immediately. No need to compute high/critical counts for the grade — they're irrelevant once F is triggered.

**Compliance pass rate is a separate signal:**
Even if grade is F, report the compliance pass rate accurately (17% in this run) — it's useful for the remediation roadmap priority.

**Red-teamer reliability:**
Red-teamer reliably confirmed all findings that flowed from the zero-auth root (PEN-001 chain). The one finding it extended (RED-006 from PEN-012) was the stored XSS — PEN-012 was rated Low (no length validation) but red-team discovered the deeper XSS impact. Consider promoting PEN-012-class findings to Medium in future static analysis passes.

**What the red-teamer missed:**
PEN-007 (bulk dependency replacement via PATCH) and PEN-009 (cascade dispatch exploit) were not confirmed. These require multi-step setups; the red-teamer focused on the four pentest objectives. Flag unconfirmed PEN findings as "Theoretical" and route to TheFixer backlog.

**Scoping decision that paid off:**
Including both OWASP-ASVS and SOC2-Type2 frameworks was the right call — COMP-002 (missing audit events) and COMP-003 (no TLS enforcement) would have been missed with OWASP-only scope. SOC2 controls caught the audit trail gap and the HTTPS gap.

### Remediation routing
- Grade F → operator decision required before any merge.
- Do NOT route to TheFixer until operator acknowledges confirmed breaches.
- P0 remediations (C-001, C-002, C-003) must be fixed before TheFixer can safely address the theoretical findings.

