# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-30

### Critical Findings (2 P1s Block Release)

1. **handlebars@4.0.0-4.7.8** (Backend, transitive)
   - JS Injection via AST type confusion (GHSA-2w6w-674q-4c4q, CVSS 9.8)
   - Fix: Update to ≥4.7.9
   - Status: Requires immediate fix before release

2. **vitest@2.0.5** (Frontend, DIRECT)
   - Arbitrary file read + execution via UI server (GHSA-5xrq-8626-4rwp, CVSS 9.8)
   - Fix: Update to ≥3.2.6 (major version change)
   - Status: Blocking — check CI/CD for --ui exposure
   - Note: vite-node also affected (transitive)

### High-Severity Findings (9 P2s)

Common patterns across Backend & Frontend:
- **browserslist** (both) — unbounded memory growth + prototype pollution
- **form-data** (both) — multipart DoS
- **brace-expansion** (Backend) — uncontrolled recursion via js-yaml chain
- **js-yaml** (Backend) — YAML RCE if parsing untrusted input
- **nanoid** (Frontend) — weak RNG in ≤3.3.17
- **postcss** (Frontend) — ReDoS in CSS parser
- **vite** (Frontend, DIRECT) — CORS bypass in dev server
- **ws** (Frontend) — WebSocket auth bypass

### Dependency Tree Health

- **Backend:** 407 transitive deps (high surface)
- **Frontend:** 227 transitive deps (high surface)
- **E2E:** 4 deps, CLEAN (no vulns)
- **Total:** 634 transitive dependencies — recommend supply chain monitoring

### Outdated Major Versions

**Backend:**
- express: 1 minor + 1 major behind
- pino: 2 majors behind (8→10)
- uuid: 5 majors behind (9→14) — affected by CVE

**Frontend:**
- react: 1 major behind (18→19)
- react-router-dom: 1+ minor + 1 major behind

### License Compliance

✅ No GPL/AGPL in direct dependencies. All MIT, Apache-2.0, ISC, or UNLICENSED (private).

### Tools & Commands

**npm audit:**
```bash
cd {module} && npm audit --json
```

**npm outdated:**
```bash
cd {module} && npm outdated --json
```

**license-checker:**
```bash
npx license-checker --markdown
# Note: Reporting root project only in this environment
```

### Recommendations for Next Audit

1. **Phase 1 (Week 1):** Fix 2 critical CVEs + run `npm audit fix` for high/moderate
2. **Phase 2 (Week 2):** Test thoroughly, verify Vitest CI/CD, check js-yaml usage
3. **Phase 3 (Sprint):** Plan React 19 + express upgrades (breaking changes)
4. **Ongoing:** Enable Dependabot or Snyk for continuous CVE monitoring

### Watch List (Recurring CVEs)

- **Handlebars:** Multiple injection vectors (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpv-hc6g-r9c6, etc.) — if used for template processing, prioritize updates
- **Vitest:** Multiple path traversal + RCE vectors — if exposed in CI/CD, immediate action required
- **Browserslist:** Memory exhaustion + prototype pollution — transitive but high impact
- **Form-data:** Multipart parsing issues — common in upload-heavy apps

### Audit Tools Available

- ✅ npm (v10.9.8)
- ✅ npm audit --json
- ✅ npm outdated --json
- ✅ license-checker via npx

## Learnings

- npm audit JSON output is comprehensive and parseable via jq
- License-checker in this environment reports root project only (not full tree)
- High transitive dependency count (634) suggests supply chain risk — monitoring essential
- Critical CVEs in dev tools (vitest, handlebars) can affect both build and runtime
- Major version gaps in core dependencies (pino 8→10, react 18→19) suggest legacy version pinning
