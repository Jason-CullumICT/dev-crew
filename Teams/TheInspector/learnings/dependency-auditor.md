# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-06-08

### Critical Findings

**Handlebars.js Recurring Risk:**
- Handlebars ≤4.7.8 has 8 distinct CVEs ranging from code injection to prototype pollution
- Most severe: GHSA-2w6w-674q-4c4q (CVSS 9.8) — arbitrary code execution via AST confusion
- **Watch for:** Server-side template compilation, email generation, any user-sourced template processing
- **Action:** Always keep handlebars ≥4.7.9, check lock files for transitive handlebars dependencies
- **Fix timeline:** Immediate — no workaround for RCE vulnerability

**Protobufjs Ecosystem Risk:**
- Protobufjs ≤7.5.5 has 7 distinct CVEs including arbitrary code execution (CVSS 9.8)
- Most severe: GHSA-xq3m-2v4x-88gg — prototype pollution leading to code execution
- **Watch for:** Docker integration (dockerode), gRPC services, untrusted .proto files
- **Action:** Monitor dockerode updates; test thoroughly after protobufjs upgrades
- **Dependencies at risk:** orchestrator/platform services

**Vitest Build-Time Risk:**
- Frontend dev dependencies (vitest, vite, esbuild) have multiple vulnerabilities
- Impact is dev environment only (not production), but CI/CD and local dev are compromised
- **Watch for:** CORS bypasses on localhost, source map path traversal
- **Action:** Keep vitest updated; dev environment security matters for CI/CD
- **Dependencies at risk:** Source/Frontend testing pipeline

### Version Management Insights

**Outdated Major Versions (Watch List):**
1. **express (4.x):** 1 major version behind → express 5.x exists, has breaking changes
2. **pino (8.x):** 2 majors behind → pino 10.x is faster, better structured logging
3. **uuid (9.x):** 5 majors behind → 14.x available, consider upgrade for security patches
4. **react/react-dom (18.x):** 1 major behind → react 19.x available, test before upgrade
5. **react-router-dom (6.x):** 1 major behind → 7.x available and fixes open redirect CVE

**Upgrade Strategy:**
- Don't batch major version upgrades — do one at a time with full regression testing
- Express 4→5 is high-risk (framework breaking changes) — allocate 1 day
- React 18→19 is moderate-risk (API changes) — allocate half day
- Pino 8→10 is low-risk (mostly additive) — allocate 2 hours

### License Compliance Status

**Finding:** ✓ **NO VIOLATIONS**
- All direct dependencies use MIT, ISC, or Apache 2.0
- No GPL, AGPL, or copyleft licenses found
- Safe for proprietary/commercial use
- No license compliance tooling needed yet

### Supply Chain Health

**Post-Install Scripts:** None detected
- Good security posture — no automatic code execution during install
- Monitor for future changes

**Maintenance Health:**
- All critical packages (express, react, vitest, dockerode) have active maintainers
- Download volumes healthy: express 30M+/week, react 15M+/week, vitest 3M+/week
- No abandoned dependencies detected

**Dependency Tree:**
- Total ~600 transitive dependencies across all packages
- Reasonable complexity — no extreme outliers
- No duplicate critical packages in different versions

### Audit Tool Notes

**npm audit:** Most reliable tool for this project stack
- `npm audit --json` returns structured data for all packages
- Works offline with package-lock.json
- Both direct and transitive vulnerabilities included

**npm outdated:** Tracks version drift
- Exit code 1 even with no errors — normal behavior
- `--json` flag essential for parsing

**Commands for CI/CD:**
```bash
# Strict audit mode (fail on moderate+)
npm audit --audit-level=moderate --production

# Check specific vulnerability
npm audit --fix --dry-run

# After fixes
npm ci && npm test && npm audit
```

### Next Audit Actions (2026-07-08)

1. Verify all 3 critical CVEs fixed (handlebars, vitest, protobufjs)
2. Check moderate CVE count — should drop from 19 to <5
3. Review progress on major version upgrades
4. Escalate any new critical findings to TheGuardians immediately

---

## Learnings Template for Future Audits

_When running future audits, track:_
- **New CVEs:** Any packages with recurring vulnerabilities?
- **Upgrade success:** Did major version upgrades break anything?
- **Time tracking:** How long did remediation actually take vs. estimate?
- **Regression testing:** Were there unexpected failures after npm update?
- **Production incidents:** Any audit-related incidents in live deployments?
