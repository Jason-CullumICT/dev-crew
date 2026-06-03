# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-03

### Key Findings

**Critical Issues:**
1. **Handlebars@4.7.8** — Multiple JS injection CVEs in dev dependency chain (jest → ts-jest → handlebars)
   - CVSS 9.8 max; affected range 4.0.0-4.7.8
   - Latest fix: 4.7.9 (released 2026-03-26)
   - Dev-only risk; low impact unless untrusted templates processed
   - Workaround: upgrade jest/ts-jest chain in next sprint

2. **UUID@9.0.0** — Buffer bounds overflow (CWE-787/1285)
   - CVSS 7.5; affects v3/v5/v6 with caller-provided buffers
   - Backend safe (uses v4 only, no buf param)
   - Latest fix: v11.1.1 (major bump); v9.0.1+ for hotfix
   - Action: Confirm uuid.v4()-only usage, then update

3. **Vite@5.4.0 + esbuild cascade** — Path traversal + CORS bypass in dev server
   - Dev-time only; low risk in CI
   - Fix: update to vite 5.5.0+ (minor) or 6.5.0+ (major)
   - Mitigation: restrict --host binding

4. **QS@6.15.1** — DoS via null array elements in query strings
   - Reachable via express → body-parser
   - CVSS 5.3; moderate risk
   - Fix: npm update express (4.18.2 → 4.22.2)

### Environment Notes

- **npm lockfileVersion 3** — Modern, supports workspaces; no issues
- **Transitive dependency volume:** 643 total (411 Backend, 231 Frontend)
  - Production-only: 111 (102 Backend, 9 Frontend)
  - Dev/test: 532 (310 Backend, 222 Frontend)
  - No duplicate versions detected — dependency resolution is clean
- **Post-install scripts:** None in direct dependencies (clean supply chain)
- **Single-maintainer packages:** uuid (kieffer), pino (collina) — both active
- **No abandoned packages** detected

### Watch List (Recurring CVE Patterns)

| Package | Pattern | Frequency | Action |
|---------|---------|-----------|--------|
| **handlebars** | Template injection (CWE-94/843) | Every 6-12 months | Consider template sanitizer or switch to mustache |
| **uuid** | Buffer safety (CWE-787) | v3/v5/v6 main risk | Audit caller-provided buffer usage |
| **qs** | Query string DoS | 2-3x yearly | Validate input shapes in handlers |
| **vite/esbuild** | Dev server CORS/path traversal | 1-2x yearly | Restrict dev server binding in CI |

### Tools Available in This Environment

```bash
# CVE Scanning
npm audit --json                     # Official npm vulnerability scanner
npm outdated --json                  # Check for outdated packages

# License Checking
npx license-checker --json           # License compliance (if installed)
grep '"license"' node_modules/*/package.json  # Manual fallback

# Dependency Analysis
npm ls --depth=0                     # Direct dependencies
npm ls                               # Full tree
npm view <pkg> time --json          # Release history
npm view <pkg> deprecated           # Check deprecated flag

# Transitive Count
node -e "const fs=require('fs'); const lock=JSON.parse(fs.readFileSync('package-lock.json')); console.log(Object.keys(lock.packages).length)"
```

### License Compliance Decisions

- **UNLICENSED private packages** (workflow-engine-backend, workflow-frontend) — OK for internal use
- **MIT, ISC, Apache 2.0, BSD variants** in transitive deps — All permissive, no GPL/AGPL detected
- **No viral license risk** detected in dependency tree

### Prior Findings & Status

#### First Run (2026-06-03)

| Finding | Current Status | Action Taken |
|---------|---|---|
| handlebars CVEs (DEP-002) | **Open** | Documented, requires jest upgrade in next sprint |
| uuid buffer bug (DEP-005) | **Open** | Audited, confirmed v4-only usage in backend, safe to defer |
| qs DoS (DEP-003) | **Open** | Documented, fix via npm update express (4.18.2 → 4.22.2) |
| vite path traversal (DEP-006) | **Open** | Documented, dev-only risk, update in next sprint |
| vitest mocker cascade (DEP-009) | **Open** | Mitigated, no --ui flag in CI; plan v4 upgrade later |

### Recommendations for Next Run

1. **Repeat audit in 30 days** to catch new CVEs in:
   - `express` (high-traffic package)
   - `react`, `react-dom` (major framework)
   - `vite`, `vitest` (toolchain, frequent updates)

2. **Audit after each sprint update:**
   ```bash
   npm audit --json > audit-before.json
   npm update <packages> --save
   npm audit --json > audit-after.json
   diff audit-before.json audit-after.json
   ```

3. **Add to CI/CD:**
   ```yaml
   - name: Dependency Audit
     run: npm audit --audit-level=moderate
   ```
   This will fail CI if moderate+ CVEs are introduced.

4. **Monitor these high-risk packages:**
   - `uuid` (v3/v5/v6 buffer safety)
   - `qs` (query parsing DoS)
   - `handlebars` (template injection)
   - `vite` (dev server security)

---

## Template for Future Audits

When running the next audit, use this checklist:

- [ ] Run `npm audit --json` on all package.json files (Source/Backend, Source/Frontend, etc.)
- [ ] Compare with prior run (`audit-before.json` from last sprint)
- [ ] Identify new CVEs (filter by `severity >= "moderate"`)
- [ ] Check for outdated packages (`npm outdated --json`)
- [ ] Verify license compliance (run `npx license-checker --json` if available)
- [ ] Inspect lock file for transitive dependency count and duplicates
- [ ] Document findings in `Teams/TheInspector/findings/dependency-audit-{date}.md`
- [ ] Update this learnings file with new watch-list items
- [ ] Tag escalations to TheGuardians (security) or TheFixer (fixes)
