# TheInspector Findings — Dependency Audit 2026-07-09

**Report Generated:** 2026-07-09  
**Status:** ⚠️ Grade C (Critical & High vulnerabilities detected)

---

## Quick Summary

| Metric | Value |
|--------|-------|
| **Grade** | C |
| **Critical CVEs** | 2 |
| **High CVEs** | 4 |
| **Moderate** | 6 |
| **Low** | 1 |
| **Outdated Packages** | 6 |
| **Action Required** | Immediate |

---

## Critical Issues (Fix This Week)

### 🔴 Vitest 2.0.5 — Arbitrary File Read/Execute
- **Impact:** Attacker can read any file and execute code if UI server is listening
- **CVSS:** 9.8 (Critical)
- **Fix:** `npm install vitest@^3.2.6 --save-dev`
- **Advisory:** GHSA-5xrq-8626-4rwp

### 🔴 Handlebars.js — Code Injection (5 CVEs)
- **Impact:** Remote code execution via template injection
- **CVSS:** 9.8 (Critical)
- **Fix:** `npm audit fix` (then identify root dependency)
- **Advisory:** GHSA-2w6w-674q-4c4q and 4 others

---

## High-Severity Issues (Fix This Sprint)

### 🟠 form-data 4.0.0-4.0.5 — CRLF Injection
- **Impact:** Attacker can inject HTTP headers via multipart uploads
- **CVSS:** 7.5
- **Fix:** `npm install form-data@^4.0.6`
- **Advisory:** GHSA-hmw2-7cc7-3qxx

### 🟠 Vite 5.4.0 — Path Traversal (2 CVEs)
- **Impact:** Can bypass `server.fs.deny` on Windows; access restricted files
- **CVSS:** Not specified (High)
- **Fix:** `npm install vite@^6.4.3 --save-dev`
- **Advisories:** GHSA-fx2h-pf6j-xcff, GHSA-4w7w-66w2-5vf9

### 🟠 react-router-dom 6.26.0 — Open Redirect
- **Impact:** Attacker redirects users to external site
- **CVSS:** Not specified (High)
- **Fix:** `npm install react-router-dom@^6.30.4`
- **Advisory:** GHSA-2j2x-hqr9-3h42

### 🟠 ws 8.0.0-8.20.1 — Memory Exhaustion DoS
- **Impact:** Send tiny WebSocket fragments → crash the server
- **CVSS:** 7.5
- **Fix:** `npm install ws@^8.21.0` (or ^9.x)
- **Advisory:** GHSA-96hv-2xvq-fx4p

---

## Outdated Packages (Plan Upgrades)

| Package | Current | Latest | Gap | Action |
|---------|---------|--------|-----|--------|
| pino | 8.17.0 | 10.3.1 | 2 major | Plan upgrade (has breaking changes) |
| uuid | 9.0.0 | 14.0.1 | 5 major | Safe to update anytime |
| express | 4.18.2 | 5.2.1 | 1 major | Plan upgrade (breaking changes) |
| react | 18.3.1 | 19.2.7 | 1 major | Optional; 18.x is stable |
| react-router-dom | 6.26.0 | 7.18.1 | 1 major | Update to 6.30.4 minimum (CVE) |

---

## Quick Commands

### See the Problem
```bash
npm audit                                    # See all vulnerabilities
npm outdated                                 # See outdated packages
npm ls handlebars                            # Where does handlebars come from?
```

### Quick Fix (Auto-patch What You Can)
```bash
cd Source/Backend && npm audit fix
cd ../Frontend && npm audit fix
```

### Manual Patches (Must-dos)
```bash
# Frontend
npm install vitest@^3.2.6 --save-dev        # Critical
npm install react-router-dom@^6.30.4        # CVE
npm install vite@^6.4.3 --save-dev          # Path traversal
npm install form-data@^4.0.6                # CRLF injection

# Backend
npm install form-data@^4.0.6                # CRLF injection
npm audit fix                               # Handlebars + others
```

### Verify You Fixed It
```bash
npm audit                                    # Should show zero critical/high
npm test                                     # All tests pass
npm run build                                # Build succeeds
npm run typecheck                            # Type check passes
```

---

## Documents in This Directory

| Document | Purpose |
|----------|---------|
| `dependency-audit-20260709.md` | **Full audit report** with all findings, details, CVE descriptions, and remediation guidance |
| `dependency-audit-summary-20260709.json` | **Machine-readable summary** for dashboard integration and tracking |
| `remediation-checklist.md` | **Step-by-step checklist** to fix all issues in priority order |
| `AUDIT-README.md` | **This file** — quick reference guide |

---

## Escalation

### If You Find Handlebars in Use
This dependency has 5 critical injection CVEs. If the application processes **any untrusted templates**, this is **P0 (exploit-able)**.

**Action:** Escalate to [TheGuardians](../learnings/) immediately.

### If Vitest UI is Exposed
If the dev server listens on a network-accessible port (e.g., CI pipeline output), an attacker can read files and execute code.

**Action:** Verify the UI server configuration and check TheGuardians' response.

---

## Timeline

| When | What |
|------|------|
| **This Week** | Fix Vitest critical, form-data high, run tests |
| **This Sprint** | Fix Vite path traversal, react-router CVE, audit |
| **Next Sprint** | Plan pino & express upgrades, update ws |
| **Next Release** | Execute major version upgrades (pino, express) |

---

## Next Audit

**Date:** 2026-10-09 (Quarterly)

**Run Command:**
```bash
cd /path/to/dev-crew
npm audit --json > dependency-audit-output.json
npm outdated --json > outdated.json
# (Auditor will generate full report)
```

---

## Questions?

1. **What's the business impact?** See "Full Audit Report" for each CVE's exploitability in context.
2. **How do I know I fixed it?** Run `npm audit` again — should show zero critical/high.
3. **Can I skip some updates?** Vitest & Handlebars are critical. Others can be prioritized by team.
4. **What about the 400+ transitive dependencies?** This is normal for npm projects. Keep using lock files and run quarterly audits.
5. **Should I upgrade Express and Pino?** Major versions have breaking changes. Plan and test thoroughly before deploying.

---

## Audit Metadata

- **Auditor:** dependency-auditor (Haiku)
- **Scope:** Source/Backend + Source/Frontend
- **Package Managers:** npm
- **Audit Tool:** npm audit, npm outdated
- **Grade Threshold:** C = max 2 critical + max 4 high + max 15 moderate
- **Grade Assigned:** C (2 critical + 4 high present)

---

**Last Updated:** 2026-07-09  
**Next Review:** 2026-10-09  
**Status:** 🚨 Action Required Immediately

