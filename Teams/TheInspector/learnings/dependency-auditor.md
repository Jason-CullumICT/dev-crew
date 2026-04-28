# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run Summary (2026-04-28)

**Audit Date:** 2026-04-28  
**Projects Scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)  
**Total CVEs Found:** 17 (2 critical, 3 high, 12 moderate)  
**Grade:** D (multiple critical vulnerabilities)

---

## Key Findings & Patterns

### Critical CVEs Requiring Immediate Action

1. **Handlebars.js (GHSA-2w6w-674q-4c4q)** — JavaScript Injection via AST Type Confusion
   - **CVSS 9.8** — Remote code execution possible
   - **Affected:** Source/Backend (411 transitive deps)
   - **Root Cause:** Email/PDF generation libraries use vulnerable handlebars for template compilation
   - **Watch List:** Monitor handlebars releases; this package has multiple overlapping vulnerabilities
   - **Decision:** Upgrade to 4.7.9+ immediately

2. **protobufjs (GHSA-xq3m-2v4x-88gg)** — Arbitrary Code Execution
   - **CVSS 9.8** — RCE via `.proto` file parsing
   - **Affected:** platform/orchestrator, portal/Backend (Google Cloud clients)
   - **Decision:** Upgrade to 7.5.5+ immediately
   - **Note:** This is a transitive dependency from gRPC/Google Cloud SDKs

3. **path-to-regexp (GHSA-37ch-88jc-xwx2)** — ReDoS Vulnerability
   - **CVSS 7.5** — Denial of service via crafted URLs
   - **Affected:** platform/orchestrator, portal/Backend (Express routing)
   - **Decision:** Upgrade to 0.1.13+ immediately
   - **Cross-ref:** red-teamer should test `/api/work-items/:id*` routes

### Secondary High-Risk Patterns

- **picomatch ReDoS:** Affects build tooling (portal/Frontend) — high but not runtime-critical
- **esbuild Dev Server CORS:** Development-only vulnerability, but exploitable during development
- **uuid Buffer Bounds:** 5 major versions behind (9.0 → 14.0) — suggests long time since update

### Outdated Dependencies Watch List

| Package | Behind | Status | Notes |
|---------|--------|--------|-------|
| uuid | 5 majors | CRITICAL | 9.0 → 14.0 — major jump suggests security-driven updates |
| pino | 2 majors | MONITOR | 8.17 → 10.3 — logging library, check format changes |
| express | 1 major | PLAN | 4.18 → 5.2 — API breaking changes, requires code review |
| react | 1 major | PLAN | 18.3 → 19.2 — should upgrade but test thoroughly |

---

## Audit Tools & Availability

**npm audit:**
- ✅ Available and functional
- Returns comprehensive vulnerability data with CVSS scores
- Differentiates between direct and transitive dependencies
- Provides fix recommendations

**npm outdated:**
- ✅ Available (returns exit code 1 if outdated found)
- Shows wanted vs. latest versions
- Helpful for planning major version upgrades

**license-checker:**
- ❌ Not currently installed in this environment
- Fallback: Manual package.json license field inspection
- **Findings:** No GPL/AGPL licenses detected in direct dependencies

**govulncheck (Go), pip-audit (Python):**
- No Go or Python projects found in main Source/ directory
- Some Python in `tools/` but not in security-critical path

---

## License Compliance Decision Log

**All direct dependencies:** MIT or Apache 2.0 (permissive)  
**No viral licenses detected**  
**Recommendation:** Continue monitoring transitive dependencies for GPL/AGPL

---

## Project Structure Observations

### npm Projects Detected
- **Source/Backend:** 4 direct, 102 transitive — well-scoped microservice
- **Source/Frontend:** 3 direct, ~200 transitive — typical React SPA
- **Source/E2E:** 4 direct, ~40 transitive — clean test environment
- **platform/orchestrator:** 3 direct, ~80 transitive — minimal orchestrator
- **portal/Backend:** 10 direct, ~300 transitive — telemetry + Google Cloud = heavy
- **portal/Frontend:** 5 direct, ~400 transitive — Vite + React + testing = typical

### Remediation Effort Estimation
- **Phase 1 (Critical):** 1-2 hours (patch versions, low risk)
- **Phase 2 (High):** 2-3 hours (some transitive shuffling)
- **Phase 3 (Medium):** 4-5 hours (major versions, requires testing)
- **Phase 4 (Future):** Ongoing (express, pino, react-router-dom upgrades)

---

## Audit Coverage & Gaps

### What We Audited (Complete)
- ✅ npm vulnerabilities via `npm audit --json`
- ✅ Outdated packages via `npm outdated`
- ✅ License fields in direct dependencies
- ✅ Dependency tree size estimation
- ✅ Known abandoned packages

### What We Could Add (Future Runs)
- [ ] SBOM (Software Bill of Materials) export via `npm ls --depth=infinity --json`
- [ ] License scanner on transitive dependencies (requires license-checker or cyclonedx)
- [ ] Dependency age analysis (first published, last update)
- [ ] Supply chain risk scoring (maintainer count, download velocity)
- [ ] Build reproducibility check (lockfile stability)
- [ ] Duplicate dependency detection (multiple major versions of same package)

---

## Next Audit Run Recommendations

1. **Re-run after Phase 1 remediation** to verify critical CVEs closed
2. **Expand to non-npm projects** if Python/Go services are added
3. **Add SBOM export** for supply chain compliance
4. **Monitor protobufjs, handlebars, path-to-regexp** releases closely — they have overlapping security issues
5. **Plan React/express/react-router major version upgrades** as separate sprint tasks

---

## Self-Learning Artifacts

**Audit Tool Command Reference:**
```bash
# Vulnerability scan
npm audit --json > audit-output.json

# Outdated check
npm outdated --json  # Exit code 1 if outdated exist

# Dependency size estimation
wc -l package-lock.json

# License check (when tool is available)
npx license-checker --json > licenses.json

# Dependency tree (for deep inspection)
npm ls --json > tree.json
```

**Critical Vulnerability Watch List:**
- handlebars (multiple overlapping JS injection CVEs)
- protobufjs (RCE via `.proto` parsing)
- path-to-regexp (ReDoS — affects all Express routing)
- uuid (buffer bounds, but 5 majors behind suggests it's low-priority security)

---

_Last Updated: 2026-04-28_
