# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Results (2026-09-07)

### Critical Findings Summary
- **5 Critical CVEs** found across 6 workspaces
- **56 total vulnerabilities** across all projects
- **Source/E2E only workspace with zero vulnerabilities** (uses only @playwright/test)

### Watch List (Recurring Vulnerabilities)
1. **vitest** — Multiple CVE history (critical RCE in <3.2.6, medium/high in earlier versions)
   - Recommendation: Keep within 1-2 minor versions of latest
   - Current status: Source/Frontend & portal/Frontend at ^2.0.5 (3+ majors behind)

2. **protobufjs** — Critical code execution vulnerability (GHSA-xq3m-2v4x-88gg)
   - Recommendation: Audit each use; prefer latest 7.x or consider alternatives
   - Current status: platform/orchestrator affected via gRPC ecosystem

3. **uuid** — Buffer overflow when buf parameter used in v3/v5/v6 (GHSA-w5hq-g745-h8pq)
   - Current versions: Source/Backend@9.0.0 (5 majors behind), platform/orchestrator@9.x
   - Recommendation: Enforce >=11.1.1 across all workspaces

4. **@opentelemetry/** ecosystem — Multiple cascading vulnerabilities
   - Components: @opentelemetry/core, @opentelemetry/sdk-node, auto-instrumentations-node
   - Issue: Unbounded memory in baggage parsing, Prometheus exporter DoS
   - Recommendation: Upgrade as a group, not individually

5. **vite & esbuild** — Dev server path traversal & CORS bypass vulnerabilities
   - Common in React projects; coordinate with Source/Frontend updates

### License Compliance Status
- ✅ **No GPL/AGPL viral licenses detected** in dev-crew project
- ✅ All major dependencies use standard licenses (MIT, Apache-2.0, ISC, BSD)
- No legal review needed for license conflicts

### Build Tool CVE Pattern
- **vite** (^5.4.0): HIGH CVE on Windows path traversal (dev-only)
- **vitest** (^2.0.5): CRITICAL RCE via UI server (dev-only, but CVSS 9.8)
- Pattern: Development tools have higher update velocity; recommend weekly checks

### Supply Chain Risk Assessment
- ✅ No abandoned packages in use
- ✅ No single-maintainer high-risk packages in critical dependency set
- ✅ All packages have >100k weekly npm downloads (mature ecosystem)
- ⚠️ Monorepo structure with 10 workspaces increases surface area — coordinate updates

### Audit Tools & Environment
- **npm audit**: Successfully runs in each workspace directory
- **npm outdated --json**: Provides current vs wanted vs latest versions
- **Environment**: Linux, Node.js runtime available, npm3+ lockfile format

### Recommendations for Next Audit (1 Month)
1. Prioritize vitest/vite updates to latest stable (5.x+)
2. Audit protobufjs usage: Is gRPC actually needed? Consider feature removal if not critical.
3. Plan React v19 upgrade for Source/Frontend (major version jump)
4. Create dependency update automation: `npm audit fix` in CI/CD with approval gate
5. Track: Do any workspaces expose dev servers (vitest UI, vite dev) to non-local networks?

### Notes for TheGuardians (Security Team)
- vitest UI server RCE is **not exploitable in production** if vitest only runs in CI/CD
- Confirm vitest UI server is never accessed outside development environment
- protobufjs code execution requires parsing untrusted .proto files — audit attack surface
- Recommend: Block vitest UI server access via firewall rules in CI/CD infrastructure

## Learnings

_(See Audit Results above for latest findings)_
