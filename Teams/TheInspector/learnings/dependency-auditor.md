# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-23

### Critical Watch List

Packages with recurring CVEs (track for future updates):
- **handlebars** (4.0.0 - 4.7.8): 8 distinct CVEs including code injection, prototype pollution, XSS. Type confusion in AST parsing is systemic issue. Fix: upgrade to 4.7.9+
- **protobufjs** (< 7.5.5): 3 CVEs (code execution, code injection, DoS). Arbitrary code execution is critical. Fix: upgrade to 7.5.5+
- **vitest** (< 3.2.6): 1 critical CVE (arbitrary file read/execute in UI server). Fix: upgrade to 3.2.6+
- **vite** (<= 6.4.2): 3 CVEs (path traversal on Windows, CORS bypass, file disclosure). Affects all build processes.
- **@grpc/grpc-js** (1.14.0 - 1.14.3): 2 CVEs causing server crash/DoS on malformed messages.
- **form-data** (>= 4.0.0 < 4.0.6): CRLF injection in multipart requests.
- **react-router** (6.7.0 - 6.30.3): Open redirect vulnerability.
- **ws** (8.x versions): Memory exhaustion DoS + uninitialized memory disclosure.

### License Compliance

**Status: All Clear**

No GPL/AGPL viral licenses detected across primary dependencies:
- express, react, vite, vitest: MIT/Apache-2.0
- @types/* packages: MIT
- pino: MIT
- uuid: MIT
- dockerode: Apache-2.0
- handlebars: MIT (but has security issues)

### Audit Tool Availability

✅ **npm audit** (v10+) fully functional and reliable in this environment.
- Supports `--json` output for automated parsing
- Consistent GHSA advisory references
- Provides CVSS scores and CWE mappings

⚠️ **Limitations:**
- npm audit may not catch zero-days or non-disclosed vulnerabilities
- Transitive dependency vulnerabilities sometimes report against top-level packages
- Manual verification of affected version ranges is required for precise targeting

### Workspace Topology

Primary workspaces (in scope for Source/):
- Source/Backend (express, pino, uuid, prom-client — 27 CVEs)
- Source/Frontend (react, vite, vitest — 11 CVEs)
- Source/E2E (@playwright/test — 0 CVEs, clean)

Infrastructure (platform/):
- platform/orchestrator (express, dockerode, multer — 9 CVEs including critical protobufjs)

Portal/Debug UI (separate maintenance):
- portal/Backend (complex deps — 54 CVEs)
- portal/Frontend (react/vite — 11 CVEs)

Demo projects (out of scope but scanned):
- abac-demo, abac-reimagined, abac-soc-demo, abac-soc-demo-v2 (education/reference)

### Prior CVE Data

**First audit run.** Baseline established. Future runs should compare against:
- Critical CVE count (baseline: 4 across workspaces)
- High CVE count (baseline: 20+)
- Fix success rate (track resolved CVEs across runs)

### Remediation Strategy Notes

1. **Critical CVEs (immediate):**
   - protobufjs affects orchestrator infrastructure — must fix before next deploy
   - handlebars appears in test/demo paths but also in portal — prioritize backend production builds
   - vitest affects dev/test servers — risk if CI/CD infrastructure exposed

2. **High CVEs (this week):**
   - vite/esbuild affect all builds — widespread but contained to build-time
   - react-router affects client-side navigation — test for open redirect scenarios
   - form-data affects multipart requests — check if orchestrator or backends use multipart

3. **Moderate CVEs (this sprint):**
   - jest/babel chain issues are test-infrastructure only
   - Most moderate CVEs are transitive; updating direct dependencies often resolves them

### Next Steps for Team

- [ ] Implement `npm audit fix --force` in CI/CD pipeline
- [ ] Add pre-commit hook: `npm audit --audit-level=high` (fail if high or critical found)
- [ ] Track resolved CVEs in a spreadsheet (DEP-001, DEP-002, etc.)
- [ ] Schedule monthly full audits
- [ ] Consider automated dependency update tools (renovate, dependabot)
