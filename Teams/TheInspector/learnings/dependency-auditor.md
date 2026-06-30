# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-06-30

#### Critical Vulnerabilities Identified
1. **handlebars (CRITICAL)** – Multiple JS injection + prototype pollution CVEs
   - Transitive dep via test tools (jasmine/karma)
   - Fix: upgrade to >=4.7.9
   - Watch: If portal ever adds template rendering, immediate escalation needed

2. **protobufjs (CRITICAL)** – Prototype pollution + ReDoS
   - Present via @opentelemetry auto-instrumentation in portal/Backend
   - Fix: @opentelemetry/auto-instrumentations-node@0.77.0+
   - Status: High priority for observability integrity

3. **vitest (CRITICAL)** – Breaking version changes across modules
   - Frontend at 2.1.9, portal/Backend at 1.2.2 (MISMATCH)
   - Fix: Synchronize to 2.1.9+ across all modules
   - Action: Update portal/Backend test runner

#### High-Risk Supply Chain Issues
- **Dependency tree:** 412–578 transitive packages per module
- **No post-install scripts:** ✓ Reduces malware vector
- **No GPL/AGPL found:** License compliance OK
- **6+ direct deps with HIGH severity CVEs:** form-data, vite, grpc-js, opentelemetry, path-to-regexp
- **Deprecated packages:** None identified (all actively maintained)

#### Major Version Gaps
- **pino:** 8.21.0 → 10.3.1 (2 major versions behind)
- **uuid:** 9.0.1 → 14.0.1 (4 major versions behind; buffer fix critical)
- **express:** 4.22.1 → 5.2.1 (available but v4.x still supported)

#### Audit Tools Confirmed
- ✓ `npm audit --json` works well across all modules
- ✓ Lock files are comprehensive and up-to-date
- ✓ `npm outdated` provides version gap visibility
- ✓ No license-checker needed (manual license scan via lock file)

#### Remediation Strategy
1. **Immediate (P1):** Upgrade handlebars, protobufjs, vitest
2. **Short-term (P2):** Fix form-data, vite, opentelemetry, uuid
3. **Medium-term (P3):** Modernize pino, consider major version bumps for react-router
4. **Ongoing:** Bi-weekly `npm audit` runs in CI/CD

#### False Positives / Non-Issues
- @babel/core low CVE: Only affects source map reading (dev-time risk, not production)
- express moderate CVE via qs: Affects only nested array parsing (validate input shapes)
- vite source map: Safe if sourcemap=false in production build (verify tsconfig.json)

#### License Compliance Decisions
- MIT/BSD/Apache licenses only → No viral GPL/AGPL risk
- Safe to use across commercial projects

#### Next Actions
- Create GitHub issue for each P1 finding
- Add `npm audit fix` to CI/CD pre-merge gates
- Implement automated vulnerability scanning (npm audit scheduler)
- Monitor handlebars usage — if ever needed, escalate to red-teamer for exploitation risk
