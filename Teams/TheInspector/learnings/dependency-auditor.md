# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings (2026-05-29)

### Critical Vulnerabilities Watch List

1. **handlebars** (4.7.8) — CRITICAL RCE risk (9.8 CVSS)
   - Multiple AST type confusion CVEs allow arbitrary code execution
   - Affects: Source/Backend
   - Status: Requires immediate upgrade to 4.7.9+
   - Note: If backend ever processes user-supplied templates, this is an RCE vector

2. **protobufjs** (<=7.5.7) — CRITICAL RCE risk (9.8 CVSS)
   - Arbitrary code execution via prototype pollution gadget
   - Affects: platform/orchestrator, portal/Backend
   - Status: Requires immediate upgrade to 7.5.8+
   - Note: Used for gRPC/protobuf serialization; untrusted message input is the attack surface

3. **@opentelemetry/auto-instrumentations-node** (<=0.74.0) — HIGH DoS
   - Prometheus exporter crashes on malformed HTTP requests
   - Affects: portal/Backend
   - Status: Requires immediate upgrade to 0.75.0+
   - Note: Causes observability blind spot in production

### Recurring Moderate CVEs Across Projects

- **vite** path traversal (dev-mode) — affects all frontend projects
- **uuid** buffer overflow — affects all projects
- **qs** DoS — transitive via express in all backend projects
- **postcss** XSS — affects all frontend projects
- **esbuild/ws** dev-mode issues — lower risk

### Outdated Major Versions

| Package | Current | Target | Priority | Notes |
|---------|---------|--------|----------|-------|
| express | 4.22.2 | 5.2.1 | High | Affects Source/Backend, platform/orchestrator |
| uuid | 9.0.1 | 14.0.0 | Medium | Security fix in 11.1.1; major version bump |
| pino | 8.21.0 | 10.3.1 | Low | Logging framework; 2 major versions behind |
| react | 18.3.1 | 19.2.6 | Medium | 1 major version; likely minor breaking changes |
| vite | <=6.4.1 or <=8.0.4 | 8.1.0+ | High | Path traversal fixes required |

### Project Health Assessment

| Project | Status | Issues | Complexity |
|---------|--------|--------|-----------|
| Source/Backend | CRITICAL | 1 CRITICAL (handlebars), 5 MODERATE | 411 deps |
| Source/Frontend | MODERATE | 7 MODERATE (vite, esbuild, ws, postcss, vitest) | 230 deps |
| Source/E2E | HEALTHY | 0 vulnerabilities | 4 deps (minimal) |
| platform/orchestrator | CRITICAL | 1 CRITICAL (protobufjs), 1 HIGH (path-to-regexp), 4 MODERATE | 155 deps |
| portal/Backend | CRITICAL | 1 CRITICAL (protobufjs), 1 HIGH (OpenTelemetry), 8 MODERATE | 576 deps |
| portal/Frontend | MODERATE | 1 HIGH (picomatch), 5 MODERATE (vite, esbuild, ws, postcss, vitest) | 424 deps |
| abac-demo | MODERATE | 1 HIGH (vite), 3 MODERATE | 238 deps |

### Audit Tools & Commands

**Works reliably:**
- `npm audit --json` — Available in all projects, JSON output for scripting
- `npm outdated --json` — Shows packages >1 major version behind

**Not available:**
- `npm-check-updates` or `npx ncu` — Not installed
- License-checker — Would need `npm install -g license-checker` but not critical (can read package.json files)
- `npm ls` — Works but slow on large trees

### Recommendations for Future Audits

1. **Automate with GitHub Actions** — Schedule npm audit on each project after package changes
2. **Set minimum standards:**
   - 0 CRITICAL vulnerabilities in production dependencies
   - 0 HIGH vulnerabilities in core backend/orchestrator
   - Moderate vulnerabilities must have fix available or documented workaround
3. **Lock transitive dependency versions** — Currently relying on npm audit for CVE detection; package-lock.json is already locked
4. **Monitor deprecated packages** — `npm outdated` doesn't flag deprecated; check registry manually for critical packages like uuid, express, react
5. **Test upgrades in CI** — After applying npm audit fixes, run full test suite to catch breaking changes

### Known False Positives

- None detected so far; npm audit is generally reliable

### Known Mitigations

- **Source/E2E** intentionally minimal to reduce surface area — good practice
- All projects use package-lock.json (no random installs)
- No post-install scripts detected (good security posture)
