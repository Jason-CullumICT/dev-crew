# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-08-15

#### Critical Issues Identified
1. **vitest CRITICAL vulnerabilities** (portal/Frontend, portal/Backend)
   - Caused by transitive protobufjs CRITICAL
   - Action: Major version update to v2.0.5+ required
   - Decision: Schedule for this week

2. **Handlebars RCE vulnerability** (Source/Backend)
   - JavaScript injection via @partial-block tampering
   - CVSS 8.1
   - Likely transitive via body-parser or express
   - Action: Trace dependency chain and update to 4.7.9+

3. **OpenTelemetry instrumentation crash chain** (portal/Backend)
   - Multiple HIGH severity advisories in auto-instrumentations-node and sdk-node
   - Prometheus exporter can crash on malformed requests
   - Action: Update to v0.79.0+ for auto-instrumentations-node

#### High-Risk Dependencies to Watch
- **Vite** (v5.x): fs.deny bypass on Windows (dev environment risk)
- **@grpc/grpc-js**: Server crash on malformed requests (v1.14.4+ required)
- **form-data**: CRLF injection in multipart handling
- **brace-expansion**: DoS via exponential expansion (glob issue)
- **js-yaml**: Quadratic DoS via merge key aliases

#### Outdated Packages Requiring Major Version Bumps
- React ecosystem: 18.x → 19.2.8 (1 major behind)
- React Router: 6.30.4 → 7.18.2 (1 major behind)
- Express: 4.22.2 → 5.2.1 (1 major behind)
- Multer: 1.4.5 → 2.2.0 (LTS to current)

#### License Compliance
✅ **PASS** — No GPL/AGPL viral licenses detected. All dependencies use MIT, Apache-2.0, or proprietary.

#### Supply Chain Risk Assessment
✅ **LOW RISK** — Verified:
- No suspicious post-install scripts
- No single-maintainer critical packages
- No recent ownership transfers
- Download counts normal for each package

#### Portal/Frontend Risk Level: CRITICAL
- 55 total vulnerabilities (most of any project)
- 1 CRITICAL direct dependency (vitest)
- 2+ HIGH direct dependencies (postcss, vite)
- 800 transitive dependencies

**Recommendation:** Isolate portal/Frontend from production traffic until critical deps updated.

#### Source/E2E Risk Level: CLEAN ✅
- Zero vulnerabilities
- 4 dependencies only
- Minimal attack surface

#### Tool Observations
- `npm audit` works reliably across all projects
- `npm outdated` correctly identifies major version lags
- Some transitive vulnerabilities require manual investigation (e.g., handlebars location)

#### Action Items for Next Audit
1. Verify OpenTelemetry updates didn't introduce regressions
2. Track React ecosystem upgrade timeline
3. Check if Express v5 upgrade is viable (breaking changes expected)
4. Monitor handlebars for patches beyond 4.7.9
