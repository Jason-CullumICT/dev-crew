# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: run-20260615-094519 (2026-06-15)

### Result
- **Grade: F** — all 4 objectives confirmed as live breaches
- Compliance pass rate: 9% (1/17 controls)
- Critical confirmed: 2 | High: 11 | Medium: 9 | Low: 4

### Environment Discrepancy — Important Pattern
The pen-tester analysed `Source/Backend/` (the workflow engine with `/api/work-items` routes), but the
test container in `docker-compose.test.yml` runs `portal/Backend/` — a completely different application
with different API routes (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.).

**Impact on red-team:** PEN-IDs were not directly testable. The red-teamer correctly pivoted to test the
actual running environment for the same OWASP objectives, confirming equivalent vulnerabilities.

**Lesson:** Before dispatching the pen-tester, verify which backend the test docker-compose actually runs.
Check `docker-compose.test.yml` for the service image/build path. The pen-tester brief should explicitly
name the correct backend directory, not assume `Source/Backend/`.

**Future mitigation:** Add a scoping note to the pen-tester prompt: "Confirm which backend the test
environment runs before analysing source — check `docker-compose.test.yml`."

### Synthesis Calibration Notes

- **Deduplication was significant:** PEN-001 + RED-001 + SAST-001 + COMP-001 all trace to a single root
  cause (absent auth). Merging these into CRIT-1 reduces noise considerably.
- **PEN-009 was elevated from Medium to High** after RED-005 confirmed live exploitation and additional
  internal URL leakage — severity should reflect confirmed impact, not theoretical.
- **COMP-002 (No RBAC)** is confirmed by implication via RED-001 — any "theoretical" compliance finding
  in the absence-of-auth cluster is effectively confirmed once RED-001 is confirmed.
- **PEN-008 (malformed overrideRoute)** was not explicitly tested by the red-teamer against the portal
  backend (different route structure). Mark as Theoretical but note it's a Source/Backend-specific risk.

### What Passed
- SQL injection: parameterised queries correctly prevent injection (SQLite)
- Invalid status strings via PATCH: validated and rejected
- Illegal state transitions via PATCH: enforced correctly
- UUID v4 for IDs: sole passing compliance control

### Grading Lessons
- Grade F is automatic on any confirmed red-team breach — no counting needed once objectives are achieved
- Compliance pass rate at 9% would fail even the C grade threshold (≥ 60%) — the app is not close to
  any passing grade even if we ignored the red-team result
- The single highest-leverage remediation is authentication middleware — brief TheFixer accordingly

### False Alarm Patterns to Watch
- CORS (PEN-010 / SAST-004): The portal/Backend actually had CORS configured; Source/Backend did not.
  Future runs should check both backends separately for CORS configuration rather than assuming shared config.
- The red-teamer's CORS finding (RED-006) was correctly rated Medium (not Critical) because CORS is a
  browser defense layer and direct API calls bypass it regardless — authentication is the real fix.
