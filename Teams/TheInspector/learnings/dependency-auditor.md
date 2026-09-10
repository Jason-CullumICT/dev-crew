# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-10

### Critical Findings (P1) - Require Immediate Action

**Watch List - Recurring CVEs:**
1. **handlebars** - Multiple JavaScript Injection vulnerabilities (GHSA-2qvq-rjwj-gvw9, GHSA-2w6w-674q-4c4q, GHSA-xhpv-hc6g-r9c6, GHSA-9cx6-37pm-9jff, GHSA-xjpj-3mr7-gcpf)
   - Currently at 4.7.8, needs 4.7.9+
   - Multiple injection vectors via @partial-block and dynamic partials
   - High complexity - affects template rendering security

2. **vitest** - Arbitrary file read/execution when UI server is listening (GHSA-5xrq-8626-4rwp)
   - Found in: Source/Frontend (2.1.9), portal/Backend (1.6.1), portal/Frontend (1.6.1)
   - CVSS 9.8 - Critical
   - Affects development and CI environments
   - Recommend disabling UI server in non-local environments

3. **protobufjs** - Multiple code execution vulnerabilities
   - Found in: portal/Backend (7.5.4)
   - Needs 7.5.5+
   - Multiple attack vectors: code injection, prototype pollution, unbounded recursion DoS
   - Highly complex package with 12+ CVEs

### High-Risk Projects

**portal/Backend** - HIGHEST RISK:
- 54 total vulnerabilities (1L, 41M, 10H, 2C)
- 578 transitive dependencies (highest supply chain surface)
- Contains 2 critical packages: protobufjs, vitest
- 11 outdated packages
- Recommendation: Full dependency audit and update cycle

**portal/Frontend** - HIGH RISK:
- 16 total vulnerabilities (2L, 6M, 7H, 1C)
- 425 transitive dependencies
- Contains critical vitest issue
- 3 outdated packages

### Medium-Risk Projects

**Source/Backend:**
- 10 total vulnerabilities (2L, 3M, 4H, 1C)
- 412 transitive dependencies
- Contains critical handlebars issue (likely indirect via a template engine)
- 4 outdated packages

**Source/Frontend:**
- 15 total vulnerabilities (1L, 7M, 6H, 1C)
- 231 transitive dependencies
- Contains critical vitest issue
- 3 outdated packages

**Source/E2E:**
- 0 vulnerabilities ✅ CLEAN
- Minimal dependencies
- No action needed

### Common Vulnerability Patterns Found

1. **DoS via Memory Exhaustion**: browserslist, brace-expansion, js-yaml, @grpc/grpc-js
2. **Path Traversal/File Access**: vite, @vitest/mocker, vitest UI
3. **Injection Vulnerabilities**: handlebars, form-data (CRLF), picomatch (POSIX char class)
4. **Prototype Pollution**: Multiple packages leading to code generation gadgets
5. **XSS**: postcss with unescaped `</style>`

### Tools & Environment Notes

- **npm audit** tool: Fully functional, provides detailed JSON output
- **npm outdated**: Works, but requires manual inspection for major version jumps
- **npm ls**: Can enumerate dependency tree
- **License detection**: No GPL/AGPL violations found; recommend periodic license-checker runs
- **Abandoned package detection**: Manual review required via GitHub activity checks

### Remediation Status Tracking

| Package | Issue | Status | Due Date | Owner |
|---------|-------|--------|----------|-------|
| handlebars | GHSA-2qvq-rjwj-gvw9 | OPEN | 2026-09-10 | TheFixer |
| vitest (3 projects) | GHSA-5xrq-8626-4rwp | OPEN | 2026-09-10 | TheFixer |
| protobufjs | GHSA-xq3m-2v4x-88gg | OPEN | 2026-09-10 | TheFixer |

### Audit Tool Notes

- **npm audit --json** produces complete, machine-parseable vulnerability data
- Vulnerabilities include: CVE ID, CVSS score, affected version range, fix availability
- Each package can have multiple CVEs; must check all via entries
- Direct vs. transitive distinction important for prioritization
- Exit code 5 on audit failures; check metadata for summary

### License Decisions

- No GPL/AGPL licenses found; project appears to be MIT/Apache 2.0 compatible
- Monitor: baseline-browser-mapping (single maintainer - supply chain risk)

## Learnings from Analysis

1. **Portal stack has significantly higher supply chain risk** - 578 transitive deps in backend, 425 in frontend vs. 231-412 in source stack. Consider architectural review of portal dependencies.

2. **Vitest UI server is a known attack surface** - Should never be exposed in production or CI. Recommend configuration hardening.

3. **Protobufjs is high-risk for gRPC workloads** - Multiple complex vulnerabilities. If used, keep very up to date and consider alternatives.

4. **Handlebars requires continuous monitoring** - Multiple injection vectors; each version has different CVEs. Template safety is critical.

5. **Development tools have security implications** - Vitest, vite, build tools in dev dependencies can have critical CVEs affecting developer machines and CI/CD pipelines.

## Next Steps

1. Run verification on patches to ensure no breaking changes
2. Add npm audit to CI/CD pipeline with failure threshold
3. Set up automated dependency update PRs via Dependabot or similar
4. Schedule security review of portal/Backend and portal/Frontend
5. Review protobufjs necessity — consider alternatives if not actively used
