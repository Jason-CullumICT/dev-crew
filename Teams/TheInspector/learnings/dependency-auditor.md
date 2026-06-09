# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Watch List (Recurring CVEs)

### UUID Package
- **Versions ≤9.0.0:** Always flag as vulnerable (GHSA-w5hq-g745-h8pq)
- **Fix:** Upgrade to ≥11.1.1 minimum, or ≥9.0.1 for quick patch
- **Status:** Present in Source/Backend; flagged in audit 2026-06-09

### Handlebars (via Express)
- **Pattern:** Express transitive dependency, 8+ separate CVEs
- **Version Range:** 4.0.0 - 4.7.8
- **Check:** Always audit Express and crawl its transitive tree
- **Status:** Present in Source/Backend; critical RCE risk

### Vitest
- **Critical Issue:** GHSA-5xrq-8626-4rwp (file read + execute when UI server listening)
- **Status:** Present in Source/Frontend v2.0.5; requires ≥3.2.6
- **Watch:** Vitest major version upgrades often include security fixes

## Audit Tools Available

- **npm audit --json**: Works reliably; JSON output good for parsing
- **npm outdated --json**: Identifies packages >1 major version behind
- **License check**: Manual read of `node_modules/*/package.json` license field (license-checker not installed)
- **Dependency count**: `jq '.packages | keys | length' package-lock.json`

## Project Structure

**Package manifests found:**
- `Source/Backend/package.json` (4 direct deps, 102 transitive)
- `Source/Frontend/package.json` (3 direct deps, 9 transitive)
- `Source/E2E/package.json` (1 direct dep, 4 transitive)
- (Additional scaffolds in abac-*, platform/, portal/ — not core)

**Tech Stack:**
- Backend: Express 4.18.2 + Pino logging + Prometheus metrics
- Frontend: React 18.3.1 + React Router 6.26.0 + Vite
- Testing: Vitest, Jest (backend), Playwright (E2E)

## License Compliance Decision

**Policy:** MIT and Apache 2.0 only. No GPL/AGPL in production.
**Status:** All direct dependencies compliant as of 2026-06-09.

## Prior Findings & Resolution Status

### 2026-06-09 Audit
- **P1 (Critical):** Handlebars RCE (8 CVEs) via express → requires express update to 4.22.2
- **P1 (Critical):** Vitest UI file read/execute → requires vitest ≥3.2.6
- **P2 (High):** UUID buffer overflow → requires uuid ≥11.1.1
- **P3 (Medium):** Multiple moderate CVEs (qs, react-router, vite, postcss, ws)
- **Status:** Not yet fixed (this is the first full audit)
