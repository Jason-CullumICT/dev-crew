# TheInspector — System Health Audit
**Date:** 2026-07-16 · **Branch:** audit/inspector-2026-07-16-c67d22 · **Grade:** D

---

## Overall Grade: D 🔴

**Rationale:** 4 P1 findings (3 critical CVEs + 1 broken endpoint) exceed the C-grade ceiling of `max_p1: 2`. 11 P2 findings within D range.

**Grade thresholds (inspector.config.yml):**
| Grade | max_p1 | max_p2 | Result |
|-------|--------|--------|--------|
| A | 0 | 3 | ✗ |
| B | 0 | 8 | ✗ |
| C | 2 | 15 | ✗ — 4 P1 exceeds cap of 2 |
| **D** | 999 | — | **✓** |

---

## ⚠ Security Escalation → TheGuardians

5 findings match security escalation triggers and require TheGuardians review before next release:

| ID | Finding | Trigger | CVSS |
|----|---------|---------|------|
| DEP-001 | Protobufjs RCE | injection / code execution | 9.8 |
| DEP-002 | Handlebars.js JavaScript Injection | injection | 9.8 |
| DEP-003 | Vitest Arbitrary File Read / Code Execution | sensitive data exposed | critical |
| DEP-004 | form-data CRLF Injection | injection | 7.5 |
| DEP-008 | React Router Open Redirect | auth bypass / missing access control | high |

**Action:** Read `Teams/TheGuardians/team-leader.md` and trigger a full security audit on this branch in an ephemeral isolated environment.

```
⚠  ESCALATION → TheGuardians
   Branch  : audit/inspector-2026-07-16-c67d22
   When    : before next release, or wait for the scheduled security run

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see bug-backlog-2026-07-16.json)
```

---

## Summary

| Specialist | Mode | P1 | P2 | P3 | P4 |
|-----------|------|----|----|----|----|
| Quality Oracle | Static | 1 | 4 | 4 | 2 |
| Dependency Auditor | Static | 3 | 7 | 6 | 1 |
| Performance Profiler | **NOT RUN** | — | — | — | — |
| Chaos Monkey | **NOT RUN** | — | — | — | — |
| **TOTAL** | | **4** | **11** | **10** | **3** |

**Spec coverage (enforced scope):** FR-WF 100% (13/13) · FR-dependency 93% (14/15) · Portal FRs: NOT ENFORCED (see QO-002)

**Total CVEs (dependency-auditor):** 94 (6 critical, 16 high, 69 moderate, 3 low) across 6 workspaces

**First audit — no prior baseline.** All 28 findings are NEW.

---

## P1 Findings

### QO-001 — GET /api/search route not wired (FR-dependency-search unimplemented)
- **Severity:** P1 | **Route:** TheFixer
- **File:** `Source/Backend/src/app.ts:54` · `Source/Backend/src/routes/search.ts` (MISSING)
- **Detail:** FR-dependency-search requires a GET /api/search?q= endpoint. No route file exists, app.ts never registers it. DependencyPicker modal is silently broken. 4 test cases disclaim they will FAIL in CI.
- **Fix:** Create `Source/Backend/src/routes/search.ts` with GET /api/search?q= handler. Wire into app.ts. Add `// Verifies: FR-dependency-search`.

### DEP-001 — Protobufjs Arbitrary Code Execution (CVSS 9.8) `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **CVE:** GHSA-xq3m-2v4x-88gg
- **Workspaces:** platform/orchestrator, portal/Backend
- **Fix:** `npm update protobufjs` in affected workspaces.

### DEP-002 — Handlebars.js JavaScript Injection (CVSS 9.8) `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **CVE:** GHSA-2w6w-674q-4c4q (7 CVEs)
- **Workspaces:** Source/Backend, Source/Frontend
- **Fix:** Update handlebars to 4.7.9+.

### DEP-003 — Vitest Arbitrary File Read / Code Execution `[ESCALATE → TheGuardians]`
- **Severity:** P1 | **CVE:** GHSA-5xrq-8626-4rwp
- **Workspaces:** portal/Backend, portal/Frontend
- **Fix:** `npm update vitest`. Remove `--ui` flag from CI/CD pipeline.

---

## P2 Findings

| ID | Title | File | Route |
|----|-------|------|-------|
| QO-002 | Traceability enforcer blind to portal/ codebase | inspector.config.yml:42 | TheFixer |
| QO-003 | Duplicate test files for WorkItemDetailPage / WorkItemListPage | Source/Frontend/tests/ | TheFixer |
| QO-004 | Dual logger; no dev pretty-printing (FR-003 deviation) | Source/Backend/src/logger.ts | TheFixer |
| QO-005 | DebugPortalPage has no valid FR traceability | DebugPortalPage.tsx:1 | Requirements Reviewer |
| DEP-004 | form-data CRLF Injection (CVSS 7.5) | all workspaces (transitive) | **TheGuardians** |
| DEP-005 | Vite SSRF-like vulnerability (CVSS 5.3) | Source/Frontend/package.json | TheFixer |
| DEP-007 | PostCSS XSS via style tag injection (CVSS 6.1) | Source/Frontend/package.json | TheFixer |
| DEP-008 | React Router Open Redirect (6.26.0 → 6.30.4) | Source/Frontend/package.json | **TheGuardians** |
| DEP-009 | @opentelemetry multiple high CVEs | portal/Backend/package.json | TheFixer |
| DEP-010 | @grpc/grpc-js multiple high CVEs | platform/orchestrator/package.json | TheFixer |
| DEP-011 | path-to-regexp multiple high CVEs | platform/orchestrator/package.json | TheFixer |

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix |
|-----------|-----------------|-----------|
| npm deps not updated; no CI audit gates | DEP-001, DEP-002, DEP-003, DEP-004, DEP-008 | Add `npm audit` CI gate; run `npm update` across all workspaces |
| Traceability enforcer scope + regex | QO-002, QO-009 | Update tools/traceability-enforcer.py (scope + regex) |
| Test infrastructure fragmentation | QO-003, QO-006 | Delete duplicate files; complete Vitest migration |

---

## Recommendations

**🚫 Block Deployment:**
- Patch DEP-001/002/003 (critical CVEs) before next release
- Trigger TheGuardians audit on this branch

**🏃 This Sprint:**
- Implement GET /api/search (QO-001) — DependencyPicker broken for all users
- Add `npm audit --audit-level=critical` CI gate
- Update react-router-dom 6.26.0 → 6.30.4 (DEP-008)
- Fix traceability enforcer scope + regex (QO-002 + QO-009)
- Fix E2E test script placeholder (QO-011)
- Consolidate logger (QO-004)

**📅 Next Sprint:** Vite/PostCSS/gRPC patches; remove duplicate test files; resolve DebugPortalPage spec gap; fix eslint-disable hooks violations; portal/Backend dep audit.

**📋 Backlog:** Jest→Vitest migration; OpenTelemetry spans; comment fixes; Dependabot setup; run perf-profiler + chaos-monkey with live services.

---

## Report Files

| Artifact | Path |
|----------|------|
| HTML Report (16 sections) | `Teams/TheInspector/findings/audit-2026-07-16-D.html` |
| JSON Bug Backlog | `Teams/TheInspector/findings/bug-backlog-2026-07-16.json` |
| Dependency Audit Detail | `Teams/TheInspector/findings/dependency-audit-2026-07-16.md` |
| Dependency Audit JSON | `Teams/TheInspector/findings/dependency-audit-2026-07-16.json` |
