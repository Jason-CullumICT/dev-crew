# TheInspector Audit Report — 2026-04-25

**Grade: C** | Branch: `audit/inspector-2026-04-25-4b85d0` | Run: `run-20260425-044833`

> ⚠ **SECURITY ESCALATION REQUIRED → TheGuardians**
> 2 P1 CVEs (protobufjs RCE · handlebars injection) require exploit feasibility assessment before next release.

---

## Grade Determination

| Metric | Value | C-threshold | Pass? |
|--------|-------|-------------|-------|
| P1 findings | 2 | max 2 | ✓ |
| P2 findings | 7 | max 15 | ✓ |
| Spec coverage | 93% | min 40% | ✓ |
| **Overall Grade** | **C** | | ✓ |

> Grade B requires max_p1: 0 — two P1 CVEs prevent B or higher.
> Grade A requires max_p2: 3 — also not met.

---

## Findings Summary

| Severity | Count | Key Sources |
|----------|-------|-------------|
| **P1 Critical** | 2 | DEP-001 (protobufjs RCE), DEP-002 (handlebars injection cluster) |
| **P2 High** | 7 | QO-001..005 (spec/quality), DEP-003 (uuid buffer), DEP-004 (ReDoS) |
| **P3 Medium** | 10 | QO-006..009, QO-011, DEP-005..009 |
| **P4 Low** | 1 | QO-010 (non-standard traceability comment) |
| **Total** | **20** | First audit — all findings are NEW |
| **Escalated → TheGuardians** | 2 | DEP-001, DEP-002 |

---

## Specialist Coverage

| Specialist | Mode | Status | Grade |
|-----------|------|--------|-------|
| quality-oracle | static | ✅ Complete | B |
| dependency-auditor | static | ✅ Complete | C |
| performance-profiler | — | ⏭ Skipped (backend offline) | — |
| chaos-monkey | — | ⏭ Skipped (all services offline) | — |

---

## Escalated P1 Findings

### DEP-001 · [ESCALATE → TheGuardians] · protobufjs <7.5.5 — RCE (CVSS 9.8)
- **Location:** `portal/Backend` (transitive dependency)
- **CVE:** GHSA-xq3m-2v4x-88gg · CWE-94
- **Risk:** Arbitrary code execution if untrusted protobuf messages processed — no auth required
- **Fix:** `cd portal/Backend && npm audit fix`
- **Assessment needed:** Confirm whether portal/Backend receives protobuf from untrusted sources

### DEP-002 · [ESCALATE → TheGuardians] · handlebars 4.7.8 — 7 CVEs (CVSS 9.8)
- **Location:** `Source/Backend` (transitive dependency)
- **CVEs:** GHSA-2w6w-674q-4c4q + 6 more (code injection, prototype pollution, XSS, DoS)
- **Risk:** RCE if user-controlled strings reach any handlebars render() call
- **Fix:** Update parent dependency to require handlebars ≥4.7.9
- **Assessment needed:** Trace all render() call sites in Source/Backend

---

## Top P2 Findings

### QO-001 · /api/search route not implemented (P2 · spec-drift)
- `Source/Backend/src/app.ts` — FR-dependency-search requires GET /api/search?q= but no route exists
- Test file documents contract and explicitly states it will FAIL until implemented
- Frontend is already calling this dead endpoint
- **Fix:** Create `Source/Backend/src/routes/search.ts`, register in `app.ts`

### QO-003 · API client swallows all error messages (P2 · pattern-violation)
- `Source/Frontend/src/api/client.ts:27` — reads `body.message` but backend returns `body.error`
- All API errors degrade to generic "Request failed: 4xx" — no error text ever reaches the UI
- **Fix:** `body.message` → `body.error ?? body.message` (one line)

### DEP-003 · uuid <14.0.0 buffer overflow (P2 · CVE)
- `Source/Backend` direct dependency — GHSA-w5hq-g745-h8pq
- **Fix:** `cd Source/Backend && npm install uuid@^14.0.0` (major version bump — test required)

### QO-005 · Traceability enforcer misses dependency-linking plan (P2 · spec-drift)
- `tools/traceability-enforcer.py:49-57` — regex matches non-FR IDs; dependency-linking plan would report 7 MISSING
- FR-070 and FR-085 referenced in requirements but don't exist in spec (spec ends at FR-069)
- **Fix:** Tighten regex to `FR-[A-Z]{2,}-\d+`; remove phantom FR-070/FR-085 references

---

## Cross-Reference Map (Root Causes → Multiple Findings)

| Root Cause | Findings | Single Fix |
|-----------|---------|-----------|
| metrics.ts lacks Histogram types | QO-002 + QO-011 | Add two Histogram instances + timing middleware |
| Traceability enforcer regex bug masks gaps | QO-005 → masks QO-001/QO-002 | Tighten regex to `FR-[A-Z]{2,}-\d+` |
| vite/esbuild/postcss version cluster | DEP-006 + DEP-007 + DEP-008 | `npm install vite@^8.0.0 vitest@^4.1.5` |
| Exploit invisibility (no OTel + no errors) | QO-003 + QO-006 | Fix error field + add OTel bootstrap |

---

## Recommended Actions

**Block Deployment:**
- Trigger TheGuardians on DEP-001 (protobufjs) and DEP-002 (handlebars) before next production release

**This Sprint:**
- QO-003: Fix `body.message → body.error` in client.ts (1 line)
- QO-001: Implement /api/search route (1 hour, contract already documented by tests)
- DEP-003: `npm install uuid@^14.0.0` in Source/Backend
- DEP-004: `cd portal/Backend && npm audit fix`
- DEP-006/008: `npm install vite@^8.0.0 vitest@^4.1.5` in Source/Frontend

**Next Sprint:**
- QO-002/011: Add Histogram metrics + timing middleware
- QO-005: Fix traceability enforcer regex + phantom FR refs
- QO-004: Consolidate duplicate test files
- QO-006: Bootstrap OpenTelemetry

**Backlog:**
- QO-007/008/009: Logger dev mode, eslint-disable comments, import standardization
- Re-run TheInspector with services online (performance-profiler + chaos-monkey were skipped)

---

## Trend

**First audit — no prior baseline.** All 20 findings are NEW. This report establishes the baseline for future audits.

---

## Artifact Locations

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-04-25-C.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-04-25.json` | Structured bug backlog with all findings |
| `Teams/TheInspector/findings/AUDIT-SUMMARY.md` | Dependency auditor detailed findings |
| `quality-oracle-report.md` | Quality oracle raw report |
| `dependency-auditor-report.md` | Dependency auditor raw report |

---

```json
{
  "audit_date": "2026-04-25",
  "run_id": "run-20260425-044833",
  "branch": "audit/inspector-2026-04-25-4b85d0",
  "grade": "C",
  "first_audit": true,
  "summary": {
    "p1_total": 2,
    "p2_total": 7,
    "p3_total": 10,
    "p4_total": 1,
    "spec_coverage_percent": 93,
    "escalations": ["DEP-001", "DEP-002"],
    "escalation_target": "TheGuardians",
    "specialists_run": ["quality-oracle", "dependency-auditor"],
    "specialists_skipped": ["performance-profiler", "chaos-monkey"]
  }
}
```
