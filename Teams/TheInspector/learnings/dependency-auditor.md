# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-05-15

### Critical Findings

**Handlebars (Source/Backend)**
- Frequent JavaScript injection CVEs (8 disclosed in this audit)
- Affects jest/build tooling indirectly
- Watch for: New template engine vulnerabilities; this library has a pattern of AST injection issues
- Recommendation: Monitor GitHub releases; pin to latest patch version

**Protobufjs (platform/orchestrator)**
- Recent spate of critical RCE + prototype pollution CVEs (9 total in this audit)
- Used in Docker API abstraction (dockerode)
- Watch for: This is infrastructure-critical — any CVE blocks deployments
- Recommendation: Add to alert list; consider weekly scan of protobufjs releases

### Package Ecosystem Observations

**npm Ecosystem Health:**
- 799 total transitive dependencies (reasonable for a multi-app Node.js project)
- No post-install scripts detected (✅ good supply chain practice)
- No abandoned packages identified
- Major version updates available for 5+ packages (standard maintenance)

**Known Vulnerable Library Patterns:**
1. **Vite ecosystem** (vite → vitest → @vitest/mocker → vite-node) — chains of vulnerabilities
   - Recommend: Update all at once; test integration thoroughly
   
2. **Build toolchain security** (esbuild, postcss, handlebars)
   - Recommendation: Regularly scan build dependencies; they're often overlooked
   
3. **Infrastructure packages** (protobufjs, path-to-regexp)
   - Recommendation: These block deployments; treat as P0

### Audit Tools & Commands

**Tools Available:**
```bash
npm audit --json          # Primary CVE scanner
npm outdated --json       # Version staleness
npm ls                    # Dependency tree (text)
npm ls --json             # Dependency tree (JSON)
```

**Not Available:**
- `npm audit fix` may auto-fix some issues (check if supported)
- `license-checker` — npm provides license data in audit output already

### Recommendations for Future Audits

1. **Frequency:** Monthly for critical (orchestrator, backend); quarterly for others
2. **Escalation triggers:**
   - Any P1 (critical) CVE → immediate escalate to TheGuardians
   - Any P0 in platform/ → hotfix required before next deploy
3. **Cross-team coordination:**
   - Notify quality-oracle if outdated deps affect test coverage
   - Notify performance-profiler if version updates claim perf improvements
4. **License tracking:**
   - Document any custom license decisions (e.g., "decided to use GPL-incompatible X because...")
   - This prevents repeating license discussions

### Watch List

**Packages requiring close monitoring:**
- `handlebars` — history of AST injection issues
- `protobufjs` — critical infrastructure; recent spike in CVEs
- `vite` / `vitest` — fast-moving; updates monthly

---

_Last updated: 2026-05-15_
