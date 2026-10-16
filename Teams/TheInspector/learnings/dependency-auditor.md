# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### 2026-10-16: First Full Audit Run
**Grade:** C (Conditional Pass)  
**Critical Issues:** 5 packages with P1 CVEs  
**High Issues:** 50+ packages with P2+ CVEs  
**Total CVEs:** 208 across all workspaces  

---

## Watch List (Recurring Vulnerabilities)

### 1. Handlebars.js (CRITICAL - 3 months watch)
- **Pattern:** Recurring AST type confusion + template injection vulnerabilities
- **History:** Multiple critical CVEs in short time window (GHSA-2w6w-674q-4c4q, GHSA-8r5x-fm3f-whwj, GHSA-p8wg-vrv2-v86f)
- **Last Fixed:** 4.7.10+
- **Action:** Review quarterly; consider template sandboxing; assess if handlebars is truly needed for use case
- **Risk:** High if used for server-side templating of untrusted input
- **Notes:** Appears to be in transitive dependencies via test fixtures or other tools

### 2. proxy-addr (CRITICAL - IPv4 Spoofing)
- **CVE:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Pattern:** IP trust validation bypass via IPv4-mapped IPv6
- **Affected Versions:** <2.0.8
- **Root Cause:** Used by Express for `trust proxy` middleware
- **Action:** Always audit proxy-addr during Express updates; test IP-based rules after updates
- **Mitigation:** Verify `trust proxy` configuration does not rely on IP spoofing defenses

### 3. Vitest UI Server Exposure (CRITICAL - RCE)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Pattern:** Arbitrary file read + code execution via default port 51204
- **Affected Versions:** <3.2.6 or <4.1.11
- **Risk Context:** Most dangerous in CI/CD environment if UI server left running
- **Action:** 
  - Build-time check: Ensure Vitest UI is never exposed in production/staging
  - CI/CD: Add check to kill Vitest processes after test run
  - Document: Add to security checklist

### 4. Jest/Testing Framework High Churn (P2)
- **Pattern:** 17+ Jest ecosystem packages with high-severity CVEs
- **Root:** Jest dependencies include handlebars, uuid, babel-core, and others with their own vulns
- **Frequency:** Updates often lag latest patches
- **Action:** Upgrade Jest version whenever major source updates occur
- **Recommendation:** Consider vitest migration long-term (has fewer deps)

### 5. Tinypool Prototype Pollution → RCE (P1)
- **CVEs:** GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr
- **Dependency Chain:** Vitest → tinypool
- **Risk:** RCE through worker pool configuration
- **Action:** Keep tinypool synchronized with Vitest upgrades; never accept worker config from untrusted sources

---

## Audit Tool Availability

### npm audit
- ✓ Available: `npm audit --json` works for all npm workspaces
- ✓ Supports JSON output for parsing
- ✓ Provides CVSS scores and CVE URLs
- Note: Requires existing `package-lock.json` in each workspace

### npm outdated
- ✓ Available: `npm outdated --json` shows version gaps
- Note: Returns `null` for current/wanted in some cases; use `--depth=0` for direct deps

### npm ls
- ✓ Available: `npm ls --json` shows full dependency tree
- Use for license audit with `npx license-checker --json`

### license-checker
- Status: Not installed globally (would need `npm install -g license-checker`)
- Workaround: Direct `package.json` license field inspection (done for direct deps)
- Recommendation: Add to CI/CD pipeline for automated checks

### Snyk / Dependabot
- Status: Not available in this environment
- Recommendation: Set up for continuous monitoring (monthly cadence minimum)

---

## License Compliance Findings

**Direct dependencies: MIT + Apache-2.0 only** ✓ No GPL/AGPL risk

**Transitive dependencies:** Not fully audited (would need `license-checker` tool)
- Recommendation: Add license scanning to CI gate before next audit

---

## Dependency Tree Insights

### Workspaces by Complexity
1. **portal/Backend** - Most complex (577 transitive, 61 CVEs)
2. **Source/Frontend, portal/Frontend** - ~424 transitive each
3. **Source/Backend** - ~411 transitive (production)
4. **platform/orchestrator** - ~155 transitive (infrastructure)
5. **Source/E2E** - Minimal, clean (~5 total)

### Largest Dependency Ecosystems
- **Jest** (20+ packages): @jest/*, ts-jest, babel-jest
- **React** (15+ packages): react-dom, react-router, testing-library
- **Vitest** (15+ packages): vitest, @vitest/mocker, vite, tinypool, vite-node
- **OpenTelemetry** (5+ packages): Auto-instrumentation adds overhead

### Observation
Direct dependency counts are excellent (3-9 per workspace). The issue is transitive depth, which adds supply chain risk.

---

## Risk Acceptance Decisions

None yet. To be filled after team discussion on DEP-001, DEP-002, DEP-003.

---

## Next Audit Checklist

- [ ] Rerun all `npm audit` after critical fixes
- [ ] Verify React, Jest, Vitest updates don't break tests
- [ ] Document dependency upgrade timeline
- [ ] Set up automated scanning (Snyk/Dependabot)
- [ ] Review handlebars necessity + usage patterns
- [ ] Audit protobufjs version in platform/orchestrator
- [ ] Add npm audit gate to CI/CD
- [ ] Quarterly dependency health review

---

## Reference Links

- **npm audit docs:** https://docs.npmjs.com/cli/v8/commands/npm-audit
- **GitHub Advisory Database:** https://github.com/advisories (search by CVE ID)
- **CVSS v3.1 Calculator:** https://www.first.org/cvss/calculator/3.1
- **Recommended updates:**
  - handlebars: https://github.com/handlebars-lang/handlebars.js/releases
  - proxy-addr: https://github.com/jshttp/proxy-addr
  - vitest: https://vitest.dev/
  - tinypool: https://github.com/tinylibs/tinypool
