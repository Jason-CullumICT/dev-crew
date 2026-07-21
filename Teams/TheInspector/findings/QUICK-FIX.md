# Quick Fix Reference — P1/P2 CVEs

**Audit Date:** 2026-07-21  
**Total Time to Fix:** ~6-9 hours  
**Priority:** 🚨 CRITICAL — Complete Today

---

## Quick Checklist

- [ ] Fix Vitest RCE (P1)
- [ ] Fix UUID Buffer Overflow (P2)
- [ ] Fix React Router Open Redirect (P2)
- [ ] Fix Handlebars Chain (P1)
- [ ] Update Vite (P2)
- [ ] Run all tests
- [ ] Commit & push
- [ ] Notify TheGuardians

---

## Fix #1: Vitest RCE (15 min)

**Severity:** P1 | **CVSS:** 9.8 | **CVE:** GHSA-5xrq-8626-4rwp

```bash
cd Source/Frontend
npm install vitest@^3.2.6
npm test
git add package*.json
git commit -m "Security: Fix Vitest RCE (GHSA-5xrq-8626-4rwp)"
```

**Verify:**
- All tests pass ✓
- No new npm audit warnings ✓

---

## Fix #2: UUID Buffer Overflow (20 min)

**Severity:** P2 | **CVSS:** 7.5 | **CVE:** GHSA-w5hq-g745-h8pq

```bash
cd Source/Backend
npm install uuid@^11.1.1
npm test
# Verify UUID generation works:
node -e "const {v4} = require('uuid'); console.log(v4())"
git add package*.json
git commit -m "Security: Fix UUID buffer overflow (GHSA-w5hq-g745-h8pq)"
```

**Verify:**
- Backend tests pass ✓
- UUID generation produces valid v4 UUIDs ✓
- Work item tests pass ✓

---

## Fix #3: React Router Open Redirect (15 min)

**Severity:** P2 | **CVE:** GHSA-2j2x-hqr9-3h42

```bash
cd Source/Frontend
npm install react-router-dom@^6.30.4
npm test
git add package*.json
git commit -m "Security: Fix React Router open redirect (GHSA-2j2x-hqr9-3h42)"
```

**Verify:**
- Frontend tests pass ✓
- Routing components work ✓

---

## Fix #4: Handlebars Chain (30 min investigation + 15 min fix)

**Severity:** P1 | **CVSS:** 9.8 | **CVE:** GHSA-2w6w-674q-4c4q (+ others)

```bash
# Step 1: Find what depends on handlebars
cd Source/Backend
npm ls handlebars

# Output will show the chain, e.g.:
# └─── somePackage → handlebars

# Step 2: Update the root package
npm install {somePackage}@latest

# Step 3: Verify
npm audit | grep handlebars  # Should show no vulnerabilities
npm test

# Step 4: Commit
git add package*.json
git commit -m "Security: Fix Handlebars code injection via {somePackage} update"
```

**Verify:**
- Backend tests pass ✓
- No more handlebars vulnerabilities in npm audit ✓

---

## Fix #5: Vite Path Traversal (20 min)

**Severity:** P2 | **CVSS:** 7.5 | **CVE:** GHSA-fx2h-pf6j-xcff

```bash
cd Source/Frontend
npm install vite@latest
npm test
npm run build
npm run dev &  # Start dev server briefly to verify it works
# Hit Ctrl+C after 5 seconds
git add package*.json
git commit -m "Security: Fix Vite path traversal vulnerabilities (GHSA-fx2h-pf6j-xcff)"
```

**Verify:**
- Frontend tests pass ✓
- Build succeeds ✓
- Dev server starts without errors ✓

---

## Final Verification (30 min)

```bash
# Run full test suite
npm test --workspaces --if-present

# Verify no new vulnerabilities
npm audit --json | jq '.metadata.vulnerabilities | 
  select(.critical > 0 or (.high > 3) or (.moderate > 10))'

# Check nothing is broken
npm run build --workspaces --if-present
npm run typecheck --workspaces --if-present
```

**Success Criteria:**
- [ ] All tests pass
- [ ] No P1 CVEs remain
- [ ] No new P2 CVEs introduced
- [ ] Build succeeds
- [ ] Type checking passes

---

## Commit Message Template

```
Security: Fix P1/P2 CVEs in dependency audit

Fixed vulnerabilities:
- Vitest RCE (GHSA-5xrq-8626-4rwp) → vitest@^3.2.6
- UUID buffer overflow (GHSA-w5hq-g745-h8pq) → uuid@^11.1.1
- React Router open redirect (GHSA-2j2x-hqr9-3h42) → react-router-dom@^6.30.4
- Handlebars code injection (GHSA-2w6w-674q-4c4q) → [updated chain]
- Vite path traversal (GHSA-fx2h-pf6j-xcff) → vite@latest

All tests pass. No new vulnerabilities introduced.

Resolves: Dependency Audit 2026-07-21
```

---

## Escalation Checklist

After completing fixes:

1. [ ] All P1/P2 CVEs resolved
2. [ ] Tests pass in both Backend & Frontend
3. [ ] Notify TheGuardians: "P1/P2 CVE fixes applied and verified"
4. [ ] Create follow-up tickets for P3/P4 CVEs
5. [ ] Schedule major version upgrade planning (Express, React Router)

---

## If Something Breaks

### Test Failure?
```bash
# See what broke
npm test -- --verbose

# Check if it's related to the update
npm ls {package_that_broke}

# Revert if necessary
git revert HEAD
npm install
```

### Build Failure?
```bash
npm run build
# Check error message
# Most common: TypeScript type mismatch
# Solution: Run `npm run typecheck` to see details
npm run typecheck
```

### Dev Server Won't Start?
```bash
npm run dev 2>&1 | head -50  # Show first 50 lines of error
```

---

## Support

**Questions?** See the detailed audit report:
- 📄 `dependency-audit-2026-07-21.md` (full analysis)
- 📋 `dependency-audit-2026-07-21.json` (structured data)

**Timeline:**
- Start: Now (2026-07-21)
- Target: Complete by EOD today
- Verification: Ready for release tomorrow

---

**Good luck! 🚀**
