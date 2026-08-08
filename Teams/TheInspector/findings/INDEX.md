# Dependency Auditor Findings — Index

**Audit Date:** 2026-08-08  
**Project:** dev-crew (AI orchestration platform)  
**Auditor:** dependency-auditor (Haiku model)  
**Grade:** C (1 critical CVE found, max 0 allowed)

---

## 📋 Quick Start

**For executives/stakeholders:**
→ Start with [EXECUTIVE SUMMARY](#executive-summary) below

**For developers (immediate action required):**
→ Read [REMEDIATION_STEPS.md](./REMEDIATION_STEPS.md) (Week 1 fixes)

**For security/DevOps teams:**
→ Read [dependency-audit-2026-08-08.md](./dependency-audit-2026-08-08.md) (full report)

**For dashboards/CI-CD:**
→ Use [dependency-audit-2026-08-08.json](./dependency-audit-2026-08-08.json) (structured data)

---

## 🎯 Executive Summary

### Critical Finding
**Handlebars.js RCE (CVSS 9.8)** — JavaScript injection via AST type confusion. Found in transitive chain (jest → @babel → handlebars). Requires immediate npm update.

### Other High-Severity Issues
- **brace-expansion DoS** (4 CVEs) — Glob pattern expansion causes OOM
- **js-yaml DoS** (3 CVEs) — YAML merge-key parsing causes CPU exhaustion
- **form-data CRLF** — Multipart headers vulnerable to injection

### Business Impact
- **Week 1 fixes needed** to pass security compliance
- **Grade upgrade** from C → B feasible with prompt action
- **No license/supply-chain blocking issues** detected

---

## 📊 Vulnerability Summary

| Severity | Count | Example | Timeline |
|----------|-------|---------|----------|
| CRITICAL | 1 | handlebars RCE | Fix Week 1 |
| HIGH | 8 | brace-expansion (4×), js-yaml (3×), form-data | Fix Week 1 |
| MODERATE | 9 | express+qs, uuid, @remix-run/router | Fix Week 2 |
| LOW | 4 | @babel/core, body-parser | Fix Month 1 |

**Total:** 22 CVEs (2 in direct dependencies, 11 in transitive)

---

## 📁 Files in This Directory

### Main Reports

**[dependency-audit-2026-08-08.md](./dependency-audit-2026-08-08.md)** (18 KB, 462 lines)
- Full vulnerability report
- Broken down by severity (P1, P2, P3, P4)
- CVSS scores, CWE classifications, exploitation context
- Actionable fix commands for each finding
- Cross-team escalation routing
- License compliance & abandoned package checks
- Supply chain risk assessment

**[dependency-audit-2026-08-08.json](./dependency-audit-2026-08-08.json)** (4.1 KB, 150 lines)
- Machine-readable structured data
- For dashboard integration, CI/CD pipelines
- Contains metrics, action items, dependency stats
- Can be imported into bug tracking systems

**[REMEDIATION_STEPS.md](./REMEDIATION_STEPS.md)** (7.2 KB, 319 lines)
- Step-by-step bash commands to fix all CVEs
- Organized by priority (Week 1, Week 2, Month 1)
- Testing & verification checklists
- Rollback procedures if updates break tests
- Escalation contacts for blockers

---

## 🚨 Critical Actions (This Week)

1. **Read the full report**
   ```bash
   cat dependency-audit-2026-08-08.md
   ```

2. **Escalate to TheGuardians**
   - handlebars CRITICAL RCE (needs security sign-off)
   - uuid buffer bounds (needs code review)

3. **Begin Week 1 fixes**
   ```bash
   # Apply all critical + high CVE fixes
   npm update handlebars brace-expansion js-yaml form-data
   cd Source/Backend && npm update express uuid
   cd Source/Frontend && npm update react-router-dom
   npm test --workspaces  # Verify no breakage
   npm audit  # Confirm 0 critical
   ```

4. **Report progress**
   - Update TheInspector dashboard with fixed metrics
   - Notify team of completion

---

## 📞 Cross-Team Escalations

| Team | Issue | Action |
|------|-------|--------|
| **TheGuardians** | handlebars RCE (CVSS 9.9) | Verify no user-controlled template compilation |
| **TheGuardians** | uuid buffer bounds | Audit buffer-passing patterns in Source/Backend |
| **red-teamer** | brace-expansion DoS | Check if /api/work-items/* accepts glob patterns |
| **performance-profiler** | js-yaml quadratic CPU | Monitor spec-upload endpoints for latency spikes |

---

## 📈 Metrics at a Glance

- **Direct Dependencies:** 27 (2 with CVEs)
- **Transitive Dependencies:** ~190 (11 with CVEs)
- **Outdated Major Versions:** 6
- **License Issues:** 0 ✅
- **Abandoned Packages:** 0 ✅
- **Grade:** C (improvement to B possible with Week 1 fixes)

---

## 🔄 Audit Timeline

| Phase | Duration | Action | Success Criteria |
|-------|----------|--------|------------------|
| **Week 1** | 7 days | Fix critical + high CVEs | npm audit: 0 critical |
| **Week 2** | 7 days | Fix moderate CVEs | npm audit: 0 high |
| **Month 1** | weeks 3-4 | Plan strategic migrations | Grade C → B achieved |
| **Ongoing** | 30-day cycles | Re-audit, track progress | Maintain Grade B+ |

---

## 💡 Key Learnings

1. **DoS via unbounded parsing** is a recurring pattern
   - Packages: brace-expansion, js-yaml, qs
   - Mitigation: Add API-level input size limits

2. **Transitive dependencies are hard to spot**
   - 11 of 22 CVEs are indirect (not direct dependencies)
   - Best practice: Run `npm audit` regularly in CI/CD

3. **Build tools bring in unexpected chains**
   - handlebars found in jest → @babel → handlebars chain
   - Scan devDependencies separately for visibility

4. **Handlebars appears in orchestration platforms**
   - Common in spec-processing systems
   - Monitor for both template injection and code generation risks

---

## 📖 How to Read Each File

### dependency-audit-2026-08-08.md (for humans)
1. Read **Vulnerability Summary by Severity** section first
2. Focus on P1/P2 sections (critical + high priority)
3. Follow the "Fix" command in each finding
4. Check "Cross-ref" for escalations to other teams
5. Review the **Actionable Fixes** section for timeline

### dependency-audit-2026-08-08.json (for machines)
1. Use `jq '.summary'` to get overview metrics
2. Use `jq '.critical_findings'` for immediate actions
3. Use `jq '.action_items'` for task backlog
4. Use `jq '.dependency_stats'` for supply chain risk assessment

### REMEDIATION_STEPS.md (for execution)
1. Start with **IMMEDIATE FIXES (Week 1)**
2. Copy/paste the bash commands step by step
3. Run tests after each phase
4. If tests fail, follow **ROLLBACK PROCEDURE**
5. If blocked, contact escalation team

---

## 🎓 Understanding the Grade

**Grade: C**

Reason: 1 critical CVE found (handlebars RCE), but max 0 critical allowed for Grade B+.

**Recovery path:**
```
Current: 1 critical, 3 P1 findings (high CVEs) → Grade C
After Week 1: 0 critical, 0 high → Grade B
After Month 1: Strategic migrations complete → Grade A eligible
```

---

## ⏱️ Estimated Time to Fix

| Phase | Duration | Effort | Blocking |
|-------|----------|--------|----------|
| Week 1 (critical) | 2-4 hours | 2-3 devs | High priority |
| Week 2 (secondary) | 1-2 hours | 1 dev | Medium priority |
| Month 1 (strategic) | 8-16 hours | 1 dev (per migration) | Low priority |

**Total:** ~15-25 hours spread over 4 weeks

---

## ✅ Next Steps

- [ ] Read dependency-audit-2026-08-08.md
- [ ] Open findings with TheGuardians (handlebars, uuid)
- [ ] Ask red-teamer to check /api/work-items for glob patterns
- [ ] Execute REMEDIATION_STEPS.md Week 1 fixes
- [ ] Run npm test --workspaces
- [ ] Verify npm audit shows 0 critical
- [ ] Report success to TheInspector dashboard

---

## 📅 Review Schedule

- **Next audit:** 2026-09-08 (30 days)
- **Or:** After Week 1 fixes applied (whichever is sooner)
- **Frequency:** Monthly (built into dev-crew CI/CD)

---

**Audit Report Generated:** 2026-08-08  
**Auditor:** dependency-auditor (Haiku model)  
**Status:** ✅ COMPLETE
