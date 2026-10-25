# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## 2026-10-25 Audit Results

### Key Findings
- **116 total CVEs** across all projects (12 critical, 34 high, 67 moderate, 3 low)
- **3 P1 (CRITICAL)** findings requiring immediate escalation to TheGuardians:
  1. Tinypool RCE (vitest transitive) - Prototype Pollution gadget
  2. proxy-addr IP Spoofing - IPv4-mapped IPv6 bypass
  3. Handlebars.js Code Injection (10 distinct CVEs)
- **8 P2 (HIGH)** findings - all have available fixes via `npm audit fix`
- **Portal projects have highest CVE density** (61 Backend, 18 Frontend)

### Vulnerability Watch List
**Recurring/High-Impact:**
- `tinypool` <=2.1.1 - RCE via prototype pollution (affects all vitest users)
- `handlebars` <=4.7.7 - 10 distinct JS injection CVEs (deep build dependency)
- `uuid` <11.1.1 - Multiple releases behind; buffer bounds issues
- `js-yaml` <=3.15.1 - Quadratic DoS via merge keys (4 CVEs)
- `postcss` <=8.5.22 - XSS + path traversal via sourceMappingURL (4 CVEs)
- `ws` 8.0.0-8.20.1 - Memory disclosure + DoS (2 CVEs)

### Project-Specific Notes
**Source/Backend:**
- 11 CVEs (2 critical, 5 high, 3 moderate, 1 low)
- Direct dependencies minimal (4 prod, 9 dev)
- ~60 transitive deps (healthy)
- Priority: proxy-addr fix, body-parser DoS, js-yaml DoS

**Source/Frontend:**
- 17 CVEs (2 critical, 7 high, 7 moderate, 1 low)
- Direct dependencies: 3 prod, 10 dev
- ~350+ transitive (vitest, React test stack)
- Priority: Tinypool RCE fix (npm audit fix --force), PostCSS, nanoid

**Source/E2E:**
- 0 CVEs ✓
- Only @playwright/test@^1.58.2
- No action needed

**Portal projects:**
- 61 Backend CVEs (4 critical, 11 high, 46 moderate) - HIGHEST RISK
- 18 Frontend CVEs (2 critical, 8 high, 7 moderate, 1 low)
- Note: Portal is orchestrator infrastructure; escalate to platform team

**Platform/Orchestrator:**
- 9 CVEs (2 critical, 3 high, 4 moderate)
- Docker/orchestration related (dockerode dependencies)
- Critical: platform team responsibility [SEE PLATFORM ARCHITECTS]

### Tools & Techniques Available
- `npm audit --json` - structured CVE output
- `npm outdated --json` - version comparison
- `npm ls --all` - transitive dependency tree
- `npm audit fix` - automated fixes (safe)
- `npm audit fix --force` - includes breaking changes
- `npm dedupe` - consolidate duplicate versions

### License Findings
✓ No GPL/AGPL in Source/ dependencies
✓ All primary licenses MIT or ISC (permissive)
✓ No compliance risk identified

### Escalation Patterns
Three findings require TheGuardians (security team):
1. **RCE vulnerabilities** - Tinypool (prototype pollution)
2. **Access Control Bypass** - proxy-addr (IP spoofing)
3. **Code Injection** - Handlebars (10 template injection CVEs)

### Process Recommendations
1. **Quarterly audits** - establish cadence
2. **Lock files discipline** - maintain package-lock.json strictly
3. **Dependabot integration** - automated PR generation for security fixes
4. **Test before upgrade** - always run test suite after npm audit fix
5. **Break changes policy** - review `npm audit fix --force` carefully before applying

### Next Actions (Post-Audit)
- [ ] Escalate P1 findings to TheGuardians for risk assessment
- [ ] Run `npm audit fix` in Source/Backend and Source/Frontend this sprint
- [ ] Schedule uuid major version upgrade (cross-project coordination)
- [ ] Evaluate React 19 + React-Router v7 migration timeline
- [ ] Set up quarterly audit schedule in project calendar

## Learnings

_(Persistent discoveries from audits; add new findings here)_
