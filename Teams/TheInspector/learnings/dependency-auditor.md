# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-04-25 Initial Audit Run

**Critical Findings Watch List:**
- `handlebars` — Multiple injection CVEs (7 separate advisories). Always validate >4.7.9 in dependencies
- `protobufjs` — RCE in <7.5.5. Used in portal/Backend (likely for gRPC or message serialization)
- `uuid` — Buffer bounds check in v3/v5/v6. Direct dep in Source/Backend at v9.0.0 (needs upgrade to 14.0.0)

**Audit Tool Availability:**
- ✅ `npm audit --json` works without node_modules (uses lock files only)
- ✅ All workspaces have package-lock.json files
- ℹ️ No Go modules, Python, or Rust packages detected — npm-only project

**Dependency Tree Stats:**
- Source/Backend: 13 direct, ~102 transitive
- Source/Frontend: 13 direct, ~230 transitive
- portal/Backend: Unknown direct, ~9 CVEs (includes protobufjs)
- portal/Frontend: Unknown direct, ~6 CVEs (includes picomatch ReDoS)
- Source/E2E: 0 CVEs (clean)

**License Compliance:**
- All packages UNLICENSED or standard open-source (MIT, Apache-2.0)
- No GPL/AGPL detected → no license escalation needed

**Recurring Patterns:**
- vite/esbuild chain has consistent path traversal issues across dev builds
- postcss XSS issue affects CSS generation pipeline
- picomatch ReDoS in glob matching affects portal/Frontend

**Action Items for Next Audit:**
1. Monitor handlebars parent dependency — may auto-update if parent updates
2. Verify protobufjs fix is applied and tested in portal/Backend
3. Check if uuid 14.0.0 upgrade breaks Source/Backend type signatures
4. Re-audit after major version bumps to detect new transitive CVEs
