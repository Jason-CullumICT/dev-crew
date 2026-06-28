# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run History

- **2026-06-28** — Initial audit: 81 CVEs detected (3 critical, 6 high). OpenTelemetry ecosystem upgrade required.

## Key Findings

### Critical Vulnerabilities (Must Fix Immediately)

1. **protobufjs** — Arbitrary code execution (GHSA-3m87-5598-2v4f)
   - Location: portal/Backend (via @opentelemetry/auto-instrumentations-node)
   - Fix: Upgrade auto-instrumentations-node → 0.77.0+
   - Status: NOT YET FIXED

2. **Vitest UI** — Arbitrary file read (GHSA-7gl6-jjg9-7vf9)
   - Location: All test runners (Source/Frontend, portal/Frontend, portal/Backend)
   - Fix: Upgrade vitest → 2.3.0+ (frontend), 1.7.0+ (backend test)
   - Impact: Dev environment leak of .env secrets
   - Status: NOT YET FIXED

3. **Handlebars.js** — JavaScript injection (GHSA-2cf5-4w76-r9qm)
   - Location: Source/Backend (transitive via ts-jest)
   - Fix: Upgrade ts-jest → 27.0.3+
   - Status: NOT YET FIXED

### High-Severity Vulnerabilities (Fix This Sprint)

- **OpenTelemetry Core** — Unbounded memory allocation (baggage headers)
  - Fix: Upgrade @opentelemetry/sdk-node → 0.219.0+
- **form-data** — CRLF injection (GHSA-hmw2-7cc7-3qxx)
  - Fix: form-data ≥ 4.0.6
- **React Router** — Open redirect (GHSA-2j2x-hqr9-3h42)
  - Fix: react-router-dom ≥ 6.30.4
- **Vite** — Path traversal (fs.deny bypass)
  - Fix: vite ≥ 6.5.0 (frontend), ≥ 5.3.0 (portal)
- **path-to-regexp** — ReDoS via route parameters
  - Fix: Upgrade (transitive; check via npm audit)
- **@grpc/grpc-js** — Server crash on malformed requests
  - Fix: Transitive; ensure ≥ 1.14.4

### Moderate Vulnerabilities

- **PostCSS** — XSS via </style> (portal/Frontend @ 8.4.38)
  - Fix: postcss ≥ 8.5.10
- **Picomatch** — ReDoS + glob bypass (transitive via vite)
  - Fix: Transitive; ensure picomatch ≥ 2.3.2
- **@babel/core** — File read via sourceMappingURL
  - Fix: @babel/core ≥ 7.30.0

## Outdated Major Versions

| Package | Current | Latest | Versions Behind | Risk |
|---------|---------|--------|-----------------|------|
| uuid | 9.0.0 | 14.0.1 | 5 | Low |
| react | 18.2–18.3 | 19.2.7 | 1 | Low |
| react-dom | 18.2–18.3 | 19.2.7 | 1 | Low |
| @opentelemetry/* | 0.40–0.47 | 0.219+ | 6+ | **CRITICAL** |
| multer | 1.4.5-lts | 2.2.0 | 1 | Low (API changes req'd) |
| pino | 8.17.0 | 10.3.1 | 2 | Low |

## Workspace Vulnerabilities Summary

| Workspace | CVEs | Critical | High | Deps (Prod/Dev) | Status |
|-----------|------|----------|------|-----------------|--------|
| portal/Backend | 8 | 2 | 6 | 397/181 | 🔴 URGENT |
| Source/Backend | 2 | 1 | 1 | 102/310 | 🟡 HIGH |
| Source/Frontend | 4 | 1 | 3 | 3/297 | 🟡 HIGH |
| portal/Frontend | 5 | 1 | 4 | 3/297 | 🟡 HIGH |

## License Compliance

- **Status:** NOT YET AUDITED
- **Action:** Run `npx license-checker --json` in each workspace before next release
- **Watch:** GPL/AGPL packages (viral licenses), UNLICENSED packages

## Dependency Tree Health

- **Total Transitive Dependencies:** ~1,640 (moderate risk; >500 is concerning)
- **Production Dependencies:** ~506 (healthy)
- **Development Dependencies:** ~1,134 (bloat from test tools)
- **Duplicate Versions:** Minor (pino 8.x vs. 10.x; uuid 9.x)
- **No post-install scripts:** ✓ Good (no supply chain hooks)

## Recommendations

### Short-term (This Sprint)

1. Upgrade OpenTelemetry suite immediately (protobufjs RCE fix)
2. Upgrade vitest in all workspaces (dev secret leak fix)
3. Run full test suite after each upgrade
4. Test prod deployment after fixes

### Medium-term (Next Sprint)

1. Upgrade React/React-Router (open redirect fix + new features)
2. Upgrade Vite (path traversal fix)
3. Align dependency versions across workspaces (pino, uuid)
4. Set up Dependabot or Snyk for automated CVE alerts

### Long-term

1. Migrate to pnpm workspaces (better monorepo support)
2. Add `npm audit --audit-level=high` gate to CI/CD
3. Monthly dependency audits
4. Subscribe to vendor security advisories (@opentelemetry, vite, vitest)

## Tools & Commands

```bash
# Run audits
npm audit --json                              # JSON for parsing
npm audit --audit-level=high                  # Fail on high+
npm outdated                                  # Check updates

# Fix vulnerabilities
npm audit fix                                 # Auto-patch
npm update [package]@[version]                # Manual upgrade

# License compliance
npx license-checker --json                    # Full report
npx license-checker --onlyAllow "MIT,Apache-2.0"  # Whitelist

# Dependency inspection
npm ls [package]                              # Where is it used?
npm ls --depth=0                              # Direct deps only
```

## Notes

- **OpenTelemetry** is moving fast; multiple major version jumps needed for security fixes
- **Vitest** UI is a dev-time risk but critical for preventing .env leaks
- **form-data** CRLF injection affects any workspace that uploads files
- Consider using `npm ci` in CI/CD (locks lockfile) instead of `npm install`

## Next Review Date

- **Scheduled:** 2026-07-28
- **Trigger:** After major dependency upgrades (quarterly recommended)
