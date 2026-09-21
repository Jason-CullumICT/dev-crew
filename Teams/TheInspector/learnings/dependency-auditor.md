# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2025-09-21

### Critical Findings Summary
- **6 critical vulnerabilities** across 5 projects
- **53 high-severity vulnerabilities** across all projects
- **2,856 total dependencies** (89 direct, 2,767 transitive)
- **Grade: F** — Multiple exploitable RCE and DoS vulnerabilities

### Watch List (Recurring CVE History)
1. **handlebars** — 8+ known injection vulnerabilities (CRITICAL)
   - Frequently patched; recommend pinning to specific version and aggressive update schedule
2. **vitest** — Arbitrary file read/execution in UI server (CRITICAL)
   - Dev-time only risk, but dangerous in CI; disable UI server by default
3. **protobufjs** — Prototype pollution + ReDoS (CRITICAL)
   - Used in gRPC; critical if processing untrusted messages
4. **browserslist** — Memory exhaustion + prototype pollution (HIGH)
   - Build-time only; affects all frontend projects
5. **postcss** — Arbitrary file read via sourceMappingURL (HIGH)
   - Affects build artifacts; requires careful handling of CSS input sources

### High-Risk Transitive Dependencies
- `brace-expansion` — DoS via pattern expansion (4 distinct CVEs)
- `form-data` — CRLF injection (affects HTTP requests)
- `@grpc/grpc-js` — Crash on malformed requests
- `nanoid` — Integer overflow in ID generation
- `picomatch`/`minimatch` — ReDoS in glob patterns

### Build Tool Vulnerabilities
- **Vite:** Path traversal in .map handling; fs.deny bypass on Windows
- **PostCSS:** Arbitrary file read via sourceMappingURL
- **Babel/browserslist:** Memory exhaustion during build

### Deployment Impact
- **Source/Backend:** 1 critical (handlebars), 4 high → Deploy fix immediately
- **Source/Frontend:** 1 critical (vitest), 6 high → Disable UI server in CI; update vitest
- **Source/E2E:** CLEAN (0 vulns) ✅
- **platform/orchestrator:** 1 critical (protobufjs), 2 high → Update gRPC deps
- **portal/Backend:** 2 critical (protobufjs, vitest), 10 high → Highest risk, prioritize
- **portal/Frontend:** 1 critical (vitest), 7 high

### License Compliance
- ✅ No GPL/AGPL licenses detected
- ✅ All primary dependencies use MIT/Apache-2.0/BSD
- Recommendation: Quarterly audit as dependencies evolve

### Audit Tool Status
- ✅ `npm audit --json` available and functional in all projects
- ✅ `npm outdated --json` working
- ✅ `npm list --depth=0` functional for dependency tree
- ℹ️ `license-checker` not pre-installed; fallback to package.json inspection

### Prior CVEs Fixed in This Codebase
- _(First audit run — no prior CVEs recorded)_

### Remediation Priorities
1. **Week 1:** handlebars, vitest, protobufjs, @opentelemetry updates
2. **Week 2:** brace-expansion, browserslist, postcss, vite, form-data, @grpc/grpc-js
3. **Month 1:** Full dependency audit; plan major version upgrades

### Escalation History
- **[ESCALATE → TheGuardians]** flagged for:
  - Handlebars RCE potential
  - Vitest LAN-based arbitrary file read/execution
  - Protobufjs prototype pollution in gRPC message handling
  - js-yaml unsafe deserialization risk
