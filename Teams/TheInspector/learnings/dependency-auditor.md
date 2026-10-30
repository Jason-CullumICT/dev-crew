# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## First Full Audit: 2026-10-30

### Critical Vulnerabilities Discovered

1. **vitest (Direct Dep)** — GHSA-5xrq-8626-4rwp
   - Arbitrary file read/execute via UI server
   - Found in: Source/Frontend, portal/Backend, portal/Frontend
   - **Action:** Update to latest; disable UI server in non-dev
   - **Status:** P1 URGENT

2. **proxy-addr (Transitive)** — GHSA-jqcg-44mw-7w3h
   - IPv4-mapped IPv6 IP spoofing for auth bypass
   - Found in: Source/Backend, platform/orchestrator, portal/Backend
   - **Action:** Update all packages; audit IP-based access controls
   - **Status:** P1 URGENT

3. **protobufjs (Transitive)** — GHSA-xq3m-2v4x-88gg
   - Arbitrary code execution in message parsing
   - Found in: platform/orchestrator, portal/Backend
   - **Action:** Update protobufjs@latest immediately
   - **Status:** P1 URGENT

4. **handlebars (Transitive)** — GHSA-3mfm-83xf-c92r
   - JavaScript injection via AST tampering
   - Found in: Source/Backend
   - **Action:** Update handlebars@latest; audit template usage
   - **Status:** P1 URGENT

5. **tinypool (Transitive)** — GHSA-5gmw-xhrv-c9v3
   - Prototype pollution RCE in worker options
   - Found in: Source/Frontend, portal/Backend, portal/Frontend
   - **Action:** Update vitest (which depends on tinypool)
   - **Status:** P1 URGENT

### Dependency Tree Observations

- **portal/Backend has 577 total deps** (397 direct + 181 transitive) — consider consolidation
- **Source/Backend has 411 total deps** — large attack surface
- **No post-install scripts detected** ✅ (good security practice)
- **Source/Frontend and Source/E2E are lean** (<250 deps each)

### Audit Tools & Environment Notes

- ✅ `npm audit --json` works reliably in all directories
- ✅ `npm outdated --json` available for version checking
- ✅ npm vulnerability database is up-to-date
- **Note:** portal/Backend audit output was massive (46 moderate vulns) — may need prioritization

### License Compliance Notes

- **No GPL/AGPL packages detected** in main source
- All visible licenses are permissive (MIT, Apache, ISC)
- **No license-checker tool found** — would recommend installing for automated checks

### Recurring Patterns to Watch

1. **@babel/* packages** — Multiple minor CVEs in build toolchain (file read via sourceMappingURL)
2. **Form parsing (body-parser, form-data)** — DoS and injection risks
3. **Source mapping (source-map-js, vite)** — Path traversal in dev tooling
4. **Testing libraries (vitest, @vitest/mocker)** — Test infrastructure vulnerabilities

### Recommendations for Next Audit

1. Add `npm audit` to CI/CD pipeline (fail on critical/high)
2. Establish monthly dependency update cadence
3. Audit portal/Backend for dependency consolidation opportunities
4. Monitor top 5 critical packages for new CVEs
5. Set up automated alerts for npm security advisories
