# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Run 1: 2026-09-01 Full Audit

**Critical packages to watch:**
- **protobufjs** — RCE vulnerability (CVSS 9.8) in versions < 7.5.5. Used transitively via gRPC in platform/orchestrator. This is a critical supply-chain risk for the orchestrator infrastructure.
- **handlebars** — Multiple injection vulnerabilities. Appears as transitive in Source/Backend despite not being direct. Need to trace where it comes from.
- **brace-expansion** — Four separate DoS vulnerabilities. Used in glob expansion; could be in build tooling or file handling.

**Packages with recurring patterns:**
- **form-data (4.0.0-4.0.5)** — CRLF injection across all projects that do multipart uploads
- **@grpc/grpc-js (1.14.0-1.14.3)** — Server crash on malformed messages
- **js-yaml** — Quadratic CPU consumption via merge keys

**License compliance:**
- No GPL/AGPL violations found in direct dependencies
- All primary dependencies use MIT/ISC/Apache-2.0 (permissive)
- Need to verify portal/* projects (not yet fully scanned)

**Environment notes:**
- npm audit --json works correctly in all 6 projects
- npm outdated --json not returning data (may need npm upgrade or different flag)
- npm ls works for specific packages but handlebars shows "(empty)" in Backend despite npm audit flagging it
- Consider: the vulnerabilities may be from build-time transitive deps (jest, ts-jest, webpack-related)

**Next audit priorities:**
1. Fix protobufjs RCE immediately (critical infrastructure risk)
2. Identify why handlebars appears in audit but not in npm ls
3. Update form-data, brace-expansion, nanoid, path-to-regexp in sequence
4. Add automated CVE scanning to CI/CD pipeline (gate on P1 findings)

**Audit tool availability:**
- npm audit ✅ available and functional on all projects
- npm outdated ⚠️ not working with --json flag
- npm ls ✅ works but doesn't show build-time/transitive handlebars
- License checker not yet tried; should be tested next audit

**Total CVEs across all projects:** 99 (6 critical, 26 high, 64 moderate, 3 low)

**Highest risk projects (by CVE count):**
1. portal/Backend (55 CVEs, includes 2 critical)
2. Source/Frontend (13 CVEs, includes 1 critical)
3. portal/Frontend (13 CVEs, includes 1 critical)
