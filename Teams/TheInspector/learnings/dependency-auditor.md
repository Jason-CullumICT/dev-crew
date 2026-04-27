# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings from 2026-04-27 Audit

### Critical CVEs Identified

1. **handlebars** — Multiple RCE vectors via template injection
   - Affects: Backend (transitive via jest/supertest)
   - Status: Must be removed or upgraded to ≥4.7.9
   - Action: Grep codebase for actual usage before making decision
   
2. **protobufjs** — Arbitrary code execution via untrusted protobuf messages
   - Affects: Orchestrator (transitive via dockerode)
   - Status: Requires immediate upgrade to ≥7.5.5
   - Risk: If orchestrator processes untrusted .proto files or messages
   
3. **path-to-regexp** — Regular Expression Denial of Service
   - Affects: Backend, Orchestrator (transitive via express)
   - Status: Fixed by upgrading express to v5+
   - Note: Express v5 has breaking changes — coordinate with team

### Watch List (Recurring CVEs)

- **uuid** — Multiple recent CVEs (v9-v13); keep updated to latest (v14+)
- **vite** — Dev-server CORS/CSRF and path traversal issues; requires timely upgrades
- **handlebars** — If not used, remove entirely to reduce attack surface

### Audit Tools & Setup

- **npm audit** works reliably across all projects
- `npm audit --json` output includes transitive vulnerabilities with full CVSS scores
- **npm outdated** works but exits with code 1 when outdated packages exist (expected behavior)
- No Python, Go, or Rust projects detected in this codebase
- No post-install scripts or suspicious package patterns detected

### Upgrading Major Versions (Notes for Next Audit)

1. **Express v4 → v5:** Breaking changes in request/response API
2. **React v18 → v19:** useEffect cleanup, async components
3. **React Router v6 → v7:** Route definition changes, data fetching patterns
4. **Pino v8 → v10:** Performance improvements; API largely backward-compatible
5. **Vite v5 → v6+:** Generally smooth upgrades; watch for dev-server behavior

### Duplicate Dependency Management

- **uuid appears in multiple versions**: Direct in Backend (^9.0.0) and transitive via dockerode (<14.0.0)
  - Consider: Explicitly declare uuid@^14 in Backend and Orchestrator to deduplicate
  - Run: `npm dedupe` after updates to minimize node_modules size

### License Compliance

- All projects are either `UNLICENSED` or `ISC` (internal projects)
- No GPL/AGPL dependencies detected
- No license compliance risk identified

### Next Audit Recommendation

- **Due:** 2026-05-27 (30 days)
- **Focus:** Verify that P1 fixes (handlebars, protobufjs, express) have been applied
- **Secondary:** Track progress on major version upgrades (React v19, Router v7)
