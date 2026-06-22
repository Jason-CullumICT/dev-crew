# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 2026-06-22

### Critical Findings (P1)
1. **Vitest UI Server (GHSA-5xrq-8626-4rwp)** — Arbitrary file read/exec when --ui flag used
   - Affects: Source/Frontend (v2.0.5)
   - Root cause: UI server listens on localhost:51204 without auth
   - Fix path: Upgrade to v4.1.9 or pin >= v3.2.6 and remove --ui from CI/dev scripts
   - **Action taken:** Documented in report; flagged for security review

2. **Handlebars Template Injection (GHSA-2w6w-674q-4c4q, others)** — Multiple critical RCE vectors
   - Affects: Source/Backend via jest → babel-plugin-istanbul → handlebars
   - Root cause: Template compilation with untrusted input
   - Fix path: Pin handlebars >= 4.7.9 OR upgrade jest >= 30.0.0 (major)
   - **Recommendation:** Pin handlebars first, don't force jest major yet
   - **Action taken:** Documented in report

3. **Protobufjs Arbitrary Code Execution (GHSA-xq3m-2v4x-88gg)** — RCE in message parsing
   - Affects: platform/orchestrator (prod) via dockerode → @grpc/grpc-js → protobufjs
   - Root cause: Unsafe parsing of message descriptors
   - Fix path: Upgrade dockerode or force-pin protobufjs >= 7.7.0
   - **Action taken:** Documented in report; flagged as infrastructure risk

### Watch List (Recurring Vulnerabilities)
- **Protobufjs:** 9+ CVEs across <= 7.6.2; recommend >= 7.7.0+ going forward and quarterly checks
- **Vitest/Vite:** UI security implications; never run --ui in shared/container environments
- **Handlebars:** Known template injection vector; update node-based template tools immediately when advisories appear

### Audit Tools Available
- ✅ `npm audit --json` — all packages
- ✅ `npm outdated --json` — version gaps
- ❌ `license-checker` — not installed; manual review of package.json license fields used
- ❌ `govulncheck` — no Go modules in project

### License Decisions
- No GPL/AGPL detected in production dependencies
- All direct deps use MIT, Apache 2.0, or ISC (permissive)
- No legal review needed at this time

### Dependency Health Metrics
- Frontend: 281 deps (Vite + React = expected), should track quarterly
- Backend: 412 deps (Jest + Node tooling = expected), jest major bumps are disruptive
- Orchestrator: 153 deps (minimal, prod-critical), any version bump requires testing

### Next Steps
1. Coordinate with TheGuardians on Vitest UI / Protobufjs exploitability assessment
2. Plan handlebars pin rollout (low-risk)
3. Plan protobufjs upgrade (medium-risk, requires orchestrator testing)
4. Quarterly dependency audits recommended for Frontend toolchain
