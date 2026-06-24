# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-06-24

### Critical Findings

1. **Vitest RCE (GHSA-5xrq-8626-4rwp)** — Source/Frontend@2.0.5
   - When Vitest UI server listening, arbitrary file can be read and executed
   - Fix: Update to ≥3.2.6
   - **Action: IMMEDIATE** — affects CI/dev infrastructure

2. **UUID Buffer Overflow (GHSA-w5hq-g745-h8pq)** — Source/Backend@9.0.0
   - Missing bounds check in v3/v5/v6 when buffer provided
   - Fix: Update to ≥11.1.1
   - **Action: IMMEDIATE** — memory safety critical

3. **Portal Backend Vitest Issues** — portal/Backend@<1.5.0
   - Multiple Vite/Vitest path traversal and auth bypass CVEs
   - Fix: npm audit fix
   - **Action: IMMEDIATE** — pipeline infrastructure

### High-Severity Findings

- **Vite path traversal** (GHSA-fx2h-pf6j-xcff) — Windows fs.deny bypass
- **form-data CRLF injection** (GHSA-hmw2-7cc7-3qxx) — multipart field escape
- **ws memory DoS** (GHSA-96hv-2xvq-fx4p) — WebSocket fragment attacks
- **react-router open redirect** (GHSA-2j2x-hqr9-3h42) — protocol-relative URL

### Outdated Dependencies

Express is 2 majors behind (v4.18.2 → v5.2.1), pino is 2 majors behind (v8.17.0 → v10.3.1), React/React-DOM are 1 major behind (18.3.1 → 19.2.7).

### Environment Notes

- **npm audit tool:** Available and working in all four main package directories
- **npm outdated tool:** Works as expected
- **license-checker:** Tool available but minimal value added (npm shows licenses in package.json)
- **Post-install scripts:** None detected — low supply chain risk
- **Total CVEs found:** 101 across all manifests (3 critical, 8 high, 46 moderate, 44 low)

### Recommendations for Next Run

1. After critical CVEs are fixed, run `npm audit` in each directory to confirm remediation
2. Plan major version upgrades for express, pino, React ecosystem in upcoming sprints
3. Consider pinning ts-jest to stable 27.x series (29.x cascade inherits Jest vulns)
4. Watch for Vite v7 release (currently on v5.4.0) — may have breaking changes
5. Create recurring dependency audit task (quarterly minimum) to catch new CVEs early

### Escalation Status

- **3 critical findings escalated to TheGuardians** (RCE, memory safety, auth bypass)
- Red-teamer should review open redirect and vite fs.deny for application-specific exploitability
