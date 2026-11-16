# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

---

## Run: 2026-11-16 · run-20261116-110402 · Grade F

### Synthesis Notes

**Environment mismatch — always note in synthesis:**
The pen-tester statically analyzed `Source/Backend` (workflow engine). The ephemeral test environment runs `portal/Backend` (dev-crew portal). Both share identical vulnerability classes. When environments diverge, the red-teamer notes it and continues — both backends confirmed the same critical findings. Future scoping: add `portal/Backend/src/` to static_analysis.source_dirs so both are covered in Phase 1.

**Root cause concentration:**
100% of Critical/High findings trace back to a single architectural gap: no authentication middleware. When a root cause this central is confirmed, all chains that depend on it collapse to one fix. Mark MERGED-001 as the P1 blocker explicitly in the roadmap.

**Grading calibration:**
Grade F triggered automatically (confirmed breach of critical objectives). The compliance auditor independently graded D before red-team results, which is correct. The F override is clean and needs no calibration. Future: if only theoretical findings exist and compliance rate is ~29%, grade D is correct per rubric.

**Deduplication pattern that worked:**
SAST-001 + COMP-001 + COMP-002 + PEN-001 all describe "no auth" at different abstraction levels. Merging into a single MERGED-001 with all source IDs is cleaner than listing separately. Same for PEN-003/PEN-004/RED-002/RED-003 → MERGED-002.

**What the red-teamer reliably confirmed:**
- Authentication absence (prerequisite) — always confirmed when no auth middleware exists
- State machine bypass — confirmed when status is PATCH-updateable or override endpoints exist without auth
- Full enumeration — confirmed when no pagination exists at all (portal) or no max-limit enforced (Source)
- /metrics intelligence leak — confirmed whenever endpoint exists without access control

**What the red-teamer did not fully confirm:**
- Soft-delete / blocker DoS objective: portal uses hard-delete, not soft-delete — this objective needs re-scoping for the portal. Source/Backend soft-delete path was not live-tested. Scope this more carefully next run.

**Positive signals to preserve:**
- No hardcoded secrets found (clean)
- No dangerous API patterns (clean)
- Structured logging implemented correctly (this is infrastructure; protect it)

**Next run scope adjustments:**
1. Add `portal/Backend/src/` to `static_analysis.source_dirs`
2. Update `pentest.targets` to include the portal backend URL explicitly
3. Add "soft-delete vs hard-delete" to scoping notes — confirm which backend is under test before the red-teamer attempts the soft-delete objective
