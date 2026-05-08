# TheInspector Audit Report — 2026-05-08

**Grade: C** | Run: `run-20260508-051619` | Branch: `audit/inspector-2026-05-08-c9c547`

## Summary

| Metric | Value |
|--------|-------|
| Overall Grade | **C** |
| P1 Findings | 1 (all escalated to TheGuardians) |
| P2 Findings | 4 |
| P3 Findings | 10 |
| P4 Findings | 3 |
| Spec Coverage | 99% |
| Specialists Run | quality-oracle, dependency-auditor |
| Specialists Skipped | performance-profiler, chaos-monkey (services offline) |
| First Audit | Yes — no prior baseline |

## Grade Rationale

Grading thresholds from `inspector.config.yml`:
- A: 0 P1, ≤3 P2, ≥80% coverage
- B: 0 P1, ≤8 P2, ≥60% coverage  
- **C: ≤2 P1, ≤15 P2, ≥40% coverage** ← this audit

One P1 finding (Handlebars critical CVEs via ts-jest) places the audit in C territory despite otherwise healthy metrics (99% spec coverage, architecture conformant except one file). The P1 is dev-time only with no current production exposure, but the grading thresholds require conservative scoring.

## Escalations

### 🚨 [ESCALATE → TheGuardians] DEP-001

**Handlebars.js Multiple Critical CVEs (CVSS 9.8) — Build Pipeline**

- Package: `handlebars ≤ 4.7.8` via `ts-jest@^29.1.2` in `Source/Backend`
- CVEs: GHSA-2w6w-674q-4c4q (CVSS 9.8), GHSA-3mfm-83xf-c92r (CVSS 8.1), and 4 others
- Current exposure: **dev/build-time only** — no production runtime use
- Risk if ignored: Any future Handlebars usage in production would be P0
- Fix: `cd Source/Backend && npm install ts-jest@latest` (requires ts-jest ≥ 30.0.0)

## Key Findings for TheFixer

### P2 — This Sprint

| ID | Title | File | Bundle With |
|----|-------|------|-------------|
| QO-001 | Traceability enforcer blind to portal/ and platform/ | `tools/traceability-enforcer.py:70` | — |
| QO-002 | Direct DB calls in teamDispatches route handler | `portal/Backend/src/routes/teamDispatches.ts` | QO-004, QO-006 |
| DEP-002 | Vite path-traversal CVE (GHSA-4w7w-66w2-5vf9) | `Source/Frontend/package.json` | DEP-003, DEP-004 |
| DEP-003 | Vitest CVE cascade from outdated vite | `Source/Frontend/package.json` | DEP-002 |

### Top Fix Bundles (Single PR → Multiple Findings Closed)

1. **teamDispatches refactor** (QO-002 + QO-004 + QO-006): Extract service layer, move type to Shared, write spec entry → closes 3 findings
2. **Vite ecosystem upgrade** (DEP-002 + DEP-003 + DEP-004): `npm install vite@latest vitest@latest` → closes 3 findings
3. **Traceability enforcer fix** (QO-001, improves QO-005, QO-010 detectability): Add portal/platform to source_dirs → 1-line fix

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-05-08-C.html` | Full HTML report with all 16 mandatory sections |
| `Teams/TheInspector/findings/bug-backlog-2026-05-08.json` | Structured bug backlog (1 escalation, 4 P2, 10 P3, 3 P4) |
| `Teams/TheInspector/findings/dependency-audit-2026-05-08.md` | Detailed CVE analysis from dependency-auditor |
| `inspector-report.md` | This summary |

## Next Audit

With services running (backend at :3001, frontend at :5173), the next audit will include:
- **performance-profiler** (dynamic): p50/p95/p99 latency vs budgets (100ms for /api/work-items, 150ms for /api/dashboard)
- **chaos-monkey** (dynamic): concurrent state transition conflicts, malformed request handling, backend restart recovery

_Posted by TheInspector Team Leader · `run-20260508-051619`_
