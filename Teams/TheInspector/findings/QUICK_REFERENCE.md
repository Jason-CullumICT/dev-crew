# Dependency Audit Quick Reference - 2026-11-01

## TL;DR

**Status:** 🔴 CRITICAL  
**Total CVEs:** 58 (6 critical, 15 high, 31 moderate, 6 low)  
**Action Required:** Within 24-48 hours  
**Full Report:** `audit-2026-11-01-critical.md`  

---

## Critical Issues - Fix Immediately

| Priority | Package | Location | Issue | Fix Command |
|----------|---------|----------|-------|------------|
| 1️⃣  | `express` | Backend, Orchestrator | IP spoofing bypass (proxy-addr) + DoS | `npm update express` |
| 2️⃣  | `vitest` | Frontend | Arbitrary file read + RCE | `npm update vitest` |
| 3️⃣  | `protobufjs` | Orchestrator | Arbitrary code execution | `npm update protobufjs` |
| 4️⃣  | `handlebars` | Backend (dev) | JavaScript injection (8 CVEs) | `npm update handlebars` |
| 5️⃣  | `@grpc/grpc-js` | Orchestrator | Server crash DoS | `npm update @grpc/grpc-js` |

---

## One-Liner Remediation

### Phase 1 (24-48 hours)
```bash
# Backend
cd Source/Backend && npm update express uuid

# Frontend  
cd Source/Frontend && npm update react-router-dom vitest vite

# Orchestrator
cd platform/orchestrator && npm update @grpc/grpc-js protobufjs express

# Verify
npm audit --json | grep -i critical  # Should return zero
```

### Phase 2 (1-2 weeks)
```bash
npm update jest postcss ws nanoid
npm update @babel/core form-data
```

### Verification
```bash
npm test --workspaces
npm audit --json  # Verify zero CRITICAL/HIGH
```

---

## Vulnerability Summary by Component

### Backend (Source/Backend)
- **Total:** 32 CVEs (2 critical, 5 high, 20 moderate, 5 low)
- **Blockers:**
  - Handlebars (8 JS injection vectors)
  - Proxy-addr (IP spoofing)
  - Body-parser (DoS)
  - Brace-expansion (6 DoS vectors)

### Frontend (Source/Frontend)
- **Total:** 17 CVEs (2 critical, 7 high, 7 moderate, 1 low)
- **Blockers:**
  - Vitest (arbitrary file read + RCE)
  - Tinypool (prototype pollution RCE)
  - Vite (8 path traversal/command execution vectors)
  - React Router (multiple open redirects)
  - Browserslist (memory exhaustion)

### Orchestrator (platform/orchestrator)
- **Total:** 9 CVEs (2 critical, 3 high, 4 moderate, 0 low)
- **Blockers:**
  - Protobufjs (10+ CVEs including RCE)
  - Proxy-addr (IP spoofing)
  - @grpc/grpc-js (server crash)
  - Body-parser (DoS)

---

## Escalations

**[ESCALATE → TheGuardians]**
- ⚠️ Proxy-addr IP spoofing bypasses access control
- ⚠️ Protobufjs RCE affects orchestrator infrastructure
- ⚠️ Handlebars template injection in test infrastructure
- ⚠️ Vitest arbitrary file read in CI/CD

**[ROUTE TO TheFixer]**
- Execute dependency updates
- Verify zero new test failures
- Merge to main with documented fixes

---

## Major Version Upgrades Needed

| Package | Current | Target | Majors | Risk |
|---------|---------|--------|--------|------|
| react-router-dom | 6.26.0 | 7.18.5 | 1 | CRITICAL (security) |
| vite | 5.4.0 | 8.3.5 | 3 | CRITICAL (security) |
| vitest | 2.0.5 | 5.0.5 | 3 | CRITICAL (security) |
| express | 4.18.2 | 5.3.0 | 1 | CRITICAL (security) |
| uuid | 9.0.0 | 14.0.3 | 5 | HIGH (buffer bounds) |

---

## Risk Assessment

**Dependency Tree:** 600+ transitive packages = LARGE ATTACK SURFACE

**High-Risk Packages (Consider Replacing):**
- `handlebars` - 8+ CVEs stacked → Use `ejs` or `mustache`
- `protobufjs` - 10+ CVEs → Evaluate `buf.build` ecosystem
- `jest` - Aging stack → Plan Vitest migration

---

## Resources

- **Full Report:** `audit-2026-11-01-critical.md` (23 KB, detailed CVE analysis)
- **JSON Findings:** `findings-2026-11-01.json` (structured data)
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`

---

## Next Steps

1. **Immediate (24h):** Execute Phase 1 npm updates above
2. **Verify (48h):** Run tests, verify zero CRITICAL/HIGH in `npm audit`
3. **Deploy (72h):** Merge to main and deploy to staging
4. **Smoke Test (72h):** Run full integration tests and manual verification
5. **Reaudit (14 days):** Schedule follow-up audit for 2026-11-15

---

**Questions?** Review full audit report or contact TheInspector team.
