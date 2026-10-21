# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-10-21

### Critical Findings (P1)
1. **Vitest + Tinypool RCE chain** — vitest is a direct dependency in Portal projects with critical vulnerabilities (GHSA-5xrq-8626-4rwp: arbitrary file read when UI server running). Tinypool (transitive via vitest) adds prototype pollution RCE.
   - **Action:** Upgrade vitest to >=3.2.6 or >=4.1.11 across all projects
   - **Watch:** Vitest maintains UI server by default in dev mode; consider disabling in CI

2. **Proxy-Addr IP spoofing** — IPv4-mapped IPv6 bypass (GHSA-jqcg-44mw-7w3h) affects Source/Backend and Portal/Backend
   - **Blocks:** Access control, rate limiting, geolocation checks
   - **Action:** Update proxy-addr; audit code using `req.ip` for trust decisions

3. **Protobufjs arbitrary code execution** — Portal/Backend pulls this via OpenTelemetry gRPC exporters (GHSA-xq3m-2v4x-88gg)
   - **Watch:** Check OpenTelemetry release notes before upgrading

### High-Severity Patterns
- **Jest cascading vulns:** Portal/Backend has 46 moderate + 10 high from old Jest (`<30.5.2`). Jest dependency tree is wide; jest-message-util affects all @jest/* packages.
- **Build tool chain gaps:** PostCSS, Vite, esbuild have multiple path traversal and dev-server bypass CVEs. Frontend build pipeline is weak point.
- **Brace-expansion DoS:** 7 separate DoS CVEs in transitive dependency; affects glob/minimatch usage in build scripts.

### Outdated Packages Watch List
- React 18 (3 major versions behind 21.x; backend should upgrade)
- React Router 6 (open redirect vulnerabilities; upgrade to 7.x)
- Express ecosystem packages 1-2 years old in Source/Backend

### Audit Tools & Environment
- **npm audit** — Works perfectly; JSON output reliable for parsing
- **npm outdated --json** — Works for version tracking
- **license-checker** — Available via npx; recommend adding to CI pipeline
- **No Go/Python/Rust packages** in this codebase; all npm/Node.js

### Recommendations for Future Audits
1. Add renovate or dependabot to automate weekly updates
2. Set up GitHub branch protection rule: "block merge if npm audit finds critical/high"
3. Prune OpenTelemetry instrumentation plugins in Portal/Backend (20+ packages)
4. Consider vitest alternative if upstream doesn't patch UI server quickly
5. Run license-checker in CI to catch GPL dependencies early

### Portal vs. Source Grade Delta
Portal projects are significantly worse (F vs. C grading):
- Portal/Backend: 61 vulns (4 critical) — primarily jest + opentelemetry
- Portal/Frontend: 23 vulns (2 critical) — vitest + build tools
- Source/Backend: 42 vulns (2 critical) — baseline dependencies
- Source/Frontend: 17 vulns (2 critical) — build tools + React ecosystem

**Hypothesis:** Portal is instrumented with heavier telemetry stacks and uses vitest directly. Source apps use jest (which is also problematic but less directly exposed).

### Learnings
1. **Direct vs. transitive matters:** Vitest (direct, Portal) is worse than Jest (transitive, deep in Portal/Backend)
2. **Dev-only doesn't mean safe:** Vitest UI server can read production source if run in staging/prod for debugging
3. **Supply chain width:** 1,280+ transitive dependencies creates audit surface; prioritize high-impact updates
4. **Open redirect chains:** React Router + Remix Router vulnerabilities compound; both need updates in lockstep
