# Dependency Audit Remediation Checklist

**Audit Date:** 2026-07-09  
**Grade:** C (Critical & High vulnerabilities present)  
**Owner:** Dev Team / Tech Lead

---

## IMMEDIATE ACTIONS (This Week)

### ☐ 1. Vitest Critical RCE Fix
- [ ] Review [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) advisory
- [ ] Upgrade vitest: `cd Source/Frontend && npm install vitest@^3.2.6 --save-dev`
- [ ] Run full test suite: `npm test`
- [ ] Verify UI server no longer exposes files (if UI is used)
- [ ] Commit: "security: patch vitest critical file read vulnerability"
- **Timeline:** Must complete before merging any PR

### ☐ 2. Handlebars Critical Code Injection
- [ ] Run audit fix: `npm audit fix` (both Backend and Frontend)
- [ ] Identify root dependency pulling in handlebars: `npm ls handlebars`
- [ ] Document finding in Team learnings
- [ ] If no fix available, escalate to TheGuardians
- **Timeline:** Must complete this sprint

### ☐ 3. form-data CRLF Injection
- [ ] Upgrade form-data: `npm install form-data@^4.0.6`
- [ ] If multipart file uploads exist, test them end-to-end
- [ ] Look for CRLF patterns in filenames during testing
- **Timeline:** This week alongside other patches

---

## SHORT-TERM (This Sprint)

### ☐ 4. Vite Path Traversal Fixes
- [ ] Upgrade vite: `npm install vite@^6.4.3 --save-dev` (or latest 5.x patch)
- [ ] Test dev server on Windows if applicable
- [ ] Run `npm run build` and verify artifacts are correct
- [ ] Check if dev server `fs.deny` is configured; if so, test it still works
- **Timeline:** Before next dev server release

### ☐ 5. react-router Open Redirect CVE
- [ ] Upgrade react-router-dom: `npm install react-router-dom@^6.30.4`
- [ ] Test all routing transitions and redirects
- [ ] Look for any paths starting with `//` in route configs
- [ ] Commit: "security: patch react-router open redirect vulnerability"
- **Timeline:** Before next release

### ☐ 6. Run Full Audit & Test Suite
```bash
# Both Backend and Frontend
npm audit
npm test
npm run build
npm run typecheck
```
- [ ] Zero test failures
- [ ] Build succeeds
- [ ] Typecheck passes
- [ ] Commit all changes

---

## MEDIUM-TERM (Next Sprint)

### ☐ 7. ws Memory Exhaustion DoS
- [ ] Verify ws is actually used (likely transitive from dev tools)
- [ ] If WebSocket feature exists, test under load
- [ ] Upgrade ws: `npm install ws@^8.21.0` or `^9.x`
- [ ] Test WebSocket connections still work
- **Timeline:** Next sprint

### ☐ 8. Pino Logging Library Upgrade
- [ ] Plan pino upgrade: 8.x → 10.x (MAJOR VERSION)
- [ ] Review pino 10.x breaking changes: https://getpino.io
- [ ] Test logging output in dev and production
- [ ] Update any log format configurations
- [ ] Consider: Can stay on 8.x if major version bump is too risky
- **Timeline:** Plan for next major release cycle

### ☐ 9. Express.js Framework Upgrade (Optional)
- [ ] Decide: Upgrade to Express 5.x, or stay on 4.22.x?
- [ ] If upgrading to 5.x:
  - [ ] Review Express 5.0.0 migration guide
  - [ ] Update error handling middleware
  - [ ] Test all routes
  - [ ] Update any deprecated middleware
- [ ] If staying on 4.x:
  - [ ] `npm install express@^4.22.2` (patch update, safer)
- **Timeline:** Next minor release cycle

---

## OPTIONAL (Next Release Cycle)

### ☐ 10. React 19 Migration
- [ ] Decide: Optional, can stay on 18.x
- [ ] If migrating: Review React 19 changelog
- [ ] Test all components
- [ ] Check for deprecated patterns (old Context, old hooks, etc.)
- **Timeline:** When convenient; no security driver

### ☐ 11. UUID Upgrade
- [ ] Low-risk: `npm install uuid@^14`
- [ ] Can batch with other non-critical updates
- **Timeline:** Next patch release

---

## VERIFICATION CHECKLIST

After completing all fixes:

### ☐ Security Verification
- [ ] Run `npm audit` again — zero critical/high vulns remaining
- [ ] Review [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) (Vitest) — exploit no longer works
- [ ] Run `npm ls handlebars` — version is patched or removed

### ☐ Functional Verification
- [ ] All unit tests pass: `npm test --workspaces --if-present`
- [ ] Build succeeds: `npm run build --workspaces --if-present`
- [ ] TypeScript check passes: `npm run typecheck --workspaces --if-present`
- [ ] Manual smoke test of critical flows:
  - [ ] Backend: `/api/work-items` list endpoint returns data
  - [ ] Backend: Work item state transitions work
  - [ ] Frontend: App loads and routing works
  - [ ] Frontend: File uploads work (if applicable) — test multipart form
  - [ ] Frontend: WebSockets connect (if used)

### ☐ Deployment Verification
- [ ] Commit all changes with descriptive messages
- [ ] Create PR with link to audit report
- [ ] Update CHANGELOG with security fixes
- [ ] Run full CI/CD pipeline
- [ ] Deploy to staging and verify
- [ ] Deploy to production

---

## ESCALATION POINTS

If you get stuck:

### TheGuardians (Security Specialists)
- Handlebars critical vulnerability requires security review
- Vitest UI server file read — verify attack surface
- form-data CRLF injection — if multipart feature is exposed to untrusted input

### TheInspector (Architecture/Quality)
- Help understanding Vite/Vitest vulnerabilities
- Guidance on whether to upgrade major versions (pino, express)

### Dev Team Lead
- Decision on express 5.x vs 4.22.x
- Timeline approval for pino/express major upgrades

---

## Reference Documents

- **Full Audit Report:** `Teams/TheInspector/findings/dependency-audit-20260709.md`
- **Summary JSON:** `Teams/TheInspector/findings/dependency-audit-summary-20260709.json`
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`

---

## Sign-off

- [ ] Security review complete
- [ ] All immediate/short-term items completed
- [ ] Tests passing
- [ ] Ready to merge

**Assigned To:** _______________________  
**Completed By:** _______________________  
**Date:** _______________________

