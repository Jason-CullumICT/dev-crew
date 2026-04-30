# TheInspector — System Health Audit

**Grade: D** | Date: 2026-04-30 | Audit ID: `run-20260430-054355`
**Branch:** `audit/inspector-2026-04-30-b8aa8b`
**Scope:** Full codebase (static analysis) — performance-profiler and chaos-monkey skipped (services offline)

---

## Grade: D

> **Why D?** 3 P1 findings. Config threshold: C = max_p1:2, D = max_p1:999.
>
> **Grade note:** DEP-001 is P1 by CVSS severity but has no current runtime exploit path (build-tools only). If TheGuardians re-classify it as P2, the combined grade is **C**. TheGuardians should make this determination.

---

## Scorecards

| Metric | Value |
|--------|-------|
| P1 Findings | **3** (2 quality-oracle, 1 dependency-auditor) |
| P2 Findings | **6** |
| P3 Findings | **7** |
| P4 Findings | **6** |
| Spec Coverage (Source/) | **~93%** |
| Portal Coverage | **Unknown** (enforcer blind) |
| Dynamic Tests | **0** (services offline) |
| Escalations | **1** → TheGuardians (DEP-001) |
| Fixed | **0** (first audit — baseline) |

---

## Specialist Summary

| Specialist | Mode | P1 | P2 | P3 | P4 | Own Grade |
|------------|------|----|----|----|----|----|
| quality-oracle | Static | 2 | 4 | 2 | 2 | C |
| dependency-auditor | Static | 1 | 2 | 5 | 4 | B (own) |
| performance-profiler | **NOT RUN** — services offline | — | — | — | — | — |
| chaos-monkey | **NOT RUN** — services offline | — | — | — | — | — |

---

## ⚠️ ESCALATION → TheGuardians

**DEP-001 — Handlebars.js: 8 JavaScript injection CVEs in build tools**

- **CVEs:** GHSA-2w6w-674q-4c4q (CVSS 9.8), GHSA-3mfm-83xf-c92r (8.1), GHSA-xjpj-3mr7-gcpf (8.3), and 5 more
- **Location:** Transitive via Jest/ts-jest/Babel in `Source/Backend`
- **Risk:** No current exploit path in application code, but build pipeline could be compromised → contaminated release artifacts
- **Action:** `npm audit fix --force` in Backend; TheGuardians to assess CI build isolation before next deployment
- **Do not deploy until TheGuardians clears this finding.**

---

## P1 Findings

### QO-001 · P1 · `GET /api/search` not wired in app.ts
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts:1–6`
- **Impact:** DependencyPicker is broken at runtime for all users — every search call hits a 404
- **Spec:** `FR-dependency-search`
- **Fix:** Create `workItemService.ts`; implement route; mount in `app.ts`; remove failing comment
- **Cross-ref:** QO-005 (service layer required first)
- **Route to:** TheFixer — **this sprint**

### QO-002 · P1 · Traceability enforcer blind to `portal/`
- **File:** `tools/traceability-enforcer.py:77`, `Teams/TheInspector/inspector.config.yml:42`
- **Impact:** 1,041 `// Verifies:` comments in portal/ completely invisible; CI verification gate gives false-green on FR-001–095
- **Fix:** Add `"portal"` to `source_dirs` in both the enforcer script and inspector config (one-line fix each)
- **Cross-ref:** QO-006 (plan selection also broken)
- **Route to:** TheFixer — **this sprint**

---

## P2 Findings

| ID | Title | File | Sprint |
|----|-------|------|--------|
| QO-003 | `pending_dependencies` status absent from WorkItemStatus enum | `Source/Shared/types/workflow.ts:5` | Next sprint |
| QO-004 | `dependencyCheckDuration` histogram missing (3/4 FR-dependency-metrics present) | `Source/Backend/src/metrics.ts` | Next sprint |
| QO-005 | Route handlers call store directly — no service layer | `routes/workItems.ts:12`, `workflow.ts:15` | This sprint |
| QO-006 | Enforcer non-deterministically picks 1 of 8 plans — 7 plans never verified | `tools/traceability-enforcer.py:48` | This sprint |
| DEP-002 | UUID buffer bounds check missing (GHSA-w5hq-g745-h8pq); direct backend dep | `Source/Backend/package.json` | This sprint |
| DEP-008 | Express ^4.18.2 and Pino ^8.17.0 are 1–2 major versions behind | `Source/Backend/package.json` | Backlog |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| Traceability enforcement gap | QO-002 (P1) + QO-006 (P2) | Add `portal/` to enforcer + enumerate all plans in CI |
| Missing service layer | QO-001 (P1) + QO-005 (P2) | Create `workItemService.ts` + implement search route |
| Vite CVE chain | DEP-003 + DEP-004 + DEP-005 + DEP-006 (all P3) | `npm update vite` to 6.x — resolves all 4 |
| WorkItemStatus enum gap | QO-003 (P2) | Add `PendingDependencies` value + update transitions |

---

## Recommendations

### 🚫 Block deployment
- **DEP-001** — Escalate to TheGuardians. Do not deploy until cleared.

### 🏃 This sprint (TheFixer)
- **QO-001 + QO-005** (linked): Create service layer + implement GET /api/search
- **QO-002 + QO-006** (linked): Fix enforcer to scan portal/ + enumerate all plans in CI
- **DEP-002**: Upgrade uuid to ^14.0.0 in Backend

### 📋 Next sprint (TheFixer)
- **QO-003**: Add `pending_dependencies` to WorkItemStatus; fix dispatch handler (HTTP 400 → status change)
- **QO-004**: Add `dependencyCheckDuration` histogram to `metrics.ts`
- **DEP-003–006** (one fix): Upgrade Vite to 6.x; resolves 4 P3 CVEs
- **QO-007**: Justify `eslint-disable-next-line` in DependencyPicker.tsx:82 and useWorkItems.ts:63
- **QO-008**: Document or log silent `.catch(() => ({}))` in `client.ts:26`

### 📥 Backlog
- Express 4→5 and Pino 8→10 upgrades (DEP-008)
- React 18→19 and react-router 6→7 (DEP-009)
- QO-009: Fix non-standard Verifies marker in DebugPortalPage.tsx
- QO-010: Add FR-XXX IDs to `Specifications/workflow-engine.md`
- Re-run TheInspector in **dynamic mode** when services are up (performance-profiler + chaos-monkey)

---

## Trend

**First audit — no baseline.** All 22 findings are NEW.
Next audit: recommended 2026-05-30 in dynamic mode.

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-04-30-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-04-30.json` | Structured bug backlog for TheFixer |
| `Teams/TheInspector/findings/audit-2026-04-30-C.md` | Quality oracle findings detail |
| `Teams/TheInspector/findings/audit-2026-04-30.md` | Dependency auditor findings detail |

---

## JSON Bug Backlog

```json
{
  "audit_id": "run-20260430-054355",
  "audit_date": "2026-04-30",
  "grade": "D",
  "summary": {
    "p1_total": 3,
    "p2_total": 6,
    "p3_total": 7,
    "p4_total": 6,
    "escalations": 1
  },
  "escalations": [
    {
      "id": "DEP-001",
      "severity": "P1",
      "title": "Handlebars.js: 8 JS injection CVEs in build tools (CVSS 9.8)",
      "route_to": "TheGuardians",
      "fix": "npm audit fix --force; TheGuardians assess CI build isolation"
    }
  ],
  "p1": [
    {
      "id": "QO-001",
      "title": "GET /api/search not wired in app.ts (FR-dependency-search)",
      "files": ["Source/Backend/src/app.ts", "Source/Frontend/src/api/client.ts:101"],
      "fix": "Create workItemService.ts + implement search route",
      "sprint": "this-sprint"
    },
    {
      "id": "QO-002",
      "title": "Traceability enforcer blind to portal/ — 1041 Verifies comments unseen",
      "files": ["tools/traceability-enforcer.py:77", "Teams/TheInspector/inspector.config.yml:42"],
      "fix": "Add portal/ to source_dirs (one-line fix each file)",
      "sprint": "this-sprint"
    }
  ],
  "p2": [
    {
      "id": "QO-003",
      "title": "pending_dependencies status absent from WorkItemStatus enum",
      "files": ["Source/Shared/types/workflow.ts:5-15"],
      "sprint": "next-sprint"
    },
    {
      "id": "QO-004",
      "title": "dependencyCheckDuration histogram missing",
      "files": ["Source/Backend/src/metrics.ts"],
      "sprint": "next-sprint"
    },
    {
      "id": "QO-005",
      "title": "Route handlers call store directly — no service layer",
      "files": ["Source/Backend/src/routes/workItems.ts:12", "Source/Backend/src/routes/workflow.ts:15"],
      "sprint": "this-sprint"
    },
    {
      "id": "QO-006",
      "title": "Enforcer non-deterministically picks 1 of 8 plans",
      "files": ["tools/traceability-enforcer.py:48-57"],
      "sprint": "this-sprint"
    },
    {
      "id": "DEP-002",
      "title": "UUID buffer bounds check missing (GHSA-w5hq-g745-h8pq)",
      "files": ["Source/Backend/package.json"],
      "fix": "npm update uuid to ^14.0.0",
      "sprint": "this-sprint"
    },
    {
      "id": "DEP-008",
      "title": "Express + Pino 1-2 major versions behind",
      "files": ["Source/Backend/package.json"],
      "sprint": "backlog"
    }
  ]
}
```

---

*Generated by TheInspector · Team Leader (sonnet) · 2026-04-30*
*Specialists: quality-oracle · dependency-auditor*
*Full report: `Teams/TheInspector/findings/audit-2026-04-30-D.html`*
