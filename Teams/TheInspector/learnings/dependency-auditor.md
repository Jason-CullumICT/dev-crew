# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Critical Patterns (2026-08-12)

**Vitest UI Server Exposure**
- Vitest versions <3.2.6 expose UI server listening on dev ports by default
- When exposed externally, arbitrary files can be read and executed (CVSS 9.8, RCE)
- Watch list: Ensure vitest is always ≥3.2.6 in all projects
- Mitigation: Disable UI in CI/production, restrict dev server to localhost

**Handlebars RCE Storm**
- Handlebars 4.0.0–4.7.8 has 8 distinct RCE/injection CVEs
- Each vector can bypass sandbox protections
- This is a stable/long-term package that required emergency patching
- Recommendation: Always update handlebars to latest (currently 4.7.9+)
- No known breaking changes on patch updates

**Protobufjs Code Execution**
- Transitive dependency in OpenTelemetry ecosystem (portal/Backend)
- CVSS 9.8 RCE when parsing untrusted .proto files or JSON
- Affects gRPC and microservice-heavy architectures
- Keep on watch: OpenTelemetry packages pull in protobufjs

### Watch List (Recurring CVE Patterns)

| Package | Pattern | Recommendation |
|---------|---------|-----------------|
| `vitest` | Dev server security | Always within 1 minor version of latest |
| `handlebars` | Template injection RCE | Always latest |
| `protobufjs` | Deserialization RCE | Always latest; document proto sources |
| `postcss` | ReDoS in CSS parsing | Stay current |
| `vite` | Dev server SSRF | Always within 1 minor version |
| `brace-expansion` | DoS via glob | Always latest |
| `uuid` | Commonly outdated | Update on major version releases |

### Environment-Specific Risks

- **Development:** Vitest UI, Vite server exposure are high-risk if not isolated to localhost
- **CI/CD:** Protobufjs, js-yaml parsing untrusted inputs; ensure safe mode
- **Production:** Express, body-parser, qs injection attacks; ensure latest patches

### License Decisions

- ✅ All direct dependencies use MIT, Apache 2.0, ISC, or BSD
- ✅ No GPL/AGPL conflicts detected
- ✅ OpenTelemetry ecosystem is Apache 2.0 (safe for commercial use)

### Available Audit Tools

- ✅ `npm audit --json` works reliably for npm packages
- ✅ `npm outdated --json` provides version status
- ✅ `npm ls --depth=0` shows direct dependencies
- ❌ `npx license-checker` requires install; fallback to manual package.json audit
- ⚠️ `govulncheck` not present; Go modules not scanned yet

### Tech Stack Insights (2026-08-12)

- **Backend:** Express + Pino + Prometheus
  - Minimal dependencies (9 direct)
  - Transitive explosion at 412 packages (not yet analyzed)
  
- **Frontend:** React 18 + React Router 6 + Vite
  - 3 direct dependencies, 231 transitive
  - Ready to upgrade to React 19 + Router 7 (separate initiative)
  
- **E2E:** No known vulnerabilities
  
- **Portal:** Heavy OpenTelemetry instrumentation
  - 577 transitive dependencies
  - Recommend consolidation review
  
- **Platform:** Orchestrator is self-contained
  - 155 direct + transitive
  - Good isolation

### Next Audit Recommendations

1. **Go modules** (if present) — run `govulncheck` scans
2. **Python** (if present) — run `pip-audit`
3. **Abandoned packages** — check GitHub repo activity for long-unmaintained deps
4. **Dependency duplication** — identify multiple major versions of same package
5. **Supply chain** — trace post-install scripts, verify maintainer legitimacy

---

**Last Updated:** 2026-08-12  
**Next Review:** 2026-08-26
