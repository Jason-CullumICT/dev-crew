# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Run 2026-08-05: Initial Comprehensive Audit

#### Critical Vulnerability Patterns Observed
1. **Build-tool vulnerabilities are widespread:**
   - Vitest ≤3.2.5: Arbitrary file read/execution in UI server (CVSS 9.8)
   - Esbuild <0.20.2: CORS bypass in dev server (CVSS 6.8)
   - These are development-time, but can compromise source code in shared/container environments

2. **Template engine vulnerabilities (Handlebars) show multiple code-injection vectors:**
   - 8 separate CVEs across versions ≤4.7.8 (5 HIGH, 2 CRITICAL, 1 LOW)
   - All related to AST type confusion and prototype pollution
   - **Watch list:** Any project using handlebars should be on continuous monitoring

3. **Buffer management issues in utility libraries:**
   - uuid <11.1.1: Missing bounds check (CVSS 7.5)
   - Indicates broader pattern: utility libraries often have security blind spots
   - **Watch list:** Review uuid, form-data, body-parser versions in each new project

#### Dependency Landscape Insights
- **Backend:** 402 total deps (4 direct prod); heavy on TypeScript/Jest ecosystem
- **Frontend:** 230 total deps (3 direct prod); heavy on Vite/Vitest/React ecosystem
- **Portal/Backend:** 578 total deps (397 direct prod) — **HIGHEST RISK** — large surface area
- **E2E:** Clean (4 total, Playwright only)

#### Tool Availability in This Environment
- `npm audit --json` ✅ Available, reliable, current
- `npm outdated --json` ✅ Available
- `npm list --depth=N` ✅ Works
- `npx license-checker` ⚠️ Not tested (likely available)
- `govulncheck` (Go) — Not applicable (no Go projects detected)

#### Priority Watch List (Recurring Issues)
1. **handlebars** — 8+ CVEs, all code injection related
2. **vitest/vite/esbuild** — Nested dev-time vulnerabilities
3. **ws** — DoS via fragmentation (memory exhaustion)
4. **uuid** — Active buffer overflow CVE
5. **express/body-parser/qs** — Request handling DoS vectors

#### Remediation Decisions Made
- **Major version upgrades:** uuid, vitest, react-router-dom require major bumps (breaking changes)
- **Express v5 migration:** Approved for Backend (blocking on planning)
- **React v19 migration:** Approved for Frontend (non-blocking; check v19 compatibility with React-Router-DOM v7)

#### Next Run Recommendations
- After Phase 1 remediation (critical vulns): Re-run full audit to verify zero P1 findings
- Add periodic check: `npm outdated` in CI/CD to catch drift
- Consider policy: "No package >1 major version behind unless documented exception"
- License compliance check: Run `npx license-checker` on Backend/Frontend to flag GPL/AGPL deps
