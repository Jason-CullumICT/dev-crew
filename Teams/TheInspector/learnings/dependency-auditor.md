# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-09

### Critical Findings (P1)
1. **handlebars@4.0.0-4.7.9** — 11 CVEs for JS Injection/XSS via AST Type Confusion
   - **Watch list:** handlebars has recurring injection vulnerabilities
   - **Decision:** Upgrade immediately to ≥4.8.0; consider removing if possible (used by argparse/yaml parsing?)
   
2. **proxy-addr@1.1.0-2.0.7** — IP spoofing via IPv4-mapped IPv6 subnets
   - **Decision:** Upgrade to ≥2.0.8; critical for Express.js services trusting X-Forwarded-For
   
3. **tinypool + vitest** — Prototype Pollution RCE
   - **Decision:** Upgrade vitest to ≥5.0.3 (handles both tinypool fix and vitest critical CVE)

4. **uuid@9.0.1** — Buffer bounds check missing
   - **Decision:** Upgrade to ≥11.1.1; low exploitability but high impact if user-supplied buffers used

### Major Version Upgrades Needed
- express: 4→5 (breaking)
- pino: 8→10 (2 major versions)
- jest: 29→30 (breaking, high CVE count)
- react: 18→19 (breaking)
- react-router-dom: 6→7 (breaking, has open redirect CVE)

**Recommendation:** Batch Phase 1 upgrades (immediate), Phase 2 (1 week with testing), Phase 3 (1 month).

### Audit Tools Available
- `npm audit --json` ✅ Available
- `npm outdated --json` ✅ Available
- `license-checker` ❌ Not installed
- **Workaround:** Extract licenses from package-lock.json via jq (partial visibility)

### Project Notes
- **E2E project** has minimal dependencies (4 total) — good practice
- **Portal Backend** has 397 prod dependencies (unusually high) — recommend audit
- **No post-install scripts** detected in main packages (good)
- **Supply chain surface:** 1,650+ transitive dependencies across all projects
- **Duplicate versions:** None detected (healthy)

### License Compliance Status
- Predominant license: MIT
- No GPL/AGPL detected (no viral license risk)
- Recommendation: Run `npx license-checker` after `npm install` for full visibility

### Cross-Team Escalations
- **[ESCALATE → red-teamer]** handlebars JS Injection, proxy-addr IP spoofing
- **[ESCALATE → TheFixer]** jest upgrade (breaking change), express upgrade (breaking change)
