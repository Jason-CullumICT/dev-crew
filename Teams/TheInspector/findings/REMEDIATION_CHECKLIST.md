# Dependency Audit Remediation Checklist

**Audit Date:** 2026-06-08  
**Status:** ⛔ 3 Critical CVEs — Needs immediate fixing

---

## Phase 1: CRITICAL CVE Fixes (Do Today)

### Fix 1: Handlebars RCE in Source/Backend
**Priority:** 🔴 P1-IMMEDIATE | **Estimated Time:** 30 min

- [ ] Navigate to Source/Backend: `cd Source/Backend`
- [ ] Update handlebars: `npm update handlebars`
- [ ] Verify fix: `npm audit --json | jq '.vulnerabilities.handlebars'` (should be empty)
- [ ] Run tests: `npm test`
- [ ] Commit: `git add package*.json && git commit -m "fix: upgrade handlebars to >=4.7.9 (RCE CVE)"`

**Verification:**
```bash
cd Source/Backend
npm ls handlebars  # Should show version >= 4.7.9
npm audit --json | jq '.vulnerabilities | keys'  # handlebars should NOT appear
```

---

### Fix 2: Vitest Security in Source/Frontend
**Priority:** 🔴 P1-IMMEDIATE | **Estimated Time:** 30 min

- [ ] Navigate to Source/Frontend: `cd Source/Frontend`
- [ ] Update vitest & deps: `npm update vitest vite esbuild @vitejs/plugin-react`
- [ ] Verify fix: `npm audit --json | jq '.vulnerabilities.vitest'` (should be empty)
- [ ] Run tests: `npm test`
- [ ] Commit: `git add package*.json && git commit -m "fix: upgrade vitest/vite/esbuild for path traversal and CORS CVEs"`

**Verification:**
```bash
cd Source/Frontend
npm ls vitest vite esbuild  # Check versions
npm audit --json | jq '.vulnerabilities | keys'  # vitest/vite/esbuild should NOT appear
```

---

### Fix 3: Protobufjs RCE in platform/orchestrator
**Priority:** 🔴 P1-IMMEDIATE | **Estimated Time:** 45 min

- [ ] Navigate to orchestrator: `cd platform/orchestrator`
- [ ] Update protobufjs & dockerode: `npm update protobufjs dockerode`
- [ ] Verify fix: `npm audit --json | jq '.vulnerabilities.protobufjs'` (should be empty)
- [ ] Manual test (if orchestrator has tests): `npm test` or validate Docker integration works
- [ ] Commit: `git add package*.json && git commit -m "fix: upgrade protobufjs to >=7.5.6 (RCE CVE) and dockerode"`

**Verification:**
```bash
cd platform/orchestrator
npm ls protobufjs  # Should show version >= 7.5.6
npm audit --json | jq '.vulnerabilities.protobufjs'  # Should be empty
```

---

## Phase 2: Bulk Moderate CVE Fixes (Tomorrow)

**Priority:** 🟡 P2-URGENT | **Estimated Time:** 2 hours total

### Fix All Moderate CVEs at Once
```bash
# Run in each directory: Source/Backend, Source/Frontend, platform/orchestrator

cd Source/Backend && npm update
cd Source/Frontend && npm update
cd platform/orchestrator && npm update
```

- [ ] Run bulk update in Source/Backend
- [ ] Run tests: `cd Source/Backend && npm test`
- [ ] Run bulk update in Source/Frontend
- [ ] Run tests: `cd Source/Frontend && npm test`
- [ ] Run bulk update in platform/orchestrator
- [ ] Run tests (if applicable)
- [ ] Run full workspace test: `npm test --workspaces`
- [ ] Verify no new test failures (baseline: 0 failing tests)
- [ ] Commit all changes: `git add package*.json && git commit -m "fix: bump all dependencies to latest patch versions"`

### Post-Update Verification
```bash
# Verify all CVEs are gone
npm audit --json --workspaces | jq '.vulnerabilities | length'  # Should be 0 or very small

# Run full test suite
npm test --workspaces --if-present

# Check for any new audit issues
npm audit --audit-level=high --production
```

---

## Phase 3: Major Version Upgrades (Next Sprint)

**Priority:** 🟢 P3-BACKLOG | **Estimated Time:** 1-2 days | **Breaking changes expected**

### React 18 → 19 (Source/Frontend)
- [ ] Create feature branch: `git checkout -b chore/upgrade-react-19`
- [ ] Update: `npm update react react-dom`
- [ ] Run tests: `npm test`
- [ ] Check for deprecation warnings in console
- [ ] Test manually in dev environment
- [ ] Update any TypeScript types if needed
- [ ] Commit: `git commit -m "chore: upgrade react 18 -> 19"`

### React Router 6 → 7 (Source/Frontend)
- [ ] Update: `npm update react-router-dom`
- [ ] Run tests: `npm test`
- [ ] Check release notes for breaking changes
- [ ] Update route definitions if needed
- [ ] Commit: `git commit -m "chore: upgrade react-router-dom 6 -> 7 (fixes open redirect)"`

### Express 4 → 5 (Source/Backend + platform/orchestrator)
- [ ] **WARNING: Express 5 has breaking changes. Allocate 1 day for testing.**
- [ ] Read migration guide: https://expressjs.com/en/guide/migrating-5.html
- [ ] Create feature branch for each: `git checkout -b chore/upgrade-express-5`
- [ ] Update: `npm update express`
- [ ] Run tests: `npm test`
- [ ] Verify all route handlers work correctly
- [ ] Commit: `git commit -m "chore: upgrade express 4 -> 5"`

### Pino 8 → 10 (Source/Backend)
- [ ] Update: `npm update pino`
- [ ] Run tests: `npm test`
- [ ] Verify logging still works (check pino API changes)
- [ ] Commit: `git commit -m "chore: upgrade pino 8 -> 10 (better perf and features)"`

---

## Final Verification Checklist

After all fixes are complete:

- [ ] **All npm audits pass:** `npm audit --workspaces` returns 0 vulnerabilities
- [ ] **All tests pass:** `npm test --workspaces` shows 0 failures
- [ ] **No new test failures:** Baseline before fixes had X failures, now should still have X
- [ ] **Grade improved:** From D → B or higher (per inspector.config.yml rubric)
- [ ] **Learning updated:** Teams/TheInspector/learnings/dependency-auditor.md reflects fix status
- [ ] **Branch pushed:** All commits pushed to remote
- [ ] **PR created:** (if using GitHub) Create PR with all changes
- [ ] **CI/CD passes:** GitHub Actions or similar shows all checks green

---

## Commands Quick Reference

```bash
# Check current vulnerabilities
npm audit --json --workspaces | jq '.vulnerabilities | keys'

# List outdated packages
npm outdated --workspaces

# Update all (use with caution)
npm update --all

# Update specific package
npm update <package-name>

# Verify after fixes
npm audit --audit-level=moderate --production

# Run all tests
npm test --workspaces --if-present

# Check for specific vulnerability
npm ls <package-name>
```

---

## Escalation Points

**If you encounter:**

1. **Test failures after npm update:** Don't force-merge. Debug and fix the underlying issue.
   - Check release notes for breaking changes
   - Update code to match new API if needed
   - Roll back if unfixable, file issue for later

2. **Critical new CVE appears:** Stop and escalate to TheGuardians immediately
   - Run `npm audit --json` again
   - Document in Teams/TheInspector/findings/URGENT-{date}.md

3. **Dependency conflicts:** Some packages may have peer dependency issues
   - Read error message carefully
   - May need to update multiple packages together
   - Use `npm update <pkg1> <pkg2> <pkg3>` to fix together

---

## Timeline

| Phase | Duration | Deadline | Status |
|-------|----------|----------|--------|
| Critical Fixes | 2-3 hours | **TODAY** | ⏳ |
| Moderate Fixes | 1-2 hours | Tomorrow | ⏳ |
| Major Upgrades | 1-2 days | Next sprint | 📋 |
| Verification | 30 min | After each phase | ⏳ |
| Re-audit | 1 hour | 2026-07-08 | 📅 |

---

## Success Criteria

✅ **All fixes complete when:**
1. npm audit shows 0 critical and 0 high CVEs (moderate allowed for now)
2. npm test --workspaces passes with 0 new failures
3. All changes committed and pushed
4. Audit report shows Grade B or higher

---

**Created:** 2026-06-08  
**Last Updated:** 2026-06-08  
**Next Review:** After all Phase 1 & 2 fixes complete
