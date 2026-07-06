# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Watch List: Packages with Recurring CVEs

- **Handlebars.js** — Multiple critical RCE vulnerabilities (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, etc.)
  - Status: Transitive dependency in Backend; identify which direct dep pulls it
  - Action: Consider removing if not needed; if needed, enforce ≥4.7.9
  
- **Vitest** — Critical UI server RCE (GHSA-5xrq-8626-4rwp)
  - Status: Direct devDep in Frontend (2.0.5)
  - Action: Upgrade to ≥3.2.6; consider disabling UI server in CI
  
- **form-data** — CRLF injection (GHSA-hmw2-7cc7-3qxx)
  - Status: Transitive in both Backend and Frontend
  - Action: Audit which packages depend on form-data; upgrade all to ≥4.0.6
  
- **Vite** — Multiple security issues (path traversal, fs.deny bypass)
  - Status: Direct devDep in Frontend; also transitive in Backend
  - Action: Keep on latest stable; monitor for new releases

## Environment & Tools

### npm Audit Available
- `npm audit --json` works on all npm workspaces
- Metadata includes structured vuln counts by severity
- Supports `--audit-level=moderate` for CI gates

### License Checking
- All direct deps have explicit SPDX licenses
- No GPL/AGPL violations detected
- Use `npx license-checker` if needed (not yet installed)

### Transitive Dependency Tracking
- Backend: ~200 transitive deps (estimate from npm list)
- Frontend: ~300 transitive deps (estimate)
- No duplicate major versions detected yet
- Largest packages: jest, vite, esbuild, webpack

## Known Issues & Resolutions

### Issue 1: Handlebars in Backend
**Discovery:** npm audit shows handlebars ≤4.7.8 with multiple critical CVEs.
- **Root Cause:** Transitive dependency (not in package.json)
- **Resolution Path:** 
  1. Identify which direct dep pulls handlebars: `npm ls handlebars`
  2. If unused: remove or find replacement
  3. If needed: pin to ≥4.7.9 in package-lock.json (or force npm update)
- **Status:** PENDING — investigate which package brings it in

### Issue 2: Vitest UI Server RCE
**Discovery:** Vitest <3.2.6 has CRITICAL RCE when UI server runs.
- **Root Cause:** Unrestricted file access in dev server
- **Resolution:** Upgrade vitest to ≥3.2.6 in Source/Frontend
- **Status:** PENDING — urgent fix needed before CI/local development

### Issue 3: form-data CRLF Injection
**Discovery:** form-data 4.0.0-4.0.5 vulnerable to header injection (CWE-93).
- **Root Cause:** Unescaped multipart field names and filenames
- **Affected Packages:** Both Backend and Frontend
- **Resolution:** Upgrade form-data to ≥4.0.6 (npm update form-data)
- **Status:** PENDING — affects file upload paths

## Audit Schedule & Next Steps

- **Last Audit:** 2026-07-06
- **Next Audit:** 2026-07-13 (weekly)
- **Frequency:** Weekly (or on-demand after major updates)
- **Entry Point:** Run `npm audit --json` in Source/Backend, Source/Frontend, Source/E2E

## Links & References

- GitHub Advisory Database: https://github.com/advisories
- npm Audit Documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit
- OWASP Dependency Check: https://github.com/jeremylong/DependencyCheck

---

**Last Updated:** 2026-07-06 by Dependency Auditor
