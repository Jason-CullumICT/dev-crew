# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-25

### Critical Findings Watch List

**IMMEDIATE ESCALATION REQUIRED:**
1. **handlebars** — Multiple CRITICAL JavaScript injection CVEs (GHSA-2w6w-674q-4c4q, GHSA-p8wg-vrv2-v86f) in Frontend
   - Affects: Template compilation and partial block processing
   - Action: Upgrade to ^4.7.10+ immediately
   
2. **proxy-addr** — CRITICAL IP spoofing (GHSA-jqcg-44mw-7w3h, CVSS 9.1)
   - Affects: Access control checks in Backend and Orchestrator
   - Action: Upgrade to 2.0.8+ immediately
   
3. **vitest** — CRITICAL arbitrary file read (GHSA-5xrq-8626-4rwp, CVSS 9.8)
   - Affects: Frontend test infrastructure (UI server)
   - Action: Upgrade to ^5.1.1 (major version bump)
   - WARNING: Do NOT use vitest UI on networked dev machines
   
4. **tinypool** — CRITICAL RCE via prototype pollution
   - Affects: Frontend (via vitest)
   - Action: Upgrade vitest to ^5.1.1 (upgrades tinypool transitively)
   
5. **protobufjs** — CRITICAL code execution (GHSA-xq3m-2v4x-88gg, CVSS 9.8)
   - Affects: Orchestrator gRPC handling
   - Action: Upgrade to ^7.6.5+ immediately

### Outdated Majors (Priority Upgrades)

**P2 Risk (2+ majors behind):**
- `uuid`: 9.0.1 → 14.0.3 (5 majors!) — Has CVE, used for all IDs
- `pino`: 8.21.0 → 10.4.0 (2 majors) — Logger, security fixes
- `vite`: 5.4.0 → 8.3.8 (3 majors) — Build tool, path traversal vulns

**P3 Risk (1 major behind):**
- `express`: 4.18.2 → 5.3.0
- `react`: 18.3.1 → 19.3.1
- `react-dom`: 18.3.1 → 19.3.1
- `react-router-dom`: 6.30.6 → 7.18.7 (has open redirect CVE)

### Dependency Tree Size Issues

- **Backend**: 411 transitive dependencies (very large surface area)
- **Frontend**: 230 transitive dependencies (significant)
- **Orchestrator**: 155 transitive dependencies
- **No node_modules installed yet** in Backend/Orchestrator — masks transitive vulns

### Post-Install Script Policy

No explicit `--ignore-scripts` policy detected. Recommend:
- Use `npm ci --ignore-scripts` in CI/CD by default
- Whitelist only essential post-install scripts
- Document rationale for each allowed script

### License Compliance

**Status:** No explicit license scan performed yet. 
- No GPL/AGPL detected by preliminary analysis
- Recommend: `npx license-checker --json` after installing deps

### Available Audit Tools

- **npm audit** ✅ Available and working
- **npm outdated** ✅ Available
- **npm license-checker** ⚠️ Not pre-installed; requires `npx`
- **govulncheck** ❌ Not applicable (no Go packages)
- **pip-audit** ❌ Not applicable (no Python packages)

### Recommendations for Next Audit

1. **Install dependencies before auditing** — Run `npm ci` in all workspaces to surface transitive vulns
2. **Run license audit** — `npx license-checker --json` after install
3. **Check for duplicate major versions** — `npm ls {package}` after large upgrades
4. **Establish upgrade schedule** — Monthly audits minimum
5. **Document breaking changes** — Track major version compat when upgrading core deps

### Known Breaking Changes (Anticipated)

- **uuid@11+ → 14+**: API changes in esm/commonjs exports
- **vite@5+ → 8+**: Config API changes, requires vite.config.ts updates
- **pino@8+ → 10+**: Log format changes, breaking serializer API
- **react@18+ → 19+**: Potential component lifecycle changes (review docs)
- **express@4+ → 5+**: Middleware signature changes (review docs)

### Cross-References

- **[ESCALATE → TheGuardians]**: 6 critical findings (handlebars, proxy-addr, vitest, tinypool, protobufjs, vite launch-editor)
- **[ESCALATE → TheFixer]**: 7 high-severity vulns requiring urgent patching
- **[ESCALATE → quality-oracle]**: Large transitive tree suggests need for SCA tooling integration
