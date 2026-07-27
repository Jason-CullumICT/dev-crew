# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-27

### Critical CVEs Discovered

**Immediate Action Required (P1):**
1. **protobufjs <= 7.6.4** (GHSA-xq3m-2v4x-88gg)
   - Arbitrary code execution via malformed protobuf definitions (CVSS 9.8)
   - Found in: portal/Backend via @opentelemetry/auto-instrumentations-node
   - Fix: Upgrade @opentelemetry stack to 0.79.0+ / 0.221.0+
   - Watch: protobufjs has multiple CVEs; major upgrade to 7.5.5+ needed

2. **vitest <= 3.2.5** (GHSA-5xrq-8626-4rwp)
   - UI server arbitrary file read/execute (CVSS 9.8, CWE-862)
   - Found in: Source/Frontend@2.0.5, portal/Frontend@1.4.0
   - Fix: Upgrade to vitest@4.1.10+
   - Important: Disable --ui flag in dev/CI until patched

3. **handlebars <= 4.7.8** (GHSA-2w6w-674q-4c4q + 6 others)
   - Multiple JavaScript injection vectors (CVSS 9.8 critical, 8.1 high, etc.)
   - Found in: Source/Backend (transitive)
   - Fix: Upgrade to handlebars@4.7.9+

### High-Priority CVEs (P2)

**OpenTelemetry Chain (portal/Backend):**
- @opentelemetry/auto-instrumentations-node@0.40.0 → Prometheus exporter DoS (GHSA-q7rr-3cgh-j5r3)
- @opentelemetry/sdk-node@0.47.0 → Multiple OTel sub-packages need 0.221.0+
- **Blocker:** Cascading 30+ transitive dependencies, all moderate severity DoS/memory issues
- Strategy: Single version bump of @opentelemetry/* unlocks most fixes

**Vite (frontend):**
- vite@5.4.0, 5.2.0 → Path traversal + fs.deny bypass (GHSA-fx2h-pf6j-xcff, CVSS 7.5)
- Issue: Windows alternate paths bypass server.fs.deny
- Remedy: v8.1.5+ available; requires major version test
- Cross-dependency: impacts vitest updates

**PostCSS (portal/Frontend):**
- postcss@8.4.38 → File read via sourceMappingURL (GHSA-6g55-p6wh-862q, CVSS 7.5)
- XSS via unescaped </style> (GHSA-qx2v-qp2m-jg93)
- Fix: Update to 8.5.18+

**React Router (both frontends):**
- react-router-dom@6.x → Multiple open redirect variants (GHSA-2j2x-hqr9-3h42, etc.)
- SSR constructor injection (GHSA-337j-9hxr-rhxg, CVSS 6.1)
- Remedy: Upgrade to 7.18.0+; requires major version testing

### Moderate CVEs (P3)

- **uuid <= 11.0.0** (GHSA-w5hq-g745-h8pq): Buffer bounds check missing in v3/v5/v6
- **form-data <= 4.0.5** (GHSA-hmw2-7cc7-3qxx): CRLF injection in headers
- **js-yaml <= 3.14.2** (GHSA-52cp-r559-cp3m): DoS via merge key chains
- **brace-expansion <= 5.0.7** (GHSA-mh99-v99m-4gvg): OOM via unbounded expansion
- **path-to-regexp < 0.1.13** (GHSA-37ch-88jc-xwx2): ReDoS in routing
- **picomatch <= 2.3.1** (GHSA-c2c7-rcm5-vvqj): ReDoS in file globbing

### Dependency Tree Insights

**Hotspots:**
- portal/Backend: 375 transitive deps (OpenTelemetry bloat)
  - Each OTel instrumentation adds 10-15 sub-deps
  - Audit: Is every instrumentation (AWS, MongoDB, Hapi, etc.) actually used?
  - Recommendation: Use selective instrumentation if possible

- portal/Frontend: 406 transitive deps (Vite + test framework)
- Source/Frontend: 206 transitive deps

**Monorepo issue:** Package.json files have overlapping dependency trees; no workspace hoisting → duplication

### Tools & Methods

**npm audit workflow:**
- Command: `npm audit --json 2>/dev/null`
- Limitation: No license data; requires separate `npx license-checker`
- Limitation: Does not report abandoned packages; manual GitHub checks needed
- Strength: JSON output is parseable; GHSA cross-references are hyperlinked

**License Compliance:**
- Preliminary scan: MIT, Apache-2.0, ISC dominant (✅)
- No GPL/AGPL in direct deps
- Need full license-checker run before release

### Watch List (Recurring Vulnerability Patterns)

1. **protobufjs:** Code injection, DoS, recursion vulnerabilities endemic
   - Affects: Any gRPC/protobuf usage (OpenTelemetry, @grpc/grpc-js)
   - Mitigation: Keep pinned to latest 7.x; consider alternatives for new code

2. **OpenTelemetry SDK:** Rapid iteration, frequent Prometheus/OTLP exporter DoS fixes
   - Affected versions often recent (0.47.0 → 0.221.0 is 4+ months behind)
   - Mitigation: Update quarterly; monitor github.com/open-telemetry/opentelemetry-js releases

3. **js-yaml:** Parser DoS via merge keys and aliases
   - Affected: Any config parsing, CI/CD, Kubernetes manifests
   - Mitigation: Keep < 3.15.0 as minimum; prefer JSON for security-critical configs

4. **Vite:** Build tool security often overlooked; fs.deny bypasses are recurring
   - Theme: Windows path handling differences
   - Mitigation: Test on Windows; monitor Vite releases for fs security patches

5. **Vitest UI:** Arbitrary file read when UI enabled
   - Theme: Dev tool security assumptions
   - Mitigation: Disable --ui by default; enable only in local isolated environments

### Remediation Effort Estimate

**Phase 1 (Critical, this week):**
- OTel update: 2 hrs (npm audit fix + regression test)
- Vitest update: 2 hrs (update + unit test run)
- Handlebars audit: 1 hr (identify if actively used)
- Total: ~5 hrs

**Phase 2 (High, 1-2 weeks):**
- Vite upgrade: 6 hrs (major version, build config changes, testing)
- React Router upgrade: 6 hrs (major version, routing tests)
- PostCSS update: 1 hr (should be automatic via Tailwind)
- Total: ~13 hrs

**Phase 3 (Moderate, 1 month):**
- uuid, form-data, js-yaml, etc.: ~5 hrs

**Testing/verification:** 16 hrs (E2E, regression, CI)

**Total effort: ~40 hours of development + 16 hours testing**

### Recommendation for Next Audit

1. Run `npx license-checker --json` to complement audit
2. Monitor protobufjs and OpenTelemetry releases monthly
3. Consider CI integration: `npm audit` in GitHub Actions with threshold
4. Automate semver-safe updates: `npm update` in nightly build
5. Audit OTel instrumentation necessity: are all plugins used?

---

## Process Notes

- **Audit Duration:** ~15 min (npm audit on 6 main projects)
- **Report Generation:** ~30 min
- **Tools Available:** npm audit (standard), no pip-audit or govulncheck found
- **Monorepo Consideration:** Multiple package.json files require separate audits
