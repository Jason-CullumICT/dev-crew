# 🚨 CRITICAL ACTIONS — Dependency Audit 2026-10-30

**Status:** ⚠️ **URGENT** — 12 Critical CVEs detected  
**Generated:** 2026-10-30  
**Severity Grade:** D (requires immediate action)

---

## Top 5 Packages to Update TODAY

### 1. **vitest** → Latest
```bash
cd Source/Frontend
npm install --save-dev vitest@latest

cd portal/Backend
npm install --save-dev vitest@latest
```

**Why:** Arbitrary file read/execute via UI server (GHSA-5xrq-8626-4rwp)  
**Impact:** If vitest UI is running in non-dev environment, attacker can read files and execute code  
**Verify:** Check that vitest UI is disabled in staging/production

---

### 2. **proxy-addr** → Latest (Via npm update)
```bash
# This is transitive — update packages that depend on it
# Usually via Express middleware update

cd Source/Backend && npm update
cd platform/orchestrator && npm update
cd portal/Backend && npm update
```

**Why:** IPv4-mapped IPv6 spoofing bypasses IP-based access controls (GHSA-jqcg-44mw-7w3h)  
**Impact:** Attacker can spoof IP to bypass rate limiting, IP whitelist, or IP-based auth  
**Verify:** Audit all IP-based access control logic with security team

---

### 3. **protobufjs** → Latest
```bash
cd platform/orchestrator && npm update protobufjs
cd portal/Backend && npm update protobufjs
```

**Why:** Arbitrary code execution in protobuf message parsing (GHSA-xq3m-2v4x-88gg)  
**Impact:** Malformed protobuf message can trigger RCE  
**Verify:** Check what messages are parsed and if any come from untrusted sources

---

### 4. **handlebars** → Latest
```bash
cd Source/Backend && npm update handlebars
```

**Why:** JavaScript injection via AST tampering (GHSA-3mfm-83xf-c92r)  
**Impact:** Attacker can inject JavaScript into templates  
**Verify:** Audit template rendering — are any templates rendered with user input?

---

### 5. **tinypool** → Latest (Via vitest update)
```bash
# tinypool is a transitive dep of vitest
# Updating vitest above will update tinypool
```

**Why:** Prototype pollution RCE in worker options (GHSA-5gmw-xhrv-c9v3)  
**Impact:** Malformed worker configuration can trigger RCE  

---

## Immediate Configuration Changes

### ✋ Disable Vitest UI Server in Non-Dev
If you have any vitest config that runs the UI server:

**vite.config.ts / vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    ui: process.env.NODE_ENV === 'development', // Only in dev
    // OR
    ui: false, // Disable entirely if not needed
  }
});
```

**Environment-based:**
```bash
# .env.staging
VITEST_UI_ENABLED=false

# .env.production
VITEST_UI_ENABLED=false

# .env.development
VITEST_UI_ENABLED=true
```

---

## Security Team Actions

### 🔴 Escalate to TheGuardians

**DEP-003 (proxy-addr):**
- [ ] Audit IP-based access control logic
- [ ] Test IP spoofing scenarios with red-teamer
- [ ] Verify trusted proxy configuration in reverse proxy

**DEP-004 (protobufjs):**
- [ ] Review protobuf message parsing code
- [ ] Identify all message sources (are they untrusted?)
- [ ] Add message validation layer if needed

**DEP-005 (handlebars):**
- [ ] Audit all template rendering in Source/Backend
- [ ] Check if any templates process user input
- [ ] Add template escaping where needed

**DEP-009 (form-data CRLF injection):**
- [ ] Test file upload with crafted filenames (e.g., `file.txt\r\nX-Injected: header`)

---

## Development Team Actions

### 🟡 Update & Test

1. **Create a branch:**
   ```bash
   git checkout -b chore/critical-dep-updates
   ```

2. **Update each project:**
   ```bash
   cd Source/Backend && npm install --save-dev vitest@latest handlebars@latest
   cd Source/Frontend && npm install --save-dev vitest@latest
   cd platform/orchestrator && npm install protobufjs@latest
   cd portal/Backend && npm install --save-dev vitest@latest protobufjs@latest
   cd portal/Frontend && npm install --save-dev vitest@latest
   ```

3. **Run full test suite:**
   ```bash
   npm test --workspaces --if-present
   python3 tools/traceability-enforcer.py
   ```

4. **Commit & push:**
   ```bash
   git add -A
   git commit -m "chore: update critical vulnerable dependencies

   - vitest: GHSA-5xrq-8626-4rwp (file read/exec via UI)
   - tinypool: GHSA-5gmw-xhrv-c9v3 (prototype pollution RCE)
   - proxy-addr: GHSA-jqcg-44mw-7w3h (IP spoofing)
   - protobufjs: GHSA-xq3m-2v4x-88gg (arbitrary code execution)
   - handlebars: GHSA-3mfm-83xf-c92r (JS injection via AST)
   
   See Teams/TheInspector/findings/dependency-audit-2026-10-30.md"
   ```

5. **Verify in CI/CD:**
   - [ ] All tests pass
   - [ ] No new vulnerabilities introduced
   - [ ] npm audit shows reduced critical count

---

## Deployment Verification

After updates are merged:

1. **Verify vitest UI is disabled in staging:**
   ```bash
   curl http://staging:5173/__vitest__ 2>&1 | grep -q "404\|refused"
   echo "✅ vitest UI is inaccessible" || echo "❌ vitest UI is exposed!"
   ```

2. **Re-run npm audit:**
   ```bash
   npm audit --json | jq '.metadata.vulnerabilities'
   # Should show reduced critical/high counts
   ```

3. **Security team spot-check:**
   - [ ] Test IP spoofing scenario (proxy-addr)
   - [ ] Test protobuf parsing with malformed messages
   - [ ] Test template rendering with template injection

---

## Rollback Plan

If updates break anything:

```bash
git revert <commit-sha>
npm ci --workspaces
npm test --workspaces --if-present
# Investigate specific package version constraints
```

---

## Follow-up Actions (This Sprint)

- [ ] Update 18 high-severity packages (see full report)
- [ ] Add `npm audit` to CI/CD pipeline (fail on critical/high)
- [ ] Review and disable any dev-only tools exposed in production
- [ ] Schedule dependency review meeting with TheGuardians

---

## Files to Review

- **Full Report:** `Teams/TheInspector/findings/dependency-audit-2026-10-30.md`
- **JSON Summary:** `Teams/TheInspector/findings/dependency-audit-summary-2026-10-30.json`
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`

---

**Report Generated By:** Dependency Auditor Agent  
**Questions?** Escalate to TheInspector team lead or TheGuardians for security guidance.
