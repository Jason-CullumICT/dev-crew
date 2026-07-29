# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-29 — First Audit Run

**Grade determination:**
- Config thresholds are strict: C = max 2 P1. A single dependency audit with 5 CVE-grade P1s will push grade to D regardless of code quality score.
- When specialists award different grades (quality-oracle: B, dependency-auditor: D), the combined grade is the worst of all specialists.
- Consider whether CVEs in non-production/tooling packages (vitest, observability) should be weighted differently from app-code vulnerabilities. Current config gives them equal P1 weight.

**Specialist dispatch:**
- performance-profiler and chaos-monkey require both services UP. Check health endpoints before scoping — save time by flagging skipped specialists immediately.
- If services are DOWN, document clearly in §4 (Scope) and §12 (Latency) so the reader knows data is missing, not that the system is healthy.
- Dynamic specialists (chaos-monkey) require ALL services healthy — not just backend. Frontend DOWN = chaos-monkey skipped.

**Cross-referencing findings:**
- The most valuable synthesis is grouping findings by root cause rather than by specialist. Three P1s from dependency-auditor traced to one package version (`@opentelemetry/auto-instrumentations-node`). This cross-ref (§8) is the actionable output operators actually need.
- Look for transitive dependency clusters — one update command can close multiple findings.

**Grading config gap:**
- The config has no explicit C→D boundary. With `C: { max_p1: 2 }` and `D: { max_p1: 999 }`, anything with >2 P1s is D. The jump from C to D is steep — consider whether a 5-step scale (A/B/C/D/F) is the right granularity for CVE-heavy audits.

**Report generation:**
- All 16 sections must be present even when data is missing. Sections 12 (Latency) and 14 (Fixed) had no data on this run — they still appeared with clear "not available / first audit" messages.
- The escalation bash block should always run when any security-trigger finding is present, even if no PR or repo is detected (use the printf fallback).

**Traceability enforcer blindspot (QO-002):**
- The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. This is a structural issue the team leader should call out proactively — not wait for quality-oracle to catch it. Check enforcer scope early in the scoping phase.

**Supply chain signal:**
- Portal/Backend has 577 transitive deps (via `@opentelemetry/auto-instrumentations-node`). This is above the 500-threshold flag. OpenTelemetry auto-instrumentation is a common supply chain risk vector — always check its version first in future dependency audits.

**Finding ID convention:**
- Use `QO-NNN` for quality-oracle findings (matches the specialist's own numbering).
- Use `DA-CRITICAL-NNN` and `DA-P2-NNN` for dependency-auditor findings (consistent with the DEPENDENCY_AUDIT_*.md report format).
- This makes cross-referencing between the HTML report, JSON backlog, and specialist reports unambiguous.

**Services were DOWN — no dynamic coverage:**
- Recommend: always try to schedule audits when services are running. Static analysis alone cannot confirm: (a) actual latency vs. budgets, (b) chaos resilience, (c) real-world exploit confirmability.
- Suggest adding a pre-audit service-check step to the audit workflow that warns if services are DOWN before dispatching specialists.
