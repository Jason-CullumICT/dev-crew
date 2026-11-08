# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-08

### Summary
- **Projects Scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
- **Total Vulnerabilities:** 88 (12 critical, 32 high, 36 moderate, 8 low)
- **Total Dependencies:** 1,679 transitive across all projects
- **Grade:** D (multiple unpatched critical vulnerabilities)

### Critical Issues Requiring Immediate Action
1. **proxy-addr IP spoofing (GHSA-jqcg-44mw-7w3h)** — Affects 3 projects via express dependency. OWASP A01 violation. Requires immediate patch.
2. **vitest arbitrary file read (GHSA-5xrq-8626-4rwp)** — Affects Frontend + portal/Frontend. RCE + credential leak. Direct dependency issue.
3. **protobufjs remote code execution (GHSA-h755-8qp7-32mj)** — Affects orchestrator + portal/Backend. Patch protobufjs to >=7.5.5.

### Supply Chain Observations
- **E2E tests** have excellent isolation — only 4 dependencies, 0 vulnerabilities ✅
- **Frontend projects** have 200+ dev dependencies each — test/build tools increase surface area
- **Backend/Orchestrator** rely on npm ecosystem heavily — prioritize express/body-parser ecosystem updates
- **Total of 1,679 transitive deps** is large but manageable with disciplined patching

### Recurring CVE Patterns (Watch List)
- **Express middleware DoS issues**: body-parser (bounds), proxy-addr (spoofing), brace-expansion (expansion)
  - Root cause: Legacy Express ecosystem not hardened for adversarial input
  - Mitigation: Keep express <= latest; monitor body-parser release notes
  - Consider: Express alternatives for new projects (Fastify, Hono)
  
- **Vite/build tool path traversal**: vite fs.deny bypass, @vitest/mocker traversal
  - All dev-mode only, but can leak secrets in CI logs
  - Keep vitest < latest (major version pins)
  
- **OpenTelemetry instrumentation overhead**: Multiple CVEs in @opentelemetry/* packages
  - Instrumentation packages introduce 20+ dependencies each
  - Benefit: tracing. Cost: supply chain risk
  - Mitigation: Update @opentelemetry/sdk-node to >= 0.301.0, review auto-instrumentation necessity

- **Transitive gRPC issues**: @grpc/grpc-js crashes on malformed messages
  - Affects orchestrator + portal/Backend
  - Fix: Update to >= 1.14.5
  - Monitor: gRPC spec changes for further protocol issues

### Audit Tools & Availability
- ✅ **npm audit** — installed, works reliably in all projects
- ❌ **Go/Python/Rust tools** — not detected (no Go modules, Python, or Cargo dependencies)
- ℹ️ **license-checker** — not installed; skipped license compliance audit. Recommend: `npx license-checker --json` for next run

### License Compliance Status
- ✅ No GPL/AGPL in direct dependencies (non-viral — safe for proprietary project)
- ⚠️ Need to run `npx license-checker --json` for detailed report
- All observed direct deps use MIT/ISC/Apache-2.0/BSD — permissive licenses

### Recommended Actions for Next Audit
1. Install `license-checker` and audit licenses in full
2. After critical patches applied: re-audit all projects
3. Monitor: proxy-addr, body-parser, express release notes
4. Evaluate: switching from Vitest to Jest (more mature, fewer CVEs recently)
5. Evaluate: OpenTelemetry auto-instrumentation necessity (high dependency count)

### Files Created
- `/Teams/TheInspector/findings/DEPENDENCY-AUDIT-2026-11-08.md` — Full audit report with remediation plan

### Next Steps
- Apply critical patches within 24 hours (DEP-001, DEP-002, DEP-003)
- Run full test suite after patches
- Update pipeline state with remediation status
- Schedule follow-up audit in 7 days
