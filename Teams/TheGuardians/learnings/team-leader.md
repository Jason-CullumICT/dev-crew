# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-04-15 — Grade D

### Synthesis Decisions

**Severity reclassification (PEN-ID Criticals → High):**
The pen-tester classified PEN-001/002/003 as Critical using its own scale. The synthesized scale defines Critical as RED-ID confirmed only. Since Phase 2 produced no RED-ID findings, these were reclassified to High. This is the correct behavior — Critical without confirmation inflates the grade toward F incorrectly.

**Deduplication that worked well:**
- SAST-001 + PEN-001 + COMP-001 → MERGED-001 (auth gap confirmed by all three agents — high confidence)
- SAST-003 + PEN-004 + COMP-010 → MERGED-002 (webhook HMAC gap confirmed by all three)
- SAST-004 + PEN-006 + COMP-007 → MERGED-003 (pagination confirmed by all three)
- SAST-005 + COMP-003 → MERGED-004 (helmet/headers — 2 of 3 found)
- SAST-006 + COMP-005 → MERGED-005 (rate limiting — 2 of 3 found)

When 2+ agents independently find the same issue, confidence is very high — merge aggressively.

**Grade boundary note:**
With 9 High and compliance at 8.3%, the application sits solidly in Grade D. If the red-teamer is re-run and confirms PEN-002 (fast-track override) or PEN-003 (manual approve), the grade immediately becomes F. This should be called out in the report prominently — the F risk is one successful live exploit away.

### Phase 2 Failure: Agent Sequencing

**Root cause:** The red-teamer ran before the pen-tester wrote the attack surface map. This is a dispatch ordering issue — both are currently dispatched in "parallel" Phase 1, but the red-teamer's pre-flight gate depends on the pen-tester's output. 

**Fix for next run:** The attack surface map gate check (Phase 2) requires pen-tester to be in Phase 1 and red-teamer strictly in Phase 2 (sequential after). The current spec says this correctly, but the actual dispatch must enforce it. Do not dispatch the red-teamer concurrently with the pen-tester.

### App Mismatch: Config vs. Live Environment

`security.config.yml` was written for a workflow engine app (`/api/work-items`, etc.). The live Docker container runs the dev-crew feature portal (different routes). Before the next full run:
- Update `security.config.yml` `critical_entry_points` to: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/pipeline-runs`
- Update `pentest.objectives` to match the actual live application domain
- Investigate `/api/orchestrator/*` reverse proxy as SSRF pivot before red-team

### Compliance Pass Rate vs. Grading

The compliance auditor computed 10.5% for OWASP-ASVS L2 and 0% for SOC2 full pass. For grading purposes, use the **full pass rate only** (not partial). The combined overall full pass rate was 8.3% (2 out of 24 controls fully passing). This correctly places the application far below Grade C's 60% minimum.

### False Alarm Watch List (next run)

- COMP-009 (no GDPR hard-delete) was classified High in this run because it represents a compliance obligation. If the project explicitly states it is an internal-only tool with no GDPR applicability, this should be downgraded to Medium/Low. Check scope before next run.
- PEN-013 (missing /complete /fail endpoints) is a state machine gap, not a security finding per se. It belongs in the product backlog more than the security backlog. Consider routing directly to TheFixer without security classification.

### What Worked Well

- Three-agent agreement on the auth gap (MERGED-001) gives very high confidence — no false alarm risk.
- The pen-tester produced a comprehensive attack surface map with clear exploit paths and red-team handoff notes. The fast-track override (PEN-002) was the standout finding — trivially achievable in a single API call.
- Static analyzer correctly identified no hardcoded secrets and no injection surfaces — clean findings save red-team time.
