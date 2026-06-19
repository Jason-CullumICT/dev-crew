# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-06-19

### Critical Package Watch List
1. **protobufjs** (orchestrator) — Multiple RCE and DoS vectors. Upgrade from ≤7.6.2 to ≥7.7.0 immediately. Check for similar packages using protobuf.
2. **vitest** (frontend) — Arbitrary file read/exec via UI server. Upgrade to ≥3.2.6. **Do not expose test UI server to network.**
3. **vite** (frontend) — Three separate path traversal CVEs. Upgrade from 5.4.0 to ≥8.0.16 (major jump). Windows developers especially at risk.

### High-Risk Dependencies
- **@grpc/grpc-js** — DoS on malformed gRPC messages (orchestrator uses this for agent communication)
- **uuid** — Buffer bounds check missing; backend generates work item IDs with this. Upgrade to ≥14.0.0
- **ws** — Memory exhaustion DoS; affects any real-time features
- **form-data** — CRLF injection; check if app POSTs to external services

### Audit Tools & Commands
- npm audit --json: Works reliably for all projects
- npm outdated --json: Good for tracking major version drift
- Lock file analysis: `jq '.packages | keys | length'` for dependency count
- **Missing tool:** license-checker not installed; relied on manual inspection of package.json fields

### Version Inventory (as of 2026-06-19)
| Package | Backend | Frontend | Orchestrator | Latest | Status |
|---------|---------|----------|--------------|--------|--------|
| uuid | 9.0.1 | — | — | 14.0.0 | 5 majors behind, CVE |
| pino | 8.17.0 | — | — | 10.3.1 | 2 majors behind |
| express | ^4.18.2 | — | ^4.21.0 | 5.2.1 | 1 major behind |
| protobufjs | — | — | 7.5.5–7.6.2 | 7.7.0 | CRITICAL |
| vitest | — | 2.0.5 | — | 3.2.6+ | CRITICAL |
| vite | — | 5.4.0 | — | 8.0.16 | HIGH (major jump) |
| react | — | 18.3.1 | — | 19.2.7 | 1 major behind |
| react-router-dom | — | 6.30.4 | — | 7.18.0 | 1 major behind |

### Dependency Tree Health
- **Backend:** 412 transitive (high surface area for supply chain risk)
- **Frontend:** 231 transitive (moderate)
- **Orchestrator:** 156 transitive (compact, but P1 CVEs present)
- **E2E:** 4 direct, 0 vulnerabilities (clean)

### Next Steps
1. Coordinate with **TheGuardians** on critical CVE escalations
2. Create patch branch for immediate fixes (protobufjs, vitest, vite)
3. Plan major version upgrade sprint for uuid, pino, react
4. Consider installing `npm audit --fix --force` vs manual review
5. Add npm audit to CI gate (currently missing)

### Decisions Made
- **No GPL/AGPL detected** → No license escalation needed
- **Vitest is dev-only** → Still P1 because UI server can be exposed; must disable in production
- **react-router 6.30.4 patch was recent** → Already covers open redirect CVE (no action needed)

## Learnings Summary

**Key Insight:** Orchestrator is the riskiest component. It has 2 P1 CVEs and manages gRPC communication with agents. A compromised orchestrator compromises the entire pipeline. Treat orchestrator CVEs as emergency-level.

**Process:** npm audit covers npm projects well. For Go/Python, would need `govulncheck` and `pip-audit` (not present in this repo).

**Audit frequency:** Recommend monthly dependency audits. This codebase accumulates major version drift fast (see uuid: 5 majors behind, express: 1 major, pino: 2 majors).
