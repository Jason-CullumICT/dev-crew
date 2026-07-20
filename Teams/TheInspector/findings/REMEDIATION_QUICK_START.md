# Dependency Security Audit — Quick Start Remediation Guide

**Audit Date:** 2026-07-20  
**Status:** ⚠️ UNSAFE FOR PRODUCTION  
**Action Required:** YES  

---

## TL;DR: Run These Commands NOW

```bash
# Backend
cd Source/Backend
npm audit fix
npm update vite uuid form-data
npm test

# Frontend
cd Source/Frontend
npm install vite@^5.4.3 react-router-dom@^6.30.4
npm test
npm run build

# Portal/Backend (highest risk — 54 CVEs)
cd portal/Backend
npm audit fix
npm update
npm test

# Portal/Frontend
cd portal/Frontend
npm install vite@^5.4.3 react-router-dom@^6.30.4
npm test

# E2E (no action needed)
cd Source/E2E
npm audit  # Should be clean
```

---

## Critical Issues (Do First)

### 1. Handlebars RCE (CVSS 9.8) ⚠️

**What to do:**
```bash
# Search for handlebars usage
grep -r "handlebars\|require.*template\|import.*template" Source/ portal/ --include="*.js" --include="*.ts"

# If results show dynamic template rendering:
# -> CRITICAL: upgrade immediately (contact TheGuardians)

# If no results (only transitive via Babel):
# -> Safe: Babel is compile-time only, no runtime risk
# -> Still upgrade @babel/core and dependencies via npm audit fix
```

**Why:** CVSS 9.8 = remote code execution. If your app processes user-supplied templates, this is a showstopper.

---

### 2. Vite Host Header Confusion (CVSS 7.1)

**What to do:**
```bash
cd Source/Frontend
npm install vite@^5.4.3

cd portal/Frontend  
npm install vite@^5.4.3
```

**Why:** Vite dev server doesn't validate Host header → attacker can inject any host → cache poisoning/CORS bypass

**Verify it works:**
```bash
npm run build  # Make sure build succeeds
npm run dev   # Dev server should start (never expose to internet!)
```

---

### 3. Portal/Backend Bloat (54 CVEs) 🔴

**What to do:**
```bash
cd portal/Backend
npm audit  # Read the full report
npm audit fix  # Fix what you can

# Then manually decide: do you really need all OpenTelemetry?
# grep -r "opentelemetry\|tracing\|metrics" src/ | head -20
```

**Why:** portal/Backend has 2 critical + 6 high vulnerabilities. Most come from heavy OpenTelemetry instrumentation.

**Decision tree:**
- **Using full distributed tracing?** → Keep @opentelemetry/auto-instrumentations-node
- **Just want basic logs?** → Switch to pino-only, remove OpenTelemetry
- **Using metrics only?** → Use simpler metrics library instead of OpenTelemetry
- **Not sure?** → Ask your team, then fix based on decision

---

## Medium Priority (Do This Week)

### 4. form-data CRLF Injection (CVSS 7.5)

**What to do:**
```bash
# All modules:
npm update form-data

# Or global:
npm audit fix
```

**Why:** CRLF characters in form field names can inject HTTP headers. Low risk in this app (no user multipart uploads), but still patch it.

---

### 5. react-router-dom Open Redirect (CVSS unscored)

**What to do:**
```bash
cd Source/Frontend
npm install react-router-dom@^6.30.4

cd portal/Frontend
npm install react-router-dom@^6.30.4
```

**Why:** Paths starting with `//` are treated as protocol-relative URLs. Attacker can redirect users to `//attacker.com`.

---

### 6. uuid Buffer Bounds (CVSS 7.5)

**What to do:**
```bash
cd Source/Backend
npm install uuid@^11.1.1  # or just update: npm update uuid

# OR stay on v9 (less breaking):
npm install uuid@^9.0.1
```

**Why:** uuid v3/v5/v6 don't check buffer length when you provide a pre-allocated buffer → out-of-bounds write.

**Decision:** 
- Safe option: `npm update uuid` (stay on v9, minor patch)
- Aggressive option: `npm install uuid@latest` (jump to v14, may need code changes)

---

## Low Priority (Do Next Sprint)

### 7. React 18 → React 19 Upgrade
```bash
cd Source/Frontend
npm install react@latest react-dom@latest
npm test
```

**Why:** React 19 has performance improvements and bug fixes, but requires testing. Not a security issue.

---

### 8. Update Other Outdated Packages
```bash
npm outdated --json  # See what's behind

# Conservative updates (stay within major version):
npm update

# Aggressive (jump to latest):
npm install pino@latest  # 8.x → 10.x
npm install express@latest  # 4.x → 5.x (careful, breaking)
```

---

## Verification Checklist

After running updates:

- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] `npm test` passes in each module
- [ ] `npm run build` succeeds (especially Frontend modules)
- [ ] Dev server starts: `npm run dev` (check vite loads)
- [ ] No unexpected behavior in running app

---

## Add to CI/CD Pipeline (Optional But Recommended)

Add this to your GitHub Actions / CI:

```yaml
# .github/workflows/security-audit.yml
name: Dependency Security Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Audit Source/Backend
        run: cd Source/Backend && npm audit --audit-level=high
      
      - name: Audit Source/Frontend
        run: cd Source/Frontend && npm audit --audit-level=high
      
      - name: Audit portal/Backend
        run: cd portal/Backend && npm audit --audit-level=high
      
      - name: Audit portal/Frontend
        run: cd portal/Frontend && npm audit --audit-level=high
```

---

## Questions?

Refer to the full audit report: `Teams/TheInspector/findings/dependency-audit-2026-07-20.md`

---

**Next Audit Scheduled:** 2026-07-25  
**Auditor:** dependency-auditor (haiku)  
