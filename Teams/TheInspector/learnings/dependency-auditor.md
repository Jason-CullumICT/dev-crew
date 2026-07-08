# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-07-08 — Initial Comprehensive Scan

### Key Findings

#### Critical Vulnerability Patterns
1. **Handlebars.js** — 8 CVEs in v4.0.0–4.7.8 (CVSS 8.1–9.8)
   - **Pattern:** Template injection through AST type confusion, partial block tampering, decorator DoS
   - **Recurrence Risk:** HIGH — handlebars is widely used; check for it in npm packages and transitive chains
   - **Decision:** Upgrade all projects to ≥4.7.9; add handlebars to watch list
   - **Watch:** https://github.com/handlebars-lang/handlebars.js/releases

2. **protobufjs** — 11 CVEs in all versions (CVSS 9.8 multiple)
   - **Pattern:** RCE via crafted protobuf messages, prototype pollution, unbounded recursion DoS
   - **Recurrence Risk:** CRITICAL — protobufjs is deep in OpenTelemetry chain, gRPC ecosystem
   - **Decision:** Maintain latest version pinning; auto-update on patch releases
   - **Watch:** OpenTelemetry transitive versions; gRPC server security

3. **vitest** — Arbitrary file read/execute in UI server (CVSS 9.8)
   - **Pattern:** Development tool with hidden network exposure; test runner security
   - **Recurrence Risk:** MEDIUM — vitest is dev-only but can be left running in production containers
   - **Decision:** Disable Vitest UI in production builds; audit dockerfile for lingering dev servers

#### Dependency Bloat
- **portal/Backend:** 10 direct → 578 transitive (57.8× multiplier)
- **Root cause:** OpenTelemetry auto-instrumentations-node brings 400+ transitive deps
- **Recommendation:** Switch to selective manual instrumentation for prod; keep auto for dev
- **Impact:** Larger attack surface; slower builds; harder to audit

#### Positive Controls
- ✅ **NO postinstall scripts** across any project (excellent security posture — maintain this policy)
- ✅ **Package-lock.json** present in all projects (reproducibility enforced)
- ✅ **No hardcoded secrets** found in package.json files
- ✅ **Mixed major versions** of express are compatible (4.18 & 4.21 coexist safely)

#### Audit Tool Availability
- **npm audit** — ✅ Works on all npm 9+ projects; outputs JSON reliably
- **npm outdated** — ✅ Works; identifies major version gaps
- **license-checker** — ⚠️ Not installed in environment; fallback to manual package.json review
- **govulncheck** — Not applicable (no Go projects found)
- **pip-audit** — Not applicable (no Python projects found)

### Watch List (High-Recurrence CVE Packages)

| Package | Min Safe Version | Recurrence Risk | Notes |
|---------|------------------|-----------------|-------|
| handlebars | 4.7.9+ | HIGH | Template injection; check transitive imports |
| protobufjs | 7.7.0+ | CRITICAL | gRPC ecosystem; prototype pollution |
| vitest | 3.2.6+ | MEDIUM | Dev tool only; disable UI in prod |
| form-data | 4.0.6+ | MEDIUM | CRLF injection in multipart handling |
| vite | 6.5.0+ (v5: 5.5.0+) | MEDIUM | Path traversal in dev server & .map handling |
| @grpc/grpc-js | 1.14.4+ | MEDIUM | DoS via malformed compressed messages |
| @opentelemetry/sdk-node | 0.50.0+ | HIGH | Cascading vulnerabilities through gRPC chain |

### License Compliance Status
- **Audit Result:** ✅ All detected licenses are permissive (MIT, Apache-2.0, ISC, BSD)
- **No GPL/AGPL detected** — safe for commercial use
- **Recommendation:** Implement license-checker in CI/CD for ongoing compliance

### Audit Tool Setup & Environment
- **Tested:** npm audit, npm outdated, package-lock analysis, direct package.json inspection
- **npm version:** ✅ 10+ (modern JSON output)
- **lock file format:** ✅ lockfileVersion 3 (v1 in Source/Backend, v3 in portal/Backend)
- **CI Integration:** Add `npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'` to build gates

### Next Actions

1. **Immediate (24h):**
   - Patch handlebars → 4.7.9
   - Patch protobufjs → 7.7.0
   - Patch vitest → 3.2.6 (all projects)

2. **Short-term (1 week):**
   - Implement `npm audit` in CI/CD pipeline (fail on critical/high for prod branches)
   - Set up Dependabot or similar for automated patch PRs
   - Review portal/Backend's transitive dependency bloat

3. **Long-term (monthly):**
   - Add weekly scheduled npm audits to CI/CD
   - Review license compliance quarterly
   - Assess major version upgrade paths annually

### Related Documentation
- Main audit report: `Teams/TheInspector/findings/dependency-audit.md`
- Escalations to TheGuardians: Handlebars (DEP-001), protobufjs (DEP-002), vitest (DEP-003)
- Cross-ref with red-teamer: Injection attacks via handlebars & protobufjs are primary RCE vectors
