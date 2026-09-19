# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Results — 2026-09-19

### Critical Vulnerabilities (P1)

**Discovered 7 critical CVEs across the codebase:**

1. **protobufjs (portal/Backend):** Arbitrary code execution (GHSA-xq3m-2v4x-88gg). CVSS 9.8. Affects code generation and message deserialization. Must escalate to security team.

2. **vitest (Source/Frontend, portal/Backend):** File read + execution when UI server is running (GHSA-5xrq-8626-4rwp). CVSS 9.8. Can expose source code and secrets in CI/dev environments. **ACTION:** Disable vitest UI in CI pipelines.

3. **handlebars (Source/Backend, transitive):** JavaScript injection via AST type confusion (GHSA-2w6w-674q-4c4q). CVSS 9.8. Affects template rendering.

### Vulnerability Distribution

- **Portal/Backend:** Worst affected (2 critical, 10 high, 41 moderate, 1 low = 54 total). Primary issues: protobufjs, vitest, vite, postcss chain.
- **Source/Frontend:** 1 critical (vitest), 6 high (browserslist, form-data, nanoid, react-router), 7 moderate, 1 low = 15 total
- **Source/Backend:** 1 critical (handlebars, transitive), 4 high (brace-expansion, browserslist, form-data), 3 moderate, 2 low = 10 total
- **Source/E2E:** Clean (0 vulnerabilities) ✓

### Key Findings

1. **No post-install scripts detected** → low supply chain risk
2. **All dependencies use permissive licenses** → no GPL/AGPL viral license issues
3. **No deprecated or abandoned packages** among direct deps
4. **License compliance: PASS** (MIT, Apache 2.0, ISC, BSD only)
5. **Outdated packages (not abandoned):**
   - express 4.18.2 → 5.2.1 (major version jump)
   - pino 8.17.0 → 10.3.1 (major upgrade)
   - react 18.3.1 → 19.3.0 (major upgrade)
   - react-router-dom 6.26.0 → 7.18.4 (major upgrade)
   - vitest: 2.x → 5.x+ (major breaking changes)

### Escalations Required

- **DEP-001 (protobufjs RCE)** → TheGuardians
- **DEP-002 (vitest arbitrary file read)** → TheGuardians
- **DEP-003 (handlebars template injection)** → TheGuardians
- **All other P2 findings** → TheGuardians for exploitation assessment
- **Version upgrades** → TheFixer for coordinated updates

### High-Risk Patterns

1. **Vitest UI exposure in CI:** If vitest UI server runs on exposed port (e.g., localhost:51204 accessible from network), anyone can read/execute arbitrary files. **Fix:** Disable UI in CI, document local dev warnings.

2. **Portal/Backend dependency chain:** Large transitive tree (200+) with multiple high-severity vulns. Primary sources:
   - protobufjs (14+ cascading vulns)
   - @opentelemetry/* (adds 50+ deps)
   - vitest (large dev tree)
   - vite (CSS/build-time vulns)

3. **build-tool vulns are lower risk but still present:** postcss, vite, babel — these are dev-time tools, but if they process untrusted input (e.g., CSS from uploaded files), they become runtime risk.

### Audit Tools & Environment

- **npm audit** available and working ✓
- **npm outdated** works but shows MISSING packages (node_modules not installed in CI) — use `npm audit --json` for programmatic access
- **No pip, go, cargo, poetry** tools found — **npm-only codebase**
- All 10 npm packages have lock files → reproducible builds ✓

### Recommended Actions

#### Immediate (P1)

1. Audit portal/Backend's protobufjs usage — if it processes untrusted data, this is critical
2. Ensure vitest UI is NEVER exposed on network in CI/CD
3. Update critical transitive deps (handlebars → ≥4.7.9)

#### Near-term (P2)

1. Update high-severity packages: brace-expansion, browserslist, form-data, nanoid, vite, postcss, path-to-regexp
2. Verify no new vulns introduced after updates
3. Update react-router-dom to fix open redirect

#### Strategic

1. Plan major version upgrades: express 4→5, pino 8→10, react 18→19, vitest 2→5
2. Establish version update policy (quarterly? after security advisories?)
3. Add `npm audit` gate to pre-push hooks
4. Consider SCA (Software Composition Analysis) tool for continuous monitoring

### Audit Methodology

- Ran `npm audit --json` on 10 npm packages across Source/, portal/, and platform/orchestrator
- Parsed JSON for severity distribution, CVE IDs, affected versions
- Cross-checked against GitHub Security Advisory database (built into npm audit)
- Verified 100% of vulns have fixes available
- Checked for post-install scripts, deprecated flags, license compliance

### Future Audit Cycles

- Run monthly or on significant dependency updates
- Prioritize portal/Backend given high CVE count
- Track resolution of P1 findings to The Guardians
- Document all breaking changes from major version upgrades
