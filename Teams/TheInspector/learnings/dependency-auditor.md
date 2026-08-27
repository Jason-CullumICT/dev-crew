# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-08-27: Initial Findings

### Critical Vulnerabilities Found
1. **handlebars (Backend transitive)** — 8 JS injection / XSS / prototype pollution CVEs
   - Path: express → supertest → jest → babel → handlebars
   - Status: Awaiting patch availability or consideration of removing unnecessary transitive dependency
   - Action: Monitor npm audit for patches; escalate to TheGuardians

2. **vitest (Frontend direct)** — Arbitrary file read in UI server when listening
   - Version: ^2.0.5 (may have patch in 2.0.5+)
   - Status: Update recommended
   - Action: `npm update vitest` in Source/Frontend

### High-Severity DoS Vulnerabilities (Multiple)
- **brace-expansion** (Backend): 4 DoS CVEs via glob pattern expansion
- **js-yaml** (Backend): Quadratic-time DoS in YAML merge keys
- **nanoid** (Frontend): Infinite loop with negative/zero size
- **ws** (Frontend): Memory exhaustion from tiny WebSocket fragments
- **postcss** (Frontend): XSS + path traversal in source map handling
- **vite** (Frontend): Path traversal in `.map` file handling
- **form-data** (Both): CRLF injection in multipart field names/filenames

### Dependency Tree Analysis
- **Backend**: 412 transitive deps from 13 direct = 31:1 expansion ratio (high)
- **Frontend**: 231 transitive deps from 13 direct = 17:1 expansion ratio (moderate)
- **E2E**: 5 transitive deps from 1 direct = 5:1 expansion ratio (healthy)
- **Observation**: Both main packages have large transitive trees; consider pruning unused build/test dependencies

### Supply Chain Health
✅ **No postinstall scripts** detected in any dependency (good security posture)
✅ **No single-maintainer dependencies** of high risk identified
⚠️  **412 + 231 = 643 total transitive packages** = large CVE surface area
⚠️  **Missing license fields** in Backend and Frontend main package.json files (should declare "license": "MIT" or "UNLICENSED")

### Environment & Tools
- npm audit available and working in all directories
- npm outdated working but shows "null" for current version (expected in newer npm)
- All packages use semantic versioning (^, ~, fixed versions)
- No yarn.lock or pnpm-lock detected (npm-only project)

## Learnings from 2026-08-27

### For Future Audits
1. **Priority Order**: Always escalate critical CVEs to TheGuardians (handlebars, vitest)
2. **Transitive Depth**: Backend's 31:1 expansion ratio is concerning; consider dependency audit as part of sprint planning
3. **Pattern**: Most CVEs are in transitive build/test dependencies (babel, jest, vitest, vite). Consider separating dev dependencies into a separate lock file or docker layer
4. **License Compliance**: Always check for missing/unknown licenses in direct dependencies

### Watch List (Recurring Issues)
- **brace-expansion**: Multiple DoS CVEs, monitor for version updates
- **js-yaml**: YAML parsing DoS issues, consider input validation if parsing user YAML
- **postcss**: Source map path traversal, monitor for 8.x patch releases
- **@remix-run/router**: Open redirect CVEs, monitor react-router-dom updates

### Remediation Status
- 18 out of 22 CVEs have available patches
- 2 escalations to TheGuardians (handlebars, vitest)
- Recommended action: Run `npm audit --fix` in all directories, then manual review of remaining vulns

## Audit Command Reference

```bash
# Run audit on all main packages
for dir in Source/Backend Source/Frontend Source/E2E; do
  echo "=== $dir ==="
  cd $dir && npm audit --json | jq '.metadata.vulnerabilities'
  cd - > /dev/null
done

# Fix what can be auto-fixed
for dir in Source/Backend Source/Frontend; do
  cd $dir && npm audit --fix && cd - > /dev/null
done

# Update all to latest available
for dir in Source/Backend Source/Frontend; do
  cd $dir && npm update && cd - > /dev/null
done
```

## Next Steps
1. Merge recommended patches from this audit
2. Schedule handlebars and vitest updates before next production release
3. Consider quarterly dependency pruning (remove unused test/build deps)
4. Add CI check: fail on new critical/high CVEs (current: 10 high + 2 critical = skip for now, but track improvements)
