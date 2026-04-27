# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run 2026-04-27 (run-20260427-062406) — Grade F

### What the run found
Complete absence of authentication across all API endpoints — the single architectural gap that cascades into nearly every finding. Red-teamer confirmed 3 critical breaches: zero-auth exploit, state machine bypass via force-approve, and an orchestrator SSRF proxy not in the pen-tester's attack surface map.

### Surprises and calibration notes

**Target mismatch (important pattern to watch):** The pen-tester analyzed `Source/Backend/` (in-memory store, `/api/work-items/*`), but the red-teamer ran against `portal/Backend/` (SQLite, `/api/feature-requests/*`). This is structurally the same vulnerability class, but the red-teamer had to adapt findings to the actual live target. Future runs: ensure pen-tester and red-teamer are explicitly pointed at the same backend. When they differ, flag it in the synthesis rather than discarding either report.

**New finding from red-team not in pen-tester map:** RED-008 (orchestrator SSRF proxy) was a net-new Critical finding discovered live. This is a pattern to watch — the red-teamer may surface things the static/pen-tester missed by observing actual runtime behavior. Always check red-team report for findings marked "not in pen-tester map."

**Deduplication approach that worked:** The four-specialist model produced significant overlap (SAST-001 + PEN-001 + COMP-001 + RED-001 all mapping to zero-auth). Merging them into a single C-001 with source_ids list worked well. In future: deduplicate aggressively by root cause, not by symptom — many High findings (H-003, H-002) are really manifestations of C-001.

**Compliance pass rate calibration:** 15% is driven almost entirely by the auth gap. Once auth is implemented, expect pass rate to jump to ~50-60% with minimal additional effort (the logging infrastructure is already solid). Grade C is achievable in one sprint if auth is the only focus.

**Force-approve endpoint is the highest-urgency fix after auth:** The state machine bypass (C-002) is not just about auth — the `force-approve` endpoint itself is a design flaw. It should not exist without a completed-assessment prerequisite check enforced server-side. Even with auth, it needs a gate.

**Mitigations that are already solid:** SQL injection (parameterized queries), input length enforcement (portal/Backend), state transition validation (transition validator blocks illegal jumps), bug close prerequisite. These don't need remediation effort.

### Scoping decisions that paid off
- Dispatching all three Phase 1 specialists (static, compliance, pen-tester) together generated highly overlapping findings that gave synthesis strong cross-validation signal.
- Reading the red-teamer's report for "CONFIRMED" vs "OBJECTIVE ACHIEVED" vs "PARTIAL" labels was the right way to identify which PEN-IDs got live confirmation.

### Things to avoid next run
- Do not rely on the pen-tester's attack surface map to be exhaustive — the red-teamer may find things not in the map (RED-008 precedent).
- When the attack surface map describes `Source/Backend/` but the red-teamer tested `portal/Backend/`, mark this as a mismatch in the synthesis rather than treating it as conflicting data.
