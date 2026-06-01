# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-06-01 · Grade: F

### Critical Discovery: Pen-Tester / Live-Environment Scope Mismatch
- Pen-tester analysed `Source/Backend/` (work-items state machine, port 3001 via a hypothetical docker run)
- Live test environment (`docker-compose.test.yml`) runs `portal/Backend/` (feature-requests, bugs, cycles, pipeline-runs)
- All 13 PEN-IDs referenced routes that return HTTP 404 in the live environment
- Red-teamer correctly pivoted and found equivalent or more severe vulnerabilities in portal
- **Action for next run:** Instruct pen-tester to analyse `portal/Backend/` OR confirm the docker-compose target. Add a scoping probe step: `curl http://localhost:3001/api/work-items` vs `/api/feature-requests` to determine which app is live before deep analysis.

### Grading Calibration
- Grade F is automatic the moment red-team achieves any one of the four critical objectives — the compliance pass rate (14%) and critical count (4) would fail every grade band independently.
- The two SOC2 PASS controls (CC8.1 via changeHistory[], V7.4 via errorHandler.ts) are architectural strengths present in both Source/Backend and portal/Backend. These are reliable passes on future runs.

### Finding Deduplication Patterns
- PEN-001 + RED-001 + COMP-001 always merge into a single "no auth" critical finding
- PEN-006 + RED-004 always merge into "unbounded pagination" — check both Source/Backend and portal/Backend
- PEN-011 + RED-007 + COMP-008 always merge into "Prometheus unauthenticated"
- Stored XSS (RED-006) had no PEN-ID analog — static analyzer and pen-tester should explicitly probe user-controlled string fields for XSS vectors next run

### Red-Teamer Reliability Patterns
- Metrics endpoint (`/metrics`) reliably exposes undocumented routes via `route=` Prometheus labels — always mine this before probing
- `force-*` variants of restricted endpoints should be a standard probe pattern (found `force-approve` via metrics recon)
- Portal/Backend uses SQLite (not in-memory) — no SQL injection found because search uses `.includes()`, but future DB schema changes could introduce SQLi risk

### SAST Note
- Static-analyzer learnings contain findings but no formal SAST-ID report file was produced
- Request static-analyzer to write a formal `findings/static-analysis-{date}.md` file on next run so SAST-IDs are properly traceable
