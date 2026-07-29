# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-29

### High-Risk Packages Identified

1. **OpenTelemetry Auto-Instrumentation Stack**
   - Package: `@opentelemetry/auto-instrumentations-node`
   - Risk: Large transitive dep tree (577 deps in Portal/Backend), multiple cascading HIGH/CRITICAL CVEs
   - Recommendation: Consider manual instrumentation of only critical paths instead of auto-instrumentation
   - Watch: Always update entire `@opentelemetry/*` stack together; pin versions to avoid version mismatches

2. **Handlebars.js**
   - Status: CRITICAL JavaScript Injection vulnerabilities in Source/Backend
   - CVE: GHSA-2w6w-674q-4c4q (CVSS 9.8 — Code Execution)
   - If used: Requires >=4.7.9
   - Replacement candidates: ETA, nunjucks, Mustache (if templating is needed)

3. **Vitest**
   - Status: CRITICAL RCE in UI server (GHSA-5xrq-8626-4rwp)
   - Current: Portal/Backend on 1.2.2; latest 4.1+
   - Major version gap: 2+ versions behind (1.x → 2.x → 3.x → 4.x)
   - Recommendation: Plan vitest 1.x → 4.x migration; breaking changes likely
   - Never expose vitest UI server to network; use `--host 127.0.0.1`

4. **Protobufjs**
   - Status: CRITICAL RCE vulnerability in Portal/Backend (transitive via gRPC)
   - CVE: GHSA-xq3m-2v4x-88gg (CVSS 9.8 — Code Execution)
   - Requires: >=7.5.5
   - Inherited via: @opentelemetry/instrumentation-grpc → gRPC → protobufjs
   - Action: Update OpenTelemetry stack; don't parse untrusted `.proto` files

5. **Brace-Expansion**
   - Status: THREE separate DoS vulnerabilities (GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg)
   - Risk: Transitive via glob/minimatch; DoS if parsing untrusted glob patterns
   - Recommendation: Update glob/minimatch to latest; validate glob patterns from user input

### Audit Tools & Environment

- **npm audit** command works well for all projects; JSON output is reliable
- **govulncheck** not used (no Go projects detected)
- **pip-audit** not used (no Python projects detected)
- **Tool Availability:** npm v10+ is available

### Supply Chain Risk Metrics

- **Threshold:** >500 transitive deps = MEDIUM risk
- **Findings:**
  - Portal/Backend: 577 transitive (MEDIUM)
  - Portal/Frontend: ~200 transitive (OK)
  - Source/Backend: ~50 transitive (OK)
- **Root Cause:** OpenTelemetry auto-instrumentation brings in:
  - `@opentelemetry/instrumentation-*` (20+ packages)
  - `@opentelemetry/resource-detector-*` (5+ packages for AWS, GCP, Alibaba Cloud)
  - gRPC, protobuf, and other observability libraries
- **Recommendation:** Evaluate necessity of each instrumentation; disable unused detectors

### License Compliance Summary

- **GPL/AGPL Risk:** None detected
- **UNLICENSED Risk:** None detected
- **License Distribution:** Mostly MIT, Apache-2.0, ISC, BSD
- **Conclusion:** All use-cases permitted for commercial SaaS

### Abandoned Package Watch List

- **better-sqlite3:** Last updated ~15 weeks ago, but actively maintained (releases every 1-2 months)
- **None detected as abandoned**

### Next Audit Actions

1. **Monthly cadence:** Re-run npm audit after security patches are released
2. **Major version planning:** Monitor vitest, vite, express for major version upgrades
3. **Transitive dep reduction:** Work with Portal/Backend team to reduce OpenTelemetry footprint
4. **Post-fix verification:** After applying patches, re-run npm audit to confirm fixes

### Traceability

- **Audit Report Location:** `Teams/TheInspector/findings/DEPENDENCY_AUDIT_2026-07-29.md`
- **Escalations:** 5× P1 findings sent to TheGuardians (RCE/DoS in critical packages)
- **Actionable Fixes:** 10+ npm update commands documented

## Learnings

_(Updated 2026-07-29 with first full audit)_
