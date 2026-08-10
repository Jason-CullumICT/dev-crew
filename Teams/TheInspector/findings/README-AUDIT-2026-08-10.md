# Dependency Audit — 2026-08-10

**Completion Status:** ✅ COMPLETE  
**Auditor:** dependency-auditor  
**Grade:** C (3 critical CVEs; up to B after Phase 1 fixes)  
**Severity:** 🔴 URGENT — 3 RCE + DoS vulnerabilities

---

## Documents in This Audit

| Document | Purpose | Audience |
|----------|---------|----------|
| **audit-2026-08-10.md** | Full technical report with CVE details, remediation, cross-refs | Security team, developers, auditors |
| **ACTION-ITEMS-2026-08-10.md** | Executive summary with deadlines and rollback plan | Tech leads, project managers |
| **cve-summary-2026-08-10.json** | Machine-readable summary for dashboards/automation | CI/CD, reporting systems |
| **README-AUDIT-2026-08-10.md** | This document — navigation guide | Everyone |

---

## Key Findings at a Glance

### 📊 Numbers
- **47 total CVEs** across 6 npm projects
- **3 Critical (P1):** RCE + DoS vulnerabilities
- **11 High (P2):** Injection, path traversal, open redirect
- **20 Moderate (P3):** Various DoS and encoding issues
- **13 Low (P4):** Informational, disputed

### 🔴 Urgent Fixes (This Week)
1. **Vitest RCE** — dev UI server arbitrary code execution
2. **protobufjs RCE** — proto file parsing arbitrary code execution
3. **@grpc/grpc-js DoS** — server crash on malformed requests
4. **Vite path traversal** — Windows fs.deny bypass + path traversal
5. **uuid buffer bounds** — missing bounds check in v3/v5/v6

### 📈 By Project
| Project | Risk | Deps | P1 | P2 | P3 | Action |
|---------|------|------|----|----|----|----|
| Source/Backend | 🟠 MODERATE | 411 | 1 | 3 | 4 | Fix uuid, js-yaml, qs |
| Source/Frontend | 🔴 HIGH | 230 | 1 | 5 | 6 | Fix vitest, vite (both breaking) |
| Source/E2E | ✅ CLEAN | 4 | 0 | 0 | 0 | Monitor |
| platform/orchestrator | 🔴 CRITICAL | 155 | 1 | 2 | 6 | Fix protobufjs, @grpc (breaking) |
| portal/Frontend | 🔴 HIGH | 230 | 1 | 5 | 6 | Same as Source/Frontend |
| portal/Backend | 🔴 HIGH | 155 | 1 | 2 | 6 | Same as platform/orchestrator |

---

## What to Read First

### 1️⃣ If You're a Tech Lead or Manager
**→ READ:** `ACTION-ITEMS-2026-08-10.md`
- 2-page executive summary
- Deadlines: EOW for critical, 2 weeks for high
- Rollback plan
- Timeline

### 2️⃣ If You're the Frontend Owner
**→ READ:** `ACTION-ITEMS-2026-08-10.md` + `audit-2026-08-10.md` (search "Source/Frontend")
- **This Week:** Fix vitest (3.2.5 → 3.2.6) and vite (6.4.1 → 8.2.1)
  - ⚠️ Both are breaking changes; test in isolated branch first
- **Next 2 weeks:** form-data, ws, nanoid, react-router-dom
- **Next sprint:** React 18 → 19, react-router 6 → 7

### 3️⃣ If You're the Backend Owner
**→ READ:** `ACTION-ITEMS-2026-08-10.md` + `audit-2026-08-10.md` (search "Source/Backend")
- **This Week:** Fix uuid (9.0.1 → 11.1.1)
- **Next 2 weeks:** js-yaml, qs, body-parser
- **Next sprint:** express 4 → 5, pino 8 → 10

### 4️⃣ If You're the Platform/Orchestrator Owner
**→ READ:** `ACTION-ITEMS-2026-08-10.md` + `audit-2026-08-10.md` (search "platform/orchestrator")
- **This Week:** Fix protobufjs (7.x → 8.x) and @grpc/grpc-js (1.14.3 → 1.14.4)
  - ⚠️ protobufjs is a breaking change; requires code review
- **Next 2 weeks:** path-to-regexp, @opentelemetry
- **Note:** 153 production dependencies; highest risk in codebase

### 5️⃣ If You're the Security Team (TheGuardians)
**→ READ:** `audit-2026-08-10.md` (sections "Critical Findings" + "Cross-Team Escalations")
- **Escalations:** 4 findings require security assessment
  - Vitest RCE: dev-build hardening
  - protobufjs RCE: .proto input validation
  - @grpc/grpc-js DoS: endpoint exposure
  - js-yaml DoS: YAML config validation
- **License check:** ✅ Compliant (no GPL/AGPL)
- **Supply chain:** 🔴 HIGH RISK on platform/orchestrator (155 prod deps)

### 6️⃣ If You Need to Present This to Leadership
**→ USE:** `cve-summary-2026-08-10.json` (structured data) + summary below

---

## 60-Second Summary

**We found 47 CVEs. 3 are critical and need fixing this week.**

| CVE | Package | Risk | Fix |
|-----|---------|------|-----|
| Vitest UI RCE | vitest < 3.2.6 | Code execution in dev | npm install vitest@3.2.6+ |
| protobufjs RCE | protobufjs ≤ 7.6.4 | Code execution on proto load | npm install protobufjs@8.0.0+ |
| gRPC DoS | @grpc/grpc-js 1.14.0-3 | Server crash | npm install @grpc/grpc-js@1.14.4+ |

**Plus 11 more high-severity vulnerabilities** in injection, path traversal, and denial of service.

**Grade: C** (would be B after Phase 1 fixes)

---

## Remediation Timeline

```
This Week (EOW 2026-08-14)
├── Frontend: vitest, vite updates + tests
├── Backend: uuid update + tests
├── Platform: protobufjs, @grpc/grpc-js updates + tests
└── QA: Run full test suite, verify 0 new failures

Next 2 Weeks (by 2026-08-28)
├── All teams: Deploy Phase 2 (moderate severity)
├── All teams: Major version upgrade planning
└── QA: Smoke tests on staging

Next Sprint
└── All teams: Deploy Phase 3 (express, pino, react upgrades)
```

---

## How to Use This Report

### For Developers
1. Open `ACTION-ITEMS-2026-08-10.md`
2. Find your team's section
3. Run the fixes provided
4. Run `npm test`
5. Commit and PR

### For QA / Test Engineers
1. Open `ACTION-ITEMS-2026-08-10.md` → "Testing & Validation Checklist"
2. After Phase 1 updates, run full test suite
3. Manual smoke test (work item CRUD)
4. Verify zero new failures

### For Security / Auditors
1. Open `audit-2026-08-10.md` → "Critical Findings" + "Cross-Team Escalations"
2. Assess each escalation
3. Document input validation requirements
4. Follow up on orchestrator (high risk)

### For Automation / CI/CD
1. Use `cve-summary-2026-08-10.json`
2. Parse `critical` and `high` arrays
3. Block deployments if critical count > 0
4. Generate reports from `remediation_phases` section

---

## FAQ

### Q: Why is platform/orchestrator marked HIGH RISK?
A: It has 153 production dependencies (vs. ~100-150 dev deps in other projects) and includes protobufjs/gRPC with critical CVEs. The entire pipeline runs on it, so any vulnerability here affects all agent execution.

### Q: Why are some updates marked "breaking"?
A: vitest 3→4, vite 6→8, and protobufjs 7→8 have API changes. We recommend:
1. Test in an isolated branch first
2. Have the owner team review code changes needed
3. Don't merge to main until tests pass
4. Have a rollback plan ready

### Q: Do we need to fix all 47 CVEs?
A: No, prioritize by phase:
- **Phase 1 (CRITICAL):** Vitest, protobufjs, @grpc/grpc-js, uuid, vite — must fix EOW
- **Phase 2 (HIGH):** js-yaml, qs, form-data, ws, etc. — fix within 2 weeks
- **Phase 3 (MAJOR):** express, react, pino — schedule next sprint
- **Moderate/Low:** Monitor; can be batched into regular maintenance

### Q: Will these updates break our app?
A: **Phase 1 updates (vitest, vite, protobufjs) are breaking; others are safe.** Vitest and vite changes are build/dev artifacts, not runtime code. protobufjs changes require code review but are unlikely to break (unless `.proto` file format changed). Test thoroughly.

### Q: What if Phase 1 breaks our build?
A: Expected for breaking updates. The owner team should:
1. Review error messages
2. Update code (if needed)
3. Run tests locally
4. Commit code + dependency changes together
5. If stuck, escalate to TheGuardians

### Q: Can we defer Phase 1?
A: **No.** Phase 1 includes 3 RCEs. These are exploitable and must be fixed ASAP. The vitest and vite issues are dev-time only (not production), but protobufjs affects the orchestrator, which is critical infrastructure.

### Q: Should we notify users?
A: No CVE disclosures are needed. These are internal dependency updates. If this were a public service, you'd want to audit the impact post-update.

### Q: Where do we report this to leadership?
A: Use **cve-summary-2026-08-10.json** for automated dashboards, or present this README + ACTION-ITEMS doc.

---

## Timeline by Team

### **Frontend Team**
- **This Week:** `npm install vitest@3.2.6 vite@8.2.1` (both breaking; test first)
- **Next 2 weeks:** form-data, ws, nanoid, react-router-dom
- **Next sprint:** React 18→19 major version
- **Dependency count:** 230 transitive (manageable)

### **Backend Team**
- **This Week:** `npm install uuid@11.1.1`
- **Next 2 weeks:** js-yaml, qs, body-parser
- **Next sprint:** express 4→5, pino 8→10 (both major versions)
- **Dependency count:** 411 transitive (large; 310 are dev deps for jest/ts-jest)

### **Platform / Orchestrator Team**
- **This Week:** `npm install protobufjs@8.0.0 @grpc/grpc-js@1.14.4` (both potentially breaking)
- **Next 2 weeks:** path-to-regexp, @opentelemetry
- **Dependency count:** 155 (all production; HIGH RISK)
- **Critical:** protobufjs update requires code review; it's production infrastructure

### **QA / Test Engineers**
- **This Week:** After each team commits Phase 1 fixes, run full test suite
- **Checklist:** Tests, build, E2E, smoke test (provided in ACTION-ITEMS)
- **Gate:** 0 new failures allowed

### **Security (TheGuardians)**
- **Immediate:** Review escalations (4 items in audit-2026-08-10.md)
- **EOW:** Assess protobufjs code changes (if any)
- **Ongoing:** Monitor for future protobufjs issues (high CVE density)

---

## Success Criteria

✅ **Phase 1 passes** if:
- All critical CVE fixes are deployed
- npm test --workspaces returns 0 new failures
- Build succeeds in all projects
- Manual smoke test passes (work item CRUD)

✅ **Phase 2 passes** if:
- All high-severity CVE fixes are deployed
- Zero new test failures
- No regressions in critical paths

✅ **Phase 3 passes** if:
- All major version upgrades are deployed
- Tests pass
- Performance is maintained or improved (check metrics)

---

## Next Audit

**Scheduled:** After Phase 1 fixes are deployed (expect ~1 week)

**Scope:** Re-run `npm audit` on all projects to verify critical CVEs are resolved and no new issues introduced.

---

## Files in This Audit

```
Teams/TheInspector/findings/
├── audit-2026-08-10.md              (20 KB, full technical report)
├── ACTION-ITEMS-2026-08-10.md       (5.8 KB, executive summary)
├── cve-summary-2026-08-10.json      (8.4 KB, machine-readable)
├── README-AUDIT-2026-08-10.md       (this file)
└── [historical audits...]

Teams/TheInspector/learnings/
└── dependency-auditor.md             (updated with findings & watch list)
```

---

## Contact & Questions

**Questions?** Ask your team lead or security team.

**Want to understand a specific CVE?** → Open `audit-2026-08-10.md` and search for `DEP-XXX`

**Need JSON for automation?** → Use `cve-summary-2026-08-10.json`

**Ready to start fixing?** → Open `ACTION-ITEMS-2026-08-10.md` and follow the checklist

---

## Document Info

- **Generated:** 2026-08-10 by dependency-auditor
- **Confidence:** HIGH (npm audit v2 official data)
- **Tool:** npm audit --json + manual version analysis
- **Projects Scanned:** 10 (backend, frontend, E2E, orchestrator, portal, demos)
- **Reproducibility:** Run `npm audit --json` in each project to re-verify

---

**Status: AUDIT COMPLETE ✅**  
**Action Required: YES 🔴 URGENT**  
**Next Step: Read ACTION-ITEMS-2026-08-10.md**
