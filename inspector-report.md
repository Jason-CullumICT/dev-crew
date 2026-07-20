# TheInspector — System Health Audit
**Date:** 2026-07-20  
**Branch:** `audit/inspector-2026-07-20-7f31c5`  
**Grade:** 🟠 **D**  
**Specialists:** quality-oracle (static), dependency-auditor (static)  
**Skipped:** performance-profiler, chaos-monkey (services offline)

---

## ⚠ ESCALATION → TheGuardians

Three P1 findings trigger security escalation. **Action required before next release.**

| Finding | Trigger | Severity |
|---------|---------|----------|
| DEP-001 Handlebars.js RCE (CVSS 9.8) | injection — JavaScript AST injection | P1 |
| DEP-002 Vite Host Header Confusion (CVSS 7.1) | sensitive data exposed via dev server | P1 |
| DEP-003 Portal/Backend 54 CVEs (2 critical) | injection — grpcx header injection | P1 |

```
To trigger TheGuardians:
  Read Teams/TheGuardians/team-leader.md and follow it exactly.
  Target: ephemeral isolated environment (required).
```

---

## Scores

| Metric | Value |
|--------|-------|
| Grade | **D** |
| P1 Findings | **3** (DEP-001, DEP-002, DEP-003) |
| P2 Findings | **8** (DEP-004–006, QO-001–005) |
| P3 Findings | **15** (DEP-007–017, QO-006–009) |
| Escalations → TheGuardians | **3** |
| Spec Coverage (Specifications/) | **13.4%** (13/97 FRs) |
| Spec Coverage (Plans/) | **100%** (13/13 FR-WF) |
| Total CVEs | **85** (4 critical, 13 high, 46 moderate, 2 low) |
| License Compliance | ✅ CLEAN |

---

## Grade Rationale

```
config.grading thresholds:
  A: max_p1=0, max_p2=3,  min_spec_coverage=80%
  B: max_p1=0, max_p2=8,  min_spec_coverage=60%
  C: max_p1=2, max_p2=15, min_spec_coverage=40%
  D: max_p1=999 (catch-all)

This audit: p1=3 (exceeds C max of 2) + spec_coverage=13.4% (fails C min of 40%) → Grade D
```

**Path to C:** Resolve all 3 P1s + archive/supersede `dev-workflow-platform.md` (lifts coverage to ~100%).  
**Path to B:** Additionally keep P2s ≤8 and spec coverage ≥60%.

---

## P1 Findings (Escalated → TheGuardians)

### DEP-001 · Handlebars.js Remote Code Execution (CVSS 9.8)
- **Files:** Source/Backend, Source/Frontend, portal/* (transitive via @babel/core)
- **CVEs:** GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r
- **Scenario:** User-supplied template input → AST type confusion → arbitrary Node.js code execution
- **Fix:** `grep -r "require.*handlebars\|import.*Handlebars" Source/ portal/` to confirm runtime usage. Upgrade to >=4.7.9 or remove.
- **[ESCALATE → TheGuardians]**

### DEP-002 · Vite Host Header Confusion (CVSS 7.1)
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-3p3v-5vf6-f4q7 (vite <5.4.3)
- **Scenario:** Forged Host header → CORS bypass, attacker-controlled asset serving, cache poisoning
- **Fix:** `npm install vite@^5.4.3` in both frontend modules. Also resolves DEP-005 and DEP-011.
- **[ESCALATE → TheGuardians]**

### DEP-003 · Portal/Backend 54 CVEs including 2 Critical
- **Files:** portal/Backend/package.json
- **Root cause:** @opentelemetry/auto-instrumentations-node — massive transitive dependency tree
- **Key CVEs:** grpcx XSS via header injection, OpenTelemetry compression RCE
- **Fix:** Audit actual telemetry usage, replace auto-instrumentation with minimal SDK, run `npm audit fix`.
- **[ESCALATE → TheGuardians]**

---

## P2 Findings (→ TheFixer)

| ID | Title | File |
|----|-------|------|
| DEP-004 | form-data CRLF Injection (CVSS 7.5) | Source/Backend, Frontend, portal/* |
| DEP-005 | esbuild Dev Server Localhost Escape (CVSS 5.3) | Source/Frontend, portal/Frontend |
| DEP-006 | React Router Open Redirect via // path | Source/Frontend/package.json |
| QO-001 | dev-workflow-platform.md — 74 FRs unimplemented | Specifications/dev-workflow-platform.md |
| QO-002 | Traceability enforcer never scans Specifications/ | tools/traceability-enforcer.py |
| QO-003 | tiered-merge-pipeline.md FR-TMP-001–010 zero coverage | Specifications/tiered-merge-pipeline.md |
| QO-004 | Business logic in route handlers (state machine in workflow.ts) | Source/Backend/src/routes/workflow.ts:93-208 |
| QO-005 | GET /api/search unimplemented — search.test.ts intentionally fails | Source/Backend/tests/routes/search.test.ts |

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix |
|-----------|-------------------|------------|
| Vite <5.4.3 | DEP-002 + DEP-005 + DEP-011 | `npm install vite@^5.4.3` in Frontend modules |
| Enforcer only scans Plans/ | QO-001 + QO-002 + QO-003 | Extend `tools/traceability-enforcer.py` to scan `Specifications/` |
| form-data <4.0.6 | DEP-004 (4 modules) | `npm audit fix` in each module |
| Business logic not in service layer | QO-004 + QO-005 | Create `services/workflowActions.ts` + `routes/search.ts` |

---

## Trend

**First audit — no baseline.** All 26 findings marked NEW.  
Next audit: **2026-07-25**

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-07-20-D.html` | Full HTML report (all 16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-07-20.json` | Machine-readable bug backlog |
| `Teams/TheInspector/findings/dependency-audit-2026-07-20.md` | Detailed dependency audit |
| `Teams/TheInspector/findings/REMEDIATION_QUICK_START.md` | Copy-paste remediation commands |
