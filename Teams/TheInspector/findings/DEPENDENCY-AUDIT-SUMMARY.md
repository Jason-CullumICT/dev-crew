# Dependency Audit Summary (2026-06-03)

**Grade:** B | **Status:** Review Required | **Scope:** Source/Backend, Source/Frontend

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total CVEs | 13 (critical: 2, moderate: 11) |
| Outdated Major Versions | 6 |
| License Issues | 0 ✓ |
| Abandoned Packages | 0 ✓ |
| Production Dependencies | 111 |
| Transitive Dependencies | 643 |

---

## 🔴 Critical Findings (Require Action)

### 1. **Handlebars.js RCE** (DEP-002)
- **Package:** handlebars 4.7.8
- **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
- **Type:** JavaScript injection via AST confusion
- **Location:** Backend (dev dependency via jest → ts-jest)
- **Risk:** Dev-only; low production risk
- **Fix:** `npm update jest ts-jest` (pulls handlebars 4.7.9+)
- **Urgency:** Next sprint

### 2. **UUID Buffer Overflow** (DEP-005)
- **Package:** uuid 9.0.0
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Type:** Missing bounds check in v3/v5/v6 with buffer
- **Location:** Backend (direct dependency)
- **Risk:** **LOW** (backend uses v4 only, no buffer param)
- **Fix:** Audit usage; update to 9.0.1+ if safe
- **Urgency:** This week (verification only)

---

## 🟡 High Priority (Plan Next Sprint)

| Finding | Package | Issue | Fix |
|---------|---------|-------|-----|
| **DEP-003** | qs@6.15.1 | DoS crash on null array elements | `npm update express` (4.18.2 → 4.22.2) |
| **DEP-006** | vite@5.4.0 | Path traversal + CORS bypass (dev-time) | `npm update vite` (5.4.0 → 5.5.0+) |
| **DEP-009** | vitest@2.0.5 | Cascading mocker/vite-node vulns (dev) | Mitigation: no `--ui` in CI |

---

## 📦 Outdated Major Versions (Update in Routine Maintenance)

| Package | Current | Latest | Recommended | Gap | Action |
|---------|---------|--------|-------------|-----|--------|
| express | 4.18.2 | 5.2.1 | 4.22.2 | +1.2 | Security patches |
| pino | 8.17.0 | 10.3.1 | 8.21.0 | +2.2 | Perf fixes |
| uuid | 9.0.0 | 14.0.0 | 9.0.1+ | +5.0 | Buffer CVE hotfix |
| react | 18.3.1 | 19.2.7 | 18.3.1 | +1.0 | Plan separate migration |
| react-dom | 18.3.1 | 19.2.7 | 18.3.1 | +1.0 | Plan separate migration |
| react-router-dom | 6.26.0 | 7.16.0 | 6.30.4+ | +0.4 | Minor improvements |

---

## ✅ What's Good

- ✓ **No GPL/AGPL licenses** detected (no viral risk)
- ✓ **No post-install scripts** in direct dependencies (clean supply chain)
- ✓ **No abandoned packages** detected
- ✓ **No duplicate versions** in dependency tree (resolution is clean)
- ✓ **Production surface lean:** Only 111 production dependencies
- ✓ **Dev isolated:** 532 dev dependencies don't ship with app

---

## 📋 What to Do This Week

1. **Verify uuid usage** (5 min)
   ```bash
   grep -r "uuid\.(v[356].*buf|v4)" Source/Backend/src/
   # Expected: Only uuid.v4() calls, no buf parameter
   ```

2. **Test audit fixes** (10 min)
   ```bash
   cd Source/Backend && npm audit fix --dry-run
   cd ../Frontend && npm audit fix --dry-run
   # Review changes before applying
   ```

3. **Document decision** (2 min)
   - If uuid v4-only: Proceed to sprint work
   - If uuid v3/v5/v6 with buf: Escalate to security review

---

## 📅 What to Do Next Sprint

### Backend Updates
```bash
cd Source/Backend
npm update express uuid --save          # Fixes DEP-003, DEP-005, DEP-004
npm update jest ts-jest --save-dev      # Fixes DEP-002
npm test --forceExit                    # Verify no regressions
```

### Frontend Updates
```bash
cd Source/Frontend
npm update vite --save                  # Fixes DEP-006
npm test                                # Verify no regressions
```

### Verification
```bash
# All tests pass
npm test --workspaces --if-present

# Audit is clean (or only shows new/expected items)
npm audit
```

---

## 🚨 Escalation Notes

**To TheGuardians (Security):**
- [ ] If backend processes user-supplied Handlebars templates → DEP-002 becomes P1
- [ ] If vite dev server is exposed to untrusted networks → DEP-006 becomes P1
- [ ] UUID v3/v5/v6 usage with caller buffers → DEP-005 requires security sign-off

**To TheFixer:**
- Route all npm update commits to TheFixer pipeline for QA/test verification

---

## 📊 Full Report

See detailed findings in:
- **Markdown:** `Teams/TheInspector/findings/dependency-audit-2026-06-03.md`
- **JSON:** `Teams/TheInspector/findings/dependency-audit-summary-2026-06-03.json`

---

## 🔄 Next Audit

Scheduled: **2026-07-03** (30 days)  
Trigger: Monthly CVE check + after each npm update

---

**Audit by:** Dependency Auditor (TheInspector Team)  
**Date:** 2026-06-03
