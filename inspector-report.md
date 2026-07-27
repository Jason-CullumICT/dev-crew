# TheInspector — System Health Audit Report
**Date:** 2026-07-27 · **Run ID:** `run-20260727-060851` · **Grade: D**

---

## Overall Grade: D

| Threshold | Requirement | Actual | Pass? |
|-----------|-------------|--------|-------|
| A | max_p1=0, max_p2=3, min_cov=80% | P1=4, P2=11, cov=71% | ❌ |
| B | max_p1=0, max_p2=8, min_cov=60% | P1=4 | ❌ |
| C | max_p1=2, max_p2=15, min_cov=40% | P1=4 exceeds 2 | ❌ |
| **D** | anything worse than C | 4 P1 findings | ✅ assigned |

**Grade D** is assigned because 4 P1 findings exceed the C-threshold of `max_p1=2`.

---

## Security Escalations → TheGuardians (3 P1 findings)

These findings match `inspector.config.yml` escalation triggers (injection, missing access control).
**Trigger TheGuardians audit before next deployment.**

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| DEP-001 | Protobufjs Arbitrary Code Execution (portal/Backend via OTel) | 9.8 | injection |
| DEP-002 | Vitest UI Arbitrary File Read/Execute (Source/Frontend, portal/Frontend) | 9.8 | missing access control |
| DEP-003 | Handlebars JavaScript Injection — multiple vectors (Source/Backend) | 9.8 | injection |

**Immediate action for DEP-002:** Disable `--ui` flag in all vitest invocations now.

---

## Finding Counts

| Severity | Quality Oracle | Dependency Auditor | Total |
|----------|---------------|-------------------|-------|
| P1 | 1 | 3 | **4** |
| P2 | 5 | 6 | **11** |
| P3 | 4 | 6 | **10** |
| P4 | 2 | 1 | **3** |
| **Total** | **12** | **16** | **28** |

**Specialists skipped:** performance-profiler, chaos-monkey (no reports found — services may have been offline)

**Spec coverage:** 71% (27/38 FRs) — Enforcer blind spot: 11 untraced FRs hidden from gate (QO-006)

---

## P1 Findings

### QO-001 — GET /api/search not wired — DependencyPicker feature silently broken
- **File:** `Source/Backend/src/app.ts` (missing route registration)
- **Spec:** FR-dependency-search
- **Impact:** Every DependencyPicker keystroke fires a 404; catch is suppressed; feature always returns empty with no error shown
- **Fix:** Create `Source/Backend/src/routes/search.ts`, register `app.use('/api/search', searchRouter)` in app.ts, make search.test.ts green
- **Route:** TheFixer — Priority: **Block deployment**

### DEP-001 — Protobufjs ACE (CVSS 9.8) — [ESCALATE → TheGuardians]
- **Package:** `protobufjs@<=7.6.4` transitive via `@opentelemetry/auto-instrumentations-node@0.40.0` — portal/Backend
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Fix:** Upgrade `@opentelemetry/auto-instrumentations-node` to >=0.79.0 and `sdk-node` to >=0.221.0

### DEP-002 — Vitest UI Arbitrary File Read/Execute (CVSS 9.8) — [ESCALATE → TheGuardians]
- **Package:** `vitest@<=3.2.5` — Source/Frontend (vitest@2.0.5), portal/Frontend (vitest@1.4.0)
- **CVE:** GHSA-5xrq-8626-4rwp
- **Fix:** Disable `--ui` flag immediately; upgrade vitest to >=4.1.10

### DEP-003 — Handlebars JS Injection (CVSS 9.8) — [ESCALATE → TheGuardians]
- **Package:** `handlebars@4.0.0-4.7.8` transitive in Source/Backend
- **CVE:** GHSA-2w6w-674q-4c4q + 6 others
- **Fix:** Audit usage; upgrade to >=4.7.9 or remove if unused

---

## P2 Findings Summary

| ID | Title | Route |
|----|-------|-------|
| QO-002 | dependencyCheckDuration histogram absent (FR-dependency-metrics partial) | TheFixer |
| QO-003 | OpenTelemetry tracing entirely absent — CLAUDE.md arch rule | TheFixer |
| QO-004 | FR-dependency-seed unimplemented — no seed script | TheFixer |
| QO-005 | Tiered Merge Pipeline FR-TMP-001-010 at 0% traced | TheATeam |
| QO-006 | Traceability enforcer false PASS — 11 FRs invisible to gate | TheFixer |
| DEP-004 | OTel SDK Prometheus DoS + W3C baggage unbounded memory | TheFixer |
| DEP-005 | Vite path traversal + fs.deny bypass (CVSS 7.5) | TheFixer |
| DEP-006 | PostCSS arbitrary file read + XSS via unescaped style tag | TheFixer |
| DEP-007 | React Router open redirect → XSS escalation (CVSS 6.9) | TheFixer |
| DEP-008 | Form-data CRLF injection — response splitting risk (CVSS 7.5) | TheFixer |
| DEP-009 | path-to-regexp ReDoS — CPU exhaustion (CVSS 7.5) | TheFixer |

---

## Cross-Reference Map (single fix resolves multiple findings)

| Root Cause | Findings | Fix Impact |
|------------|----------|------------|
| Observability stack absent in Source/Backend | QO-002, QO-003, QO-008 | 3 findings resolved by installing OTel + histograms |
| Outdated OTel packages in portal/Backend | DEP-001 (P1), DEP-004 (P2) | 2 findings by upgrading sdk-node >=0.221.0 |
| Outdated frontend toolchain (Vite/Vitest/PostCSS/RR) | DEP-002 (P1), DEP-005-007 (P2), DEP-015 (P3) | 5 findings by one frontend upgrade sprint |
| Enforcer scope too narrow | QO-005, QO-006 | 2 findings by extending enforcer to Specifications/ |

---

## Remediation Priorities

**Block deployment (all 4 P1 findings):**
- [ ] DEP-001/002/003: Escalate to TheGuardians; disable vitest --ui; patch OTel and Handlebars
- [ ] QO-001: Wire GET /api/search in app.ts

**This sprint (P2):**
- [ ] QO-003 + QO-002 + QO-008: Install OTel SDK, add histograms to metrics.ts
- [ ] DEP-005 + DEP-007: Upgrade Vite v5->v8 and React Router v6->v7 (breaking changes — full E2E test pass required)
- [ ] DEP-004: Upgrade portal/Backend OTel (also resolves DEP-001 transitive chain)
- [ ] DEP-006 + DEP-008 + DEP-009: Upgrade PostCSS, form-data, Express in portal/Backend
- [ ] QO-004: Create `Source/Backend/src/store/seed.ts`
- [ ] QO-006: Extend traceability-enforcer.py to scan Specifications/

**Next sprint:**
- [ ] QO-005: Clarify FR-TMP-* ownership; remove stale playwright.pipeline.config.ts
- [ ] QO-007/009/010: Move AssessmentResult to Shared/, remove duplicate tests, consolidate logger
- [ ] Schedule performance-profiler and chaos-monkey with services online

**Backlog:** DEP-010 through DEP-016, QO-011/012 — see full HTML report

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-07-27-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-07-27.json` | Machine-readable backlog + escalations array |
| `Teams/TheInspector/findings/audit-2026-07-27-C.md` | Quality oracle detailed findings |
| `Teams/TheInspector/findings/dependency-audit-report.md` | Dependency auditor detailed findings |

---

**Trend:** First audit — no prior baseline. Next audit will compare against this run (Grade D).
**Specialists skipped:** performance-profiler, chaos-monkey. Run when services are online.
