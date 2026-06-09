# Dependency Audit Summary
**Audit Date:** 2026-06-09  
**Auditor:** Dependency Auditor (dependency_auditor)  
**Overall Grade:** 🔴 **C** — 2 Critical CVEs present

---

## ⚠️ CRITICAL — Fix Immediately

### 🔴 Handlebars RCE (8 CVEs, CVSS 9.8)
- **Where:** Source/Backend (via express → handlebars)
- **What:** JavaScript injection allows arbitrary code execution
- **Impact:** RCE if handlebars templates are processed
- **Fix:** `cd Source/Backend && npm update express`
  - Current: 4.18.2 → Target: 4.22.2 (patch) or 5.2.1 (major)

### 🔴 Vitest UI File Read/Execute (CVSS 9.8)
- **Where:** Source/Frontend (vitest dev dependency)
- **What:** UI server allows reading & executing any file on system
- **Impact:** Attacker on localhost or network can exfil secrets
- **Fix:** `cd Source/Frontend && npm update vitest`
  - Current: 2.0.5 → Target: 3.2.6+

### 🟠 UUID Buffer Overflow (CVSS 7.5)
- **Where:** Source/Backend (uuid production dependency)
- **What:** Missing bounds check allows buffer overflow
- **Impact:** Memory corruption or info disclosure
- **Fix:** `cd Source/Backend && npm update uuid`
  - Current: 9.0.0 → Target: 9.0.1 (patch) or 11.1.1+ (major)

---

## 📊 Vulnerability Counts

| Severity | Backend | Frontend | E2E | Total |
|----------|---------|----------|-----|-------|
| Critical | 1 | 1 | 0 | **2** |
| High | 0 | 0 | 0 | **0** |
| Moderate | 5 | 8 | 0 | **13** |
| **Total** | **6** | **9** | **0** | **15** |

---

## 🔧 Quick Fix Commands

```bash
# Backend (Source/Backend)
cd Source/Backend
npm update uuid express pino prom-client

# Frontend (Source/Frontend)
cd Source/Frontend
npm update vitest react-router-dom postcss ws

# Verify
npm audit
```

---

## 📈 Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Direct Dependencies | 8 | ✓ Very clean |
| Transitive Dependencies | 115 | ✓ Healthy |
| License Compliance | 100% MIT/Apache | ✓ No GPL risk |
| Abandoned Packages | 0 | ✓ All maintained |
| Post-Install Scripts | 0 | ✓ Safe |

---

## 🎯 Path to Grade B

1. **Update vitest** → 3.2.6+ (fixes P1)
2. **Update uuid** → 9.0.1+ (fixes P2)
3. **Update express** → 4.22.2 (fixes P1 root cause)
4. Resolve remaining moderate CVEs (react-router, postcss, ws)
5. **Grade will improve to B** once audit passes

---

## 📝 Detailed Reports

- **Full findings:** `dependency-audit-2026-06-09.md`
- **JSON export:** `dependency-audit-2026-06-09.json`
- **Learnings:** `../learnings/dependency-auditor.md`

---

## 🚩 Escalation Notes

**[CROSS-REF: TheGuardians]**
- Both P1 CVEs (Handlebars + Vitest) are RCE/data-exfil risks
- Request exploitation risk assessment if these are public-facing

**[CROSS-REF: TheFixer]**
- No breaking changes needed for all fixes (npm update handles it)
- Updates can be combined into single PR per module
