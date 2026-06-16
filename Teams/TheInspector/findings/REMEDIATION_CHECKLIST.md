# Dependency Vulnerability Remediation Checklist

**Audit Date:** 2026-06-16  
**Overall Status:** 🔴 CRITICAL — 38 vulnerabilities found  
**Grade:** D (Action required immediately)  

---

## Critical Path (Next 48 Hours)

These must be fixed before resuming development. All are code execution or supply chain risks.

### ☐ Step 1: Update Frontend Vitest (CRITICAL RCE)
```bash
cd Source/Frontend
npm install vitest@^3.2.6 --save-dev
npm test
```
**Why:** Remote code execution in dev UI (CVSS 9.8)  
**Affected:** `vitest@<=3.2.5`  
**CVE:** GHSA-5xrq-8626-4rwp  
**Verify:** Run `npm list vitest` and confirm `3.2.6+`

---

### ☐ Step 2: Update Frontend Vite (HIGH - Path Traversal)
```bash
cd Source/Frontend
npm install vite@^8.0.0 --save-dev
npm test
```
**Why:** Path traversal, FS bypass on Windows (3 CVEs)  
**Affected:** `vite@<=6.4.2`  
**CVEs:** GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff  
**Verify:** Run `npm list vite` and confirm `8.0.0+`  
**Note:** This also fixes esbuild (GHSA-gv7w-rqvm-qjhr)

---

### ☐ Step 3: Update Backend ts-jest (CRITICAL - Deprecated Glob)
```bash
cd Source/Backend
npm install ts-jest@^30.0.0 --save-dev
npm test
```
**Why:** ts-jest v29 depends on glob v7.2.3 (deprecated with known CVEs)  
**Affected:** `glob@7.2.3` (transitive via ts-jest)  
**Root:** `ts-jest@29.1.2`  
**Verify:** Run `npm list glob` and confirm `10.x+`

---

### ☐ Step 4: Test Both Workspaces
```bash
cd Source/Backend && npm test
cd ../Frontend && npm test
```
**Success Criteria:** All tests pass, no new failures

---

### ☐ Step 5: Re-run Audit
```bash
cd Source/Backend && npm audit
cd ../Frontend && npm audit
```
**Expected:** Significant reduction in CVE count (critical → high → moderate)

---

## High Priority (This Sprint)

### ☐ Step 6: Update Form-Data (HIGH - CRLF Injection)
```bash
# This may be pulled transitively, but ensure direct version bump
npm install form-data@^4.0.6 --save
```
**CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)  
**Why:** HTTP header injection risk

---

### ☐ Step 7: Update React Router DOM (HIGH - Open Redirect)
```bash
cd Source/Frontend
npm install react-router-dom@^6.31.0 --save
npm test
```
**CVE:** GHSA-2j2x-hqr9-3h42 (CVSS 6.1)  
**Why:** Open redirect vulnerability

---

### ☐ Step 8: Audit UUID Usage (MODERATE - Buffer Check)
```bash
# In Source/Backend, check for external buffer usage:
grep -r "uuid(" src/ --include="*.ts" | grep -E "uuid\([^)]*,[^)]*,"
```
**Package:** `uuid@<11.1.1` (Backend)  
**CVE:** GHSA-w5hq-g745-h8pq  
**Risk Level:**
- If grep finds matches: **CRITICAL** — fix immediately
- If no matches: Safe to upgrade at your convenience

**If safe:**
```bash
npm install uuid@^11.1.1 --save
npm test
```

---

### ☐ Step 9: Update Remaining High CVEs
```bash
# ws: Memory exhaustion DoS
npm install ws@^8.21.0 --save

# Run audit again
npm audit
```

---

## Medium Priority (This Month)

### ☐ Step 10: Plan React 18 → 19 Upgrade
- [ ] Review React 19 breaking changes
- [ ] Update `react@^19.0.0` and `react-dom@^19.0.0`
- [ ] Run full test suite
- [ ] Test in staging

### ☐ Step 11: Plan React Router 6 → 7 Upgrade
- [ ] Review React Router 7 breaking changes
- [ ] Update `react-router-dom@^7.0.0`
- [ ] Test all routing
- [ ] Test in staging

### ☐ Step 12: Update Pino (Logging)
```bash
cd Source/Backend
npm install pino@^10.0.0 --save
npm test
```
**Why:** 2 major versions behind; may include security patches

---

## Ongoing Monitoring

### ☐ Step 13: Enable Dependabot
- [ ] Go to GitHub repo → Settings → Code security & analysis
- [ ] Enable "Dependabot version updates"
- [ ] Set to check weekly

### ☐ Step 14: Add to CI/CD Pipeline
```bash
# Add to CI workflow:
npm audit --audit-level=moderate
# Fail the build if moderate or higher CVEs found
```

### ☐ Step 15: Schedule Monthly Reviews
- [ ] First Monday of each month: Run `npm audit` in both workspaces
- [ ] Review new advisories
- [ ] Update this checklist

---

## Verification Checklist

After completing each section, verify:

### After Step 1-3 (Critical Path)
- [ ] `npm audit` shows reduced critical/high count
- [ ] Both test suites pass
- [ ] No new console errors or warnings
- [ ] `git status` shows only package-lock.json changes

### After Step 6-9 (High Priority)
- [ ] No additional vulnerabilities found
- [ ] Tests still pass
- [ ] All "high" severity CVEs addressed

### After Step 10-12 (Medium Priority)
- [ ] Frontend bundle size didn't increase significantly
- [ ] E2E tests pass in staging
- [ ] Performance metrics stable

---

## Rollback Plan

If an update breaks tests, revert immediately:

```bash
# Revert last npm install
git checkout Source/{Backend,Frontend}/package-lock.json
npm install

# Investigate the breaking change
npm list <package-name>

# Downgrade to previous compatible version
npm install <package>@<previous-version> --save-dev
```

---

## Escalation Path

All critical and high CVEs have been escalated to **TheGuardians** (security team):

| Finding | Status | Owner |
|---------|--------|-------|
| DEP-001 (Vitest RCE) | 🔴 CRITICAL | TheGuardians |
| DEP-002 (Glob deprecated) | 🔴 CRITICAL | TheGuardians |
| DEP-003 (Vite path traversal) | 🔴 HIGH | TheGuardians |
| DEP-004 (Esbuild supply chain) | 🔴 HIGH | TheGuardians |
| DEP-005 (Form-data CRLF) | 🔴 HIGH | TheGuardians |
| DEP-006-009 (Others) | 🟡 MEDIUM | Dev Team |

---

## Questions?

Refer to:
- **Full report:** `Teams/TheInspector/findings/dependency-audit-2026-06-16.md`
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`
- **CVE Details:** Each finding includes links to GitHub Security Advisories

---

**Last Updated:** 2026-06-16  
**Next Review:** 2026-06-23  
**Estimated Time to Complete:** 2-3 hours (critical path: 1 hour, high priority: 1 hour, testing: 1 hour)
