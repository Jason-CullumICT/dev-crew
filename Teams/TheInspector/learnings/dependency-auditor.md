# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-09-27 Audit Run

#### Critical Findings
1. **Handlebars.js Code Injection (GHSA-3mfm-83xf-c92r)**
   - Appears as transitive dependency in Backend
   - Severity: Critical — arbitrary code injection via template tampering
   - Watch for templates from untrusted sources

2. **Widespread transitive CVEs in build/dev tools**
   - `@babel/core`, `postcss`, `vite`: Multiple path traversal + XSS risks (source map disclosure)
   - `browserslist`: Appears in BOTH Backend and Frontend; memory exhaustion DoS risk
   - `form-data`: Appears in BOTH; CRLF injection in multipart handling
   - Pattern: Tool dependencies (Babel, PostCSS, Vite) have high attack surface for build-time exploits

3. **Frontend-specific vulnerabilities**
   - `nanoid`: All 3 versions of initialization bugs present; RNG can be predictable
   - `@remix-run/router`: Open redirect (protocol-relative URL bypass)
   - `ws` (WebSocket): Memory disclosure + DoS in message fragments

#### Package Hygiene
- ✅ No post-install scripts detected (good signal)
- ✅ No version collisions (deduplication working)
- ✅ All licenses are permissive (MIT, Apache-2.0, ISC, BSD)
- ⚠️ 27 transitive dependencies = moderate supply chain surface

#### Outdated Major Versions
- Backend: express (4→5), pino (8→10), uuid (9→14)
- Frontend: react/react-dom (18→19), react-router-dom (6→7)
- **Note:** react-router-dom open redirect requires manual fix beyond `npm audit fix`

#### Tools Available in This Environment
- `npm audit --json` ✓ (fast, accurate)
- `npm outdated --json` ✓ (identifies major version gaps)
- `npm list --json` ✓ (dependency tree analysis)
- `npm ci` ✓ (clean install from lock file)
- `license-checker` ✓ (license compliance)

#### Next Audit Considerations
- Check if Backend actually uses Handlebars for templating (if not, risk is lower)
- Monitor for @babel/core, postcss patches (high-velocity tools)
- Schedule react/react-router-dom upgrades; breaking changes likely
- Consider pinning browserslist, form-data across workspaces (used by multiple tools)

#### False Positives to Ignore
- @babel/core, postcss severity may be inflated due to transitive usage in build tools
- @vitest/mocker is test-time only (lower priority than production deps)
