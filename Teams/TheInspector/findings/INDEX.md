# Dependency Audit Index

**Audit Date:** 2026-07-08  
**Grade:** F (Critical)  
**Status:** Complete

---

## Quick Navigation

### For Executives / Team Leads
**Start here:** [README.md](./README.md) — Status overview and escalations

### For Developers
**Implementation guide:** [dependency-audit.md](./dependency-audit.md) — Full report with fix instructions

### For Security Review
**CVE Details:** [cve-watch-list.txt](./cve-watch-list.txt) — All CVE IDs and advisory links

### For Dashboard Integration
**Structured data:** [dependency-audit-summary.json](./dependency-audit-summary.json) — JSON format for tools

### For Future Audits
**Learnings:** [../learnings/dependency-auditor.md](../learnings/dependency-auditor.md) — Watch list, patterns, and tools

---

## Critical Findings Summary

| Finding | Severity | Projects | Action |
|---------|----------|----------|--------|
| Handlebars injection (CVSS 9.8) | 🔴 CRITICAL | Source/Backend, Source/Frontend | npm install handlebars@^4.7.9 |
| protobufjs RCE (11 CVEs, CVSS 9.8) | 🔴 CRITICAL | portal/Backend | npm install protobufjs@latest |
| Vitest file read (CVSS 9.8) | 🔴 CRITICAL | portal/Backend, Source/Frontend, portal/Frontend | npm install vitest@latest |
| form-data CRLF (CVSS 7.5) | ⚠️ HIGH | 3 projects | npm install form-data@^4.0.6 |
| Vite path traversal | ⚠️ HIGH | Source/Frontend, portal/Frontend | npm install vite@latest |
| gRPC DoS (CVSS 7.5) | ⚠️ HIGH | portal/Backend | npm install @grpc/grpc-js@^1.14.4 |

---

## Remediation Timeline

- **24 hours:** Apply Phase 1 critical patches
- **1 week:** Apply Phase 2 high-severity patches + test
- **4 weeks:** Implement CI/CD scanning + Dependabot setup

---

## Reports Generated

1. **dependency-audit.md** (18KB)
   - Full detailed findings with CVE descriptions
   - Fix instructions with specific commands
   - Supply chain assessment
   - Escalations to TheGuardians

2. **dependency-audit-summary.json** (3KB)
   - Structured data for dashboards
   - Machine-readable finding list
   - Metrics and statistics

3. **cve-watch-list.txt** (8KB)
   - All CVE IDs and versions
   - Advisory links
   - Patch commands
   - CI/CD integration examples

4. **README.md** (updated)
   - Quick status overview
   - File patterns reference
   - Workflow documentation

5. **../learnings/dependency-auditor.md** (updated)
   - Watch list for recurring CVEs
   - Audit tool availability
   - License compliance status
   - Next action checklist

---

## Key Metrics

- **Total CVEs:** 94
- **Critical:** 6
- **High:** 16
- **Medium:** 69
- **Low:** 3
- **Projects:** 6/6 scanned
- **Transitive Dependencies:** 1,821
- **Supply Chain Risk:** Moderate (no postinstall scripts, all permissive licenses)
- **Dependency Bloat:** portal/Backend (578 transitive, 57.8× multiplier)

---

## Contact & Escalation

- **Handlebars/protobufjs/Vitest escalation:** TheGuardians (security team)
- **Remediation coordination:** Development team
- **Scheduling & verification:** Team lead

---

## Next Review

**Scheduled:** 2026-07-22 (bi-weekly)

Audit tool: `npm audit --json` + CVE cross-reference
