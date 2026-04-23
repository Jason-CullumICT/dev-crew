# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### Audit 2026-04-23
**Run Date:** April 23, 2026  
**Projects Audited:** 4 (Backend, Frontend, E2E, Orchestrator)  
**Findings:** 15 vulnerabilities (2 CRITICAL, 1 HIGH, 6 MODERATE, 6 OUTDATED)

---

## Critical Packages to Watch

### High-Risk Transitive Dependencies
1. **protobufjs** — Recurrence: 1 audit
   - Issue: Arbitrary code execution (GHSA-xq3m-2v4x-88gg)
   - Root: Used by Docker orchestration tooling
   - Action: Monitor updates closely; plan to vendor protobufjs if critical fixes lag
   
2. **handlebars** — Recurrence: 1 audit
   - Issue: Multiple JavaScript injection vectors (CVSS 9.8)
   - Root: Test dependency via Jest
   - Action: Keep test dependencies pinned; test major version updates before deploying
   - Note: This is a recurring pattern in Jest-based projects

3. **path-to-regexp** — Recurrence: 1 audit
   - Issue: ReDoS (Regular Expression Denial of Service)
   - Root: Express router dependency
   - Action: Monitor Express releases; upgrades typically include fixes

4. **uuid** — Recurrence: 1 audit
   - Issue: Buffer bounds check missing in v3/v5/v6
   - Root: Used in multiple projects
   - Action: Requires major version upgrades; coordinate across Backend and Orchestrator

---

## License Compliance Decisions

✅ **Decision:** GPL/AGPL-free projects are acceptable  
✅ **Decision:** MIT, Apache 2.0, ISC, BSD licenses are approved  
⚠️ **Decision:** Pending — if GPL dependencies are ever required, escalate to legal team

---

## Audit Tools & Availability

### Environment Findings
- **npm audit** — ✅ Available and reliable
- **npm outdated** — ✅ Useful for tracking major version gaps
- **npm ls** — ✅ Available but slow on large dependency trees
- **license-checker** — ❓ Not installed; fallback to manual package.json inspection works

### Recommendation
Install `npm-audit-reporter` for CI/CD integration to catch vulnerabilities earlier.

---

## Patterns Observed

### Backend (Express + Node.js)
- Moderate-to-large dependency tree (411 total)
- Test infrastructure (Jest) pulls in handlebars and other dev dependencies
- Core dependencies (express, uuid, pino) are in active maintenance
- **Observation:** 310 dev dependencies is acceptable for a TypeScript backend with comprehensive testing

### Frontend (React + Vite)
- Smallest production footprint (9 direct, mostly React ecosystem)
- Extensive dev dependencies for modern tooling (222 total)
- Vite/Vitest have regular security updates; keep up-to-date
- **Observation:** React 18→19 upgrade is non-critical but recommended for performance

### Orchestrator (Docker + Express)
- Highest CVE count (4 vulnerabilities)
- Docker tooling dependencies require closer monitoring
- Platform infrastructure dependencies are critical security surface
- **Observation:** This project should have automated dependency scanning in CI/CD

### E2E (Minimal dependencies)
- ✅ Zero vulnerabilities
- ✅ Only 4 transitive dependencies
- Ideal security posture for pure testing automation

---

## Version Management Recommendations

### Major Version Upgrades Requiring Testing
| Package | Current | Target | Risk | Notes |
|---------|---------|--------|------|-------|
| Express | 4.x | 5.x | Medium | Breaking changes; middleware compatibility issues likely |
| uuid | 9.0.0 | 14.0.0 | Low | Should be backward compatible if not using buffer parameters |
| Pino | 8.x | 10.x | Medium | Logging behavior may change; test in staging |
| React | 18.3 | 19.x | Low | Generally backward compatible for functional components |
| React Router | 6.x | 7.x | Medium | Navigation patterns may change |
| Multer | 1.x | 2.x | Medium | File upload handling may differ |

---

## CI/CD Integration Notes

### Recommended Actions
1. **Add npm audit to pre-commit hook** — catch vulnerabilities early
2. **Weekly dependency scanning** — run `npm outdated` to track drift
3. **Automated PR generation** — use Dependabot to track updates
4. **Escalation workflow** — automatically flag P1/P2 findings to security team

### Current Status
- ❌ No pre-commit hooks detected
- ❌ No CI/CD integration observed
- ✅ Audit reports are being generated and tracked

---

## Cross-Team Escalations

### To TheGuardians (Security Team)
- **DEP-001:** protobufjs arbitrary code execution — requires immediate security review
- **DEP-002:** Handlebars multiple injection vectors — potential code execution in builds
- **DEP-003:** path-to-regexp ReDoS — network-level DoS surface

### To TheFixer (Bug Fix Team)
- Once vulnerabilities are triaged, create bug tickets for:
  - Updating direct dependencies (express, uuid, pino, multer)
  - Major version compatibility testing for React/React Router
  - Test infrastructure updates (vite, vitest, jest chain)

---

## Self-Learning & Improvement

### For Next Audit (Future Runs)
1. Collect baseline metrics on each audit to track trending
2. Create automated reports to reduce manual compilation time
3. Add supply chain risk scoring (download stats, maintainer count, etc.)
4. Implement SLA tracking (how long each vulnerability remains unfixed)

### Known Limitations
- Current audit does not automatically detect which packages export dangerous APIs
- Does not test if vulnerabilities are exploitable in the actual application context
- License compliance is text-based; may miss implications of license combinations

---

## Lessons Learned

1. **Handlebars in test dependencies is worth monitoring** — Multiple injection vectors in this library mean Jest-based projects need extra vigilance

2. **Platform infrastructure (orchestrator) is higher-risk** — It has more production dependencies and orchestrates other systems; treat it with extra scrutiny

3. **E2E testing project is a good security baseline** — Minimal dependencies = minimal attack surface. Use as a reference for what "lean" looks like

4. **Major version gaps (2+ versions behind) are red flags** — Even if not active CVEs, missing patches from intermediate versions is a sign of deferred maintenance

5. **Supply chain hygiene is good** — No post-install scripts, no low-download packages detected. Team is following security best practices

---

## Audit Run Summary

| Metric | Value |
|--------|-------|
| **Total Audits Run** | 1 |
| **Average Scan Time** | <5 seconds per project |
| **CVE Detection Accuracy** | High (npm audit is reliable) |
| **False Positives** | None observed |
| **Vulnerabilities Fixed (Since Last Audit)** | N/A (first audit) |
| **New Vulnerabilities Introduced** | N/A (baseline audit) |

---

_Last Updated: 2026-04-23_  
_Next Scheduled Audit: 2026-05-07 (2 weeks)_
