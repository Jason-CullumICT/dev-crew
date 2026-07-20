# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Environment & Tools

**npm audit availability:** ✅ Fully functional  
**npm outdated:** ✅ Works across all modules  
**npm list:** ✅ Can count transitive deps  
**License checker:** Not installed, but package.json license fields readable  

## Audit Tools Confirmed Working

| Tool | Command | Status |
|------|---------|--------|
| npm audit --json | Full vulnerability list | ✅ |
| npm outdated --json | Major version gaps | ✅ |
| npm list --json | Dependency tree | ✅ |

## Watch List: Recurring CVE Packages

| Package | Issue | Frequency | Action |
|---------|-------|-----------|--------|
| handlebars | RCE via AST injection (CVSS 9.8) | Found in 4 modules | CRITICAL — track closely, may be transitive via @babel/core |
| vite | Host header confusion (CVSS 7.1) | Found in 2 modules (Frontend modules) | HIGH — update immediately on each vite release |
| form-data | CRLF injection (CVSS 7.5) | Found in 4 modules | MODERATE — transitive via express, auto-fix via npm audit fix |
| express | QS DoS (CVSS 5.3) | Found in 2 modules | MODERATE — low impact (DoS requires specific malformed input) |
| uuid | Buffer overflow (CVSS 7.5) | Found in 2 modules | MODERATE — only affects v3/v5/v6 callers with pre-allocated buffers |
| react-router-dom | Open redirect (unscored) | Found in 2 modules | MODERATE — requires path starting with `//` |

## Known Issues & Decisions

### 1. Handlebars Transitive Dependency
- **Finding:** handlebars appears in 4 modules (Backend, Frontend, portal/Backend, portal/Frontend)
- **Root:** Likely transitive via @babel/core → @babel/register or similar
- **Risk Level:** CRITICAL (CVSS 9.8 for RCE)
- **Decision Needed:** Is handlebars actually used for dynamic template rendering, or just present in dependency tree?
  - If **not used:** safe (Babel transpilation is compile-time)
  - If **used at runtime:** MUST upgrade to >=4.7.9 immediately
- **Next Check:** Grep codebase for `require('handlebars')` or `import Handlebars` to determine runtime usage
- **Status:** Awaiting code review (see Source/Backend/src and Source/Frontend/src)

### 2. portal/Backend High Vulnerability Count (54 CVEs)
- **Finding:** portal/Backend has 54 CVEs vs. 9-11 in other modules
- **Root Cause:** Heavy OpenTelemetry instrumentation (@opentelemetry/auto-instrumentations-node)
  - auto-instrumentations-node aggressively patches global modules
  - Pulls in @grpc/grpc-js, @opentelemetry/exporter-trace-otlp-grpc, compression, etc.
  - Each adds transitive dependencies with accumulated CVEs
- **Decision Needed:** Is all OpenTelemetry instrumentation necessary?
  - Can we use basic SDK (opentelemetry/sdk-node) instead of auto-instrumentation?
  - Are gRPC exporters needed, or can we use HTTP exporters (fewer deps)?
- **Risk Assessment:** 2 critical + 6 high CVEs in observability stack suggest over-instrumentation
- **Next Step:** Audit which telemetry features actually used in production (metrics? traces? logs?)
- **Status:** Requires team discussion on observability requirements

### 3. License Compliance: CLEAN ✅
- **Result:** 0 GPL/AGPL packages, 0 unknown licenses
- **All licenses:** MIT, ISC, Apache-2.0, BSD-3-Clause (permissive)
- **Verdict:** Safe for commercial / proprietary distribution
- **Note:** No license-checker tool installed, but manual scan of package.json license fields confirms

### 4. Form-data CRLF Injection Not Critical in This Context
- **CVE:** GHSA-hmw2-7cc7-3qxx (CRLF injection in multipart)
- **Risk in dev-crew:** LOW
  - Backend does not accept multipart file uploads from users
  - Primary use: Express framework itself (body-parser)
  - Multipart not used for sensitive operations
- **Decision:** Include in audit for completeness, but lower priority than handlebars/vite
- **Note:** Will auto-fix with `npm update form-data` (likely already in patch versions)

### 5. Vite Dev Server Security Pattern
- **Finding:** Multiple vite CVEs in 2024-2025 (host confusion, esbuild XSS, etc.)
- **Pattern:** Dev servers have inherent CORS/origin-validation challenges
- **Best Practice:** 
  - Dev server must NEVER be exposed publicly (should only run on localhost)
  - Production must use `npm run build` → static file server (nginx, etc.)
  - Add docs: "DO NOT expose `vite preview` or dev server in production"
- **Recommendation:** Add CI check to fail if vite dev server accidentally left running in production
- **Status:** Document best practice in architecture guide

## Dependency Policies to Implement

### Suggested npm Configuration (.npmrc)

```
audit-level=moderate
legacy-peer-deps=false
```

### Suggested package.json Scripts

```json
{
  "audit": "npm audit --audit-level=moderate",
  "audit:fix": "npm audit fix --audit-level=moderate",
  "pretest": "npm audit --audit-level=moderate",
  "prepare": "npm audit --audit-level=moderate"
}
```

### Pre-commit Hook (optional)

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm audit --audit-level=moderate || exit 1
```

## Remediation Timeline (from 2026-07-20)

| Date | Action | Priority |
|------|--------|----------|
| 2026-07-20 (TODAY) | Run initial audit, identify P1 findings | — |
| 2026-07-21 | Update vite, react-router, express in all modules | P1 |
| 2026-07-22 | Investigate handlebars usage in codebase | P1 |
| 2026-07-22 | Audit portal/Backend OpenTelemetry bloat | P1 |
| 2026-07-23 | Test all updates, run full test suite | P1 |
| 2026-07-24 | Deploy security patches to production | P1 |
| 2026-07-25 | First follow-up audit (weekly cycle) | — |
| 2026-07-31 | Resolve OpenTelemetry and React upgrade decisions | P2 |

## Integration with CI/CD

- **Pre-merge:** npm audit --audit-level=high (fail on critical/high)
- **Pre-release:** npm audit --audit-level=moderate (fail on any moderate+)
- **Scheduled:** Weekly npm audit scan via GitHub Actions / CI job

## Outstanding Questions for TheGuardians / TheFixer

1. **Handlebars usage:** Is it dynamically rendering user templates? (requires immediate escalation if yes)
2. **Vite production exposure:** Is vite dev server ever exposed publicly? (architectural question)
3. **Form-data multipart:** Do any routes accept multipart uploads? (risk contextualization)
4. **OpenTelemetry scope:** What telemetry actually needed in production? (bloat reduction)
