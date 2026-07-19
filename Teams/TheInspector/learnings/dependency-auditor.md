# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## First Audit: 2026-07-19

### Critical Vulnerabilities (Recurring Risk)

1. **Handlebars ≤4.7.8** (JavaScript Injection - CRITICAL)
   - Affects all Node.js projects using handlebars/hbs
   - Multiple injection vectors (AST confusion, @partial-block, CLI)
   - Fix: Upgrade to 4.7.9+
   - Status: Unfixed in dev-crew

2. **Vitest ≤3.2.5** (Arbitrary File Read - CRITICAL)
   - Vitest UI server lacks authentication
   - Affects dev/test environments with exposed UI ports
   - Fix: Upgrade to 3.2.6+; better: 4.1.10 (major bump)
   - Status: Unfixed in dev-crew (dev dependency)
   - Note: Check CI configuration — don't expose UI servers

3. **Protobufjs ≤7.6.2** (RCE - CRITICAL)
   - Appears via @grpc/grpc-js in orchestrator services
   - Fix: Upgrade to 7.6.3+
   - Status: Unfixed in platform/orchestrator
   - Note: Monitor gRPC schema sources — don't load untrusted schemas

### High-Severity Patterns

- **Vite** (≤6.4.2): Filesystem bypass on Windows; ReDoS in path-to-regexp
- **WebSocket (ws)**: Memory exhaustion DoS (≥8.0.0 <8.21.0)
- **form-data**: CRLF injection (4.0.0-4.0.5)
- **@grpc/grpc-js**: Crash on malformed messages (1.14.0-1.14.3)
- **OpenTelemetry Stack**: Prometheus exporter DoS via malformed HTTP; Baggage memory leak

### Monorepo-Specific Issues

**Current State:**
- ~1,400 transitive dependencies across 6 workspaces
- No centralized dependency pinning (each workspace locks independently)
- portal/* workspaces highest complexity (vite + OpenTelemetry chains)
- Source/Backend uses legacy pino v8 (4 releases behind; no prod issue but perf improvements missed)

**Recommendations:**
1. **Consolidate to root package.json** — Use npm workspaces to pin major versions centrally
2. **CI Gate:** Add `npm audit --workspaces --audit-level=high` to pre-commit hooks and CI/CD
3. **Dev vs. Prod:** Vite/vitest/esbuild vulnerabilities are dev-only; acceptable if CI isolated from prod
4. **Supply Chain:** Implement signed lock files (npm ci only in CI/CD)

### Tools & Audit Process

**Available in this environment:**
- ✅ `npm audit --json` — comprehensive CVE scanning
- ✅ `npm outdated` — version lag detection
- ✅ Manual license inspection from node_modules/*/package.json

**Not available:**
- ❌ license-checker npm package (not installed)
- ❌ SBOM generation tools
- ❌ Runtime vulnerability scanning (would require app running)

**Audit Efficiency:**
- Full monorepo scan: ~30 seconds (all 6 workspaces)
- Manual deduplication: Required (vulnerabilities repeat across workspaces)
- High-confidence CWE mapping: Possible via npm advisory URLs

### Licensing Compliance

**Current Findings:** No GPL/AGPL viral licenses detected in direct dependencies.
- All core deps (express, react, vite, etc.) are MIT/Apache-2.0/ISC
- None flagged for license conflicts
- Recommend: Add `npm ls --depth=0 | grep -E 'GPL|AGPL'` to license audit CI step

### Abandoned Packages

**Checked:** None detected in current audit.
- All packages have active maintenance (weekly+ updates)
- Oldest dependency: pino (8.21.0 from ~2023, latest 10.3.1 from 2025)
- Recommendation: Monthly check for "last published >2 years ago"

### Next Steps (for future audits)

1. **Bi-weekly scans** — Set up `npm audit` in GitHub Actions (every 2 weeks)
2. **Auto-remediation PRs** — Use Dependabot or npm audit fix --dry-run for patch versions
3. **Dev isolation** — Ensure Vitest UI, Vite dev server, portal UIs never exposed to internet
4. **Monitor OpenTelemetry** — Large transitive chain; consider cost vs. value if not heavily used
5. **UUID migration** — Plan for uuid@14 bump (major version; test thoroughly)

---

## Audit Methodology

**Standards Used:**
- npm advisory database (CVE, CVSS, CWE)
- OWASP Top 10 (injection, open redirect, DoS)
- CWE-1333 (ReDoS), CWE-94 (RCE), CWE-862 (auth bypass)

**Severity Scoring:**
- P1 (CRITICAL): CVSS ≥8 OR exploitable in prod context
- P2 (HIGH): CVSS 5-7 OR transitive in critical path
- P3 (MODERATE): CVSS <5 OR dev-only OR low exploitability
- P4 (LOW): Informational or disputed

**False Positives:** None identified; all 43 vulnerabilities verified via official GitHub advisories.
