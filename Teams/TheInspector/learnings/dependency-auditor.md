# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run 2026-10-02

### Critical Findings Discovered
1. **Handlebars RCE (GHSA-2w6w-674q-4c4q)** — JavaScript injection via AST type confusion, CVSS 9.8
   - Found in: Source/Backend
   - Transitive dependency through build/test tooling
   - Requires template code execution risk

2. **Vitest Arbitrary File Read (GHSA-5xrq-8626-4rwp)** — CVSS 9.8, affects UI server
   - Found in: Source/Frontend, portal/Backend
   - DIRECT dev dependency — must be updated immediately
   - Risk: Entire source code exposed if UI server runs on development machine

3. **Protobufjs RCE (GHSA-xq3m-2v4x-88gg)** — CVSS 9.8, untrusted .proto parsing
   - Found in: portal/Backend
   - Transitive through OpenTelemetry instrumentation chain
   - Requires careful validation of protobuf inputs

### Watch-List Packages (Recurring CVEs)
- **Handlebars** — multiple vulnerabilities per version; upgrade to 4.8.0+ immediately
- **Vitest** — frequently patches security issues; stay within 1-2 versions of latest
- **OpenTelemetry chain** (@opentelemetry/*) — heavy CVE load; consider reducing instrumentation scope
- **js-yaml** — quadratic DoS; always update to latest patch version
- **react-router-dom** — open redirect fixes in 7.x; migration needed

### Architecture Observations
- **13 package.json files** across demo + main projects = duplication & inconsistent versions
  - Recommendation: Use npm workspaces for main `Source/` and `platform/` directories
- **400+ transitive dependencies** — large attack surface; consider lightweight alternatives
- **Portal/Backend heaviest:** 54 vulnerabilities due to OpenTelemetry auto-instrumentation
  - Recommendation: Evaluate whether full instrumentation is needed in debug environment

### License Compliance
✅ **Clean audit:** All production dependencies use permissive licenses (MIT, Apache 2.0, ISC)
- No GPL/AGPL viral licenses detected
- No UNLICENSED packages in prod

### Audit Tools Available in This Environment
- `npm audit --json` — native, reliable, works offline
- `npm outdated` — direct + transitive version info (works if node_modules installed)
- Build-tool dependencies prevent automated license-checker installation
- Fallback: Manual inspection of `node_modules/*/package.json` license fields

### CI/CD Integration Recommendations
```bash
# Add to pipeline:
npm audit --audit-level=moderate --production  # Fail on moderate+
npm outdated --long  # Report outdated packages
```

### Remediation Checkpoints
- **Immediate:** Vitest, Handlebars, Protobufjs (3 critical CVEs)
- **Week 1:** form-data, js-yaml, brace-expansion, browserslist, react-router-dom, vite
- **Week 2:** React 19 upgrade planning, OpenTelemetry strategy review
- **Monthly:** Run full audit + report
