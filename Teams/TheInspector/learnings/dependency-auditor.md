# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-11-20 Findings

### Critical Risk Patterns
1. **Vitest accumulates vulnerabilities** — stays 3+ major versions behind
   - Current: v2.0.5 → Latest: v5.1.0+
   - Pins: tinypool (prototype pollution→RCE), @vitest/mocker (path traversal, code injection), vite dev-server issues
   - **Action:** Schedule quarterly vitest updates, test thoroughly across major versions

2. **proxy-addr recurs in multiple packages** — IPv4-mapped IPv6 spoofing (GHSA-jqcg-44mw-7w3h)
   - Affects: Source/Backend, platform/orchestrator, potentially others
   - **Watch List:** Add to dependency scanner

3. **Build-tool vulnerabilities are under-appreciated** — CVEs in Babel, PostCSS, browserslist
   - Dev dependencies should receive same audit rigor as production
   - **Policy:** npm audit --depth=20 on all packages, dev included

### Supply Chain Health
- ✓ **No post-install scripts detected** — good hygiene, continue enforcement
- ✓ **E2E test suite (Playwright) is clean** — 0 CVEs, use as model for new test frameworks
- ⚠ **Orchestrator has 150 transitive dependencies** — high supply chain surface
  - **Mitigation:** Regular audits (monthly), consider SRI/integrity checks for critical gRPC dependencies

### Ecosystem Issues
- **Handlebars** — template injection risk (GHSA-3mfm-83xf-c92r)
- **body-parser** — recurring DoS in Express stack (needs update path documentation)
- **brace-expansion** — multiple DoS variants, library used transitively by many tools

### License Compliance
- ✓ All packages MIT/Apache-2.0/BSD — no GPL/AGPL viral risk
- ✓ No UNLICENSED packages
- **Recommendation:** Audit licenses annually, enforce via npm audit policy

## Available Audit Tools

- `npm audit --json` — standard npm vulnerability scanner (accurate for npm packages)
- `npm outdated --json` — identifies version lags (requires npm install first)
- Fallback: Manual version checking against CVE databases (not needed currently)

## Escalation Routing (TheGuardians)

Findings tagged `[ESCALATE → TheGuardians]`:
- Handlebars (RCE via template AST injection)
- Proxy-addr (IP spoofing → auth bypass)
- Tinypool (prototype pollution → RCE)
- Protobufjs (deserialization gadget → RCE)
- PostCSS (XSS via CSS injection)

All 5 critical CVEs require security team review and prioritized patching.

## Verification Gates (Post-Fix)

```bash
# 1. Re-audit each package
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'
cd Source/Frontend && npm audit --json | jq '.metadata.vulnerabilities'
cd platform/orchestrator && npm audit --json | jq '.metadata.vulnerabilities'

# 2. Run test suites
npm test --workspaces --if-present

# 3. Traceability check
python3 tools/traceability-enforcer.py

# 4. Confirm zero new failures
# (Expected: Backend 11→0 CVEs, Frontend 17→<5, Orchestrator 9→<3)
```
