# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-07-11 (audit/inspector-2026-07-11-5ae32d)

### Project Layout Notes
- `Source/` = main product (Backend, Frontend, E2E) — small dependency footprint
- `portal/` = debug UI (Backend, Frontend) — significantly higher CVE count (54 in portal/Backend); may be scaffolding code that needs cleanup
- `platform/orchestrator/` = orchestrator infrastructure — separate npm workspace
- `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`, never `portal/` — this is the biggest systemic gap for spec verification

### Scoping Notes
- Services at localhost:3001 and localhost:5173 were offline in this run → performance-profiler and chaos-monkey must be skipped
- Check service health early in scoping phase to set expectations with user before dispatching specialists
- Static analysis still yields high-value findings even without live services

### Grading Calibration
- 4 P1 CVEs from dependency-auditor drove the overall grade to D (threshold: >2 P1s = D per config)
- quality-oracle came in at B (0 P1, 4 P2, 97% coverage)
- Always take the worst specialist grade as the floor for overall grade
- CVEs from transitive build-chain deps (handlebars via jest) still count as P1 — they are unpatched vulnerabilities regardless of whether the runtime path is reachable today

### Escalation Trigger Logic
- "injection" trigger fired for: DEP-001 (JS injection/RCE) and DEP-002 (CRLF injection)
- DEP-010 (open redirect) was escalated under "missing access control" — navigation without input validation
- When REPO and PR_NUM are empty (local branch with no open PR), use the printf fallback path — do not attempt `gh pr comment`

### Cross-Reference Patterns Found
- uuid@9.0.0: DEP-004 (CVE) + DEP-015 (outdated) → single `npm install uuid@9.0.1` fixes both
- react-router-dom@6.26.0: DEP-010 (CVE) + DEP-017 (outdated) → single `npm install react-router-dom@6.30.4` fixes both
- vite upgrade: DEP-003 (ws ReDoS) + DEP-009 (esbuild) + DEP-011 (vite) → single `npm install vite@latest` fixes three
- dependency-linking plan incomplete: QO-003 + QO-004 + QO-006 share the same root (plan not fully implemented)

### Report Generation
- HTML report pattern: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog pattern: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Both files should be saved before updating dashboard
- `inspector-report.md` in repo root serves as a human-readable summary for the PR/commit context

### Known Open Items (carried into next audit)
- QO-003: `blocked_by` field missing from API update types in portal/Shared/api.ts
- QO-004: seed.ts absent from portal/Backend/src/database/
- QO-006: DependencySection.test.tsx and BlockedBadge.test.tsx missing

### Next Audit Targets
- Ensure services are running before dispatching performance-profiler and chaos-monkey
- Target: all P1 CVEs patched → grade improves to C or better
- Verify handlebars fix didn't break Jest test runs
- Re-baseline after `npm audit fix --force` and re-run dependency-auditor
