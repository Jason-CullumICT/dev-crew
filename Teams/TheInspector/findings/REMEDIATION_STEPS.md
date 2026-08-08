# Dependency Vulnerability Remediation Steps

**Date:** 2026-08-08  
**Audit Grade:** C (1 critical, 3 high, 9 moderate CVEs)  
**Execution Timeline:** Week 1 (critical), Week 2 (medium), Month 1 (strategic)

---

## 🚨 IMMEDIATE FIXES (Week 1 — Critical & High Priority)

Execute these commands in order. Test after each step.

### Step 1: Update Transitive Dependencies (Critical CVEs)

```bash
# This updates transitive deps in node_modules chain
# No direct package.json changes; npm resolves automatically
npm update handlebars brace-expansion js-yaml form-data

# Verify
npm audit --json | jq '.metadata.vulnerabilities'
# Expected output after update:
# {
#   "critical": 0,
#   "high": 3,    (reduced from 8)
#   "moderate": 9,
#   "low": 4
# }
```

**What this fixes:**
- ✅ handlebars RCE (CVSS 9.8, CRITICAL)
- ✅ brace-expansion DoS x4 (CVSS 7.5, HIGH)
- ✅ js-yaml quadratic CPU x3 (CVSS 7.5, HIGH)
- ✅ form-data CRLF injection (CVSS 7.5, HIGH)

---

### Step 2: Update Direct Dependencies with CVEs

```bash
cd Source/Backend

# Update express (fixes qs DoS transitive)
npm update express

# Update uuid (fixes buffer bounds check)
# WARNING: May be a MAJOR version bump (9.x → 11.x)
# Test thoroughly after update
npm update uuid

# Verify
npm audit --json | jq '.metadata.vulnerabilities'
# Expected: critical: 0, high: 0, moderate: 5 (or lower)
```

**What this fixes:**
- ✅ express + qs DoS (CVSS 5.3, MODERATE)
- ✅ uuid buffer bounds check (CVSS 7.5, MODERATE)

---

### Step 3: Update Frontend Router (Redirect Vulnerability)

```bash
cd Source/Frontend

# Update react-router-dom (fixes open redirect)
npm update react-router-dom

# Verify
npm audit --json | jq '.metadata.vulnerabilities'
```

**What this fixes:**
- ✅ @remix-run/router open redirect (CVSS unknown, MODERATE)

---

### Step 4: Run Tests

```bash
# From root directory
npm test --workspaces

# Expected: All tests pass with no new failures
```

If tests fail:
1. Check test output for broken imports
2. Verify version-specific breaking changes in changelog
3. Revert specific update: `npm install package@^old-version`
4. File issue with migration blockers

---

### Step 5: Final Verification

```bash
npm audit --audit-level=moderate

# Expected output:
# npm audit --audit-level=moderate
# up to date, audited XXX packages
# 0 vulnerabilities

npm outdated --json | jq 'keys' | wc -l
# Expected: 0 or low count (no critical outdates)
```

**Success criteria:**
- ✅ npm audit shows 0 critical
- ✅ npm audit shows 0 high (or acceptable medium/low only)
- ✅ All tests pass
- ✅ No new npm warnings

---

## ⚡ SECONDARY FIXES (Week 2 — Medium Priority)

After Week 1 fixes are validated, apply these patches:

```bash
cd Source/Frontend

# Update Vite (fixes esbuild dev-server vulnerability)
npm update vite vitest

# Update nanoid (fixes infinite loop on invalid size)
npm update nanoid

# Update postcss (build tool fix)
npm update postcss
```

Then:

```bash
npm audit --json | jq '.metadata.vulnerabilities'
# Expected: mostly low-severity CVEs remaining (informational)
```

---

## 📋 STRATEGIC MIGRATIONS (Month 1 — Plan Only, Don't Execute Yet)

These are major version bumps that require more extensive testing.

### Migration 1: Pino Logging (v8 → v9+)

**Current:** pino@8.17.0  
**Target:** pino@10.3.1  
**Reason:** Performance improvements, v8 has 2+ majors available

```bash
# STEP 1: Review breaking changes
# https://github.com/pinojs/pino/blob/master/CHANGELOG.md
# v9 introduces streaming API changes

# STEP 2: Create feature branch
git checkout -b upgrade/pino-v9

# STEP 3: Update (don't commit yet)
cd Source/Backend
npm update pino@^9

# STEP 4: Run all tests
npm test

# STEP 5: If tests pass, commit
git add package*.json
git commit -m "upgrade(deps): pino v8 → v9 for performance improvements"

# STEP 6: Wait for CI/CD validation, then merge
```

**Timeline:** After critical fixes are validated (Week 3+)

---

### Migration 2: UUID Library (v9 → v11+)

**Current:** uuid@9.0.0  
**Target:** uuid@14.0.1  
**Reason:** Buffer bounds check fix (CVSS 7.5 in older versions)

```bash
# Note: uuid v11+ is a breaking change
# Review: https://github.com/uuidjs/uuid/releases

cd Source/Backend
npm update uuid@^11

npm test

# Verify no buffer-related code breaks:
git diff package.json | grep uuid
```

**Timeline:** After v8→v9 Pino migration (Month 2+)

---

### Migration 3: React Router (v6 → v7)

**Current:** react-router-dom@6.26.0  
**Target:** react-router-dom@7.18.2  
**Reason:** New features, breaking API changes

```bash
# Requires full SPA testing — do NOT rush this

cd Source/Frontend
npm update react-router-dom@^7

npm test
npm run dev  # Manual browser testing

# Check for breaking changes:
# - Route syntax changes?
# - Hook API changes?
# - Redirect behavior changes?

# If major issues: revert and wait for patch release
npm install react-router-dom@6.30.4
```

**Timeline:** Month 2-3, requires full QA cycle

---

## 🔍 MANUAL VERIFICATION CHECKLIST

After all automatic updates, verify these manually:

- [ ] No console errors in dev server (`npm run dev`)
- [ ] All API endpoints respond (curl `http://localhost:3001/metrics`)
- [ ] Frontend loads without 404s (open `http://localhost:5173`)
- [ ] Tests pass with zero new failures (`npm test --workspaces`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] E2E tests pass (if configured) (`npm test --workspace=Source/E2E`)

---

## 🚨 ROLLBACK PROCEDURE

If updates cause critical failures:

```bash
# Option 1: Revert to package-lock.json (safest)
git checkout HEAD -- package-lock.json
npm ci

# Option 2: Revert specific package
npm install package@old-version --save-exact
npm ci

# Option 3: Full workspace rollback
git reset --hard HEAD~1  # Last commit before updates
npm ci
```

---

## 📊 Dashboard Reporting

After each phase, update the team:

```bash
# After Week 1 fixes
curl -X POST http://dashboard:9801/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "audit": "dependency-auditor",
    "status": "fixed",
    "cves_remaining": 13,
    "critical": 0,
    "high": 0,
    "timestamp": "2026-08-15"
  }'
```

---

## 📞 Escalation Contacts

If you encounter issues:

| Issue | Contact | Notes |
|-------|---------|-------|
| Tests fail after uuid update | TheGuardians (backend owner) | Buffer-related breaking changes |
| React Router v7 breaking API | frontend-coder | Requires SPA refactoring |
| Handlebars not updating | TheGuardians (security) | May need to audit template usage |
| Performance regression after updates | performance-profiler | May need metric review |

---

## ✅ Success Criteria

**Audit passes when:**
- ✅ `npm audit` reports 0 critical vulnerabilities
- ✅ `npm audit` reports 0 high vulnerabilities (or only P4-approved)
- ✅ All tests pass (zero new failures)
- ✅ Grade improves from C → B (max_p1: 0, max_p2: ≤3)
- ✅ All escalations acknowledged (TheGuardians, red-teamer, performance-profiler)

---

**Estimated Time:**
- Week 1 critical fixes: 2-4 hours (including testing)
- Week 2 secondary fixes: 1-2 hours
- Month 1 strategic migrations: 8-16 hours (5-8 hours per major migration)

**Total:** ~15-25 hours spread over 4 weeks

---

**Created:** 2026-08-08  
**Next Review:** 2026-09-08 (or after all fixes applied)
