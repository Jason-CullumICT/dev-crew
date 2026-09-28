# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-28

### Critical Packages to Monitor
1. **protobufjs** — 9 CVEs including arbitrary code execution (RCE)
   - Used in: portal/Backend, platform/orchestrator
   - Action: Requires urgent patching; if deserializes untrusted data, P1 risk
   - Recommendation: Consider alternative protobuf libraries or restrict usage

2. **handlebars** — 8 CVEs related to JS injection, XSS, prototype pollution
   - Used in: Source/Backend
   - Action: Review if user-supplied templates are processed
   - Recommendation: If used, patch immediately; otherwise consider deprecating

3. **postcss** — 4 CVEs including XSS and arbitrary .map file disclosure
   - Used in: Source/Frontend, portal/Backend
   - Issue: sourceMappingURL processing without validation
   - Recommendation: Restrict sourceMappingURL to trusted sources

### Findings by Workspace

#### Source/Backend
- **Status:** Moderate risk (handlebars critical, other transitive)
- **Top Issue:** Handlebars (1 critical)
- **Next Steps:** Run `npm audit fix`; audit handlebars usage in code

#### Source/Frontend
- **Status:** Moderate risk (high build-tool vulnerabilities)
- **Top Issues:** postcss, nanoid, react-router (open redirect)
- **Next Steps:** Run `npm audit fix --force` (vitest/vite breaking); test thoroughly

#### Source/E2E
- **Status:** Clean (0 vulnerabilities)
- **No Action Needed**

#### portal/Backend
- **Status:** HIGH RISK (54 CVEs including 2 critical protobufjs)
- **Top Issues:** protobufjs RCE, form-data injection, path-to-regexp ReDoS
- **Next Steps:** Urgent: patch protobufjs; run full audit fix suite

#### portal/Frontend
- **Status:** Moderate risk (similar to Source/Frontend)
- **Top Issues:** postcss, nanoid, react-router
- **Next Steps:** Run `npm audit fix --force`; coordinate with Source/Frontend updates

#### platform/orchestrator
- **Status:** HIGH RISK (8 CVEs including 1 critical protobufjs)
- **Top Issues:** protobufjs RCE, form-data injection
- **Next Steps:** Urgent: patch protobufjs; run `npm audit fix --force`

### Patterns Detected

1. **Transitive Vulnerabilities Dominate**
   - Most CVEs are in transitive dependencies (not direct)
   - Difficult to fix without auditing entire dependency tree
   - Recommendation: Use `npm audit` in pre-commit hooks

2. **Build-Tool Chain Risks**
   - esbuild, vite, vitest, browserslist have repeated CVEs
   - Affect dev environment; can leak source code via sourceMappingURL
   - Recommendation: Isolate dev dependencies; scan build outputs

3. **Outdated Major Versions**
   - Express (v4 → v5), Pino (v8 → v10), React (v18 → v19)
   - Missing security patches and performance improvements
   - Recommendation: Establish quarterly update cadence

4. **Prototype Pollution Chains**
   - browserslist, protobufjs, postcss all vulnerable to prototype pollution
   - Cascading risk if one is exploited
   - Recommendation: Add prototype pollution detection to security scans

### Recommended Tools & Automation

1. **Pre-commit Hook**
   ```bash
   npm audit --audit-level=moderate
   ```

2. **CI/CD Gate**
   ```bash
   npm audit --audit-level=high  # Fail on high/critical
   ```

3. **Dependency Update Automation**
   - Consider Dependabot or Renovate
   - Suggest: Auto-patch minor/patch, PR for major

### Package Maintenance Notes

- **npm audit output:** JSON parsing sometimes fails; use text output parsing
- **Workspace structure:** Each workspace has independent lock file; audit separately
- **Breaking changes:** `uuid`, `vitest`, `vite` have major version breaks; requires testing

### Escalations Made

1. **[ESCALATE → TheGuardians]**
   - protobufjs arbitrary code execution (portal/Backend, platform/orchestrator)
   - handlebars prototype pollution/XSS (Source/Backend)
   - postcss sourceMap information disclosure (Source/Frontend, portal/Backend)

## Learnings
