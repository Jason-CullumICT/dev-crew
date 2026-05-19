# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-19 — Grade C

### Spec Coverage Trend
- **Active plan (self-judging-workflow):** 100% (13/13 FR-WF-* IDs traced in Source/)
- **Cross-spec actual:** ~92% when portal/ and platform/ are included
- **Enforcer-visible:** 100% (misleading — enforcer only scans Source/ and E2E/)

### Architecture of This Repo (Critical Context)
This repo has **four distinct application trees**, each implementing different specs:

| Tree | Spec | FR Scheme | Status |
|------|------|-----------|--------|
| `Source/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013, FR-dependency-* | Fully traced |
| `portal/` | `Specifications/dev-workflow-platform.md` + `Plans/image-upload/requirements.md` | FR-001 to FR-095 | Traced in portal/, invisible to enforcer |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 | Mostly traced, enforcer-blind |
| `E2E/` | Playwright configs, test files | (no FRs) | Configs only |

### Known Open Issues (for Re-verification)

| ID | Severity | Status | Finding |
|----|----------|--------|---------|
| QO-001 | P1 | OPEN | `GET /api/search` not wired in `Source/Backend/src/app.ts`. search.test.ts acknowledges tests will fail. |
| QO-002 | P2 | OPEN | `tools/traceability-enforcer.py` only scans `["Source", "E2E"]` — blind to portal/ and platform/ |
| QO-003 | P2 | OPEN | `dependencyCheckDuration` histogram absent from `Source/Backend/src/metrics.ts` |
| QO-004 | P2 | OPEN | FR-070–FR-095 (image-upload) have no corresponding Specification file |
| QO-005 | P2 | OPEN | Duplicate test files: tests/WorkItemDetailPage.test.tsx and tests/pages/WorkItemDetailPage.test.tsx |
| QO-006 | P3 | OPEN | FR-TMP-008 has no Verifies comment in platform/Dockerfile.worker |
| QO-007 | P3 | OPEN | Enforcer uses `max(files, key=os.path.getmtime)` — non-deterministic under same-commit timestamps |

### Useful File Paths for Future Audits
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-*)
- Portal spec: `Specifications/dev-workflow-platform.md` (FR-001–069, FR-dependency-*)
- Platform spec: `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010)
- Enforcer tool: `tools/traceability-enforcer.py`
- Backend app entry: `Source/Backend/src/app.ts` — check for missing route registrations
- Metrics: `Source/Backend/src/metrics.ts` — currently 7 counters, 0 histograms
- Portal backend routes: `portal/Backend/src/routes/` — fully spec-traced
- Platform orchestrator: `platform/orchestrator/lib/workflow-engine.js` — FR-TMP-* traced here

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` without documented reason appears in DependencyPicker.tsx and useWorkItems.ts
- Non-standard `// Verifies:` text (not matching FR-XXX) in DebugPortalPage.tsx
- Spec-first workflow bypass: image-upload (FR-070+) implemented from plan without a Specification file

### Spec ID Schemes in Use
| Scheme | Scope | Source |
|--------|-------|--------|
| `FR-WF-001` to `FR-WF-013` | Source/ workflow engine | Plans/self-judging-workflow/requirements.md |
| `FR-001` to `FR-069` | portal/ dev platform | Specifications/dev-workflow-platform.md |
| `FR-dependency-*` | Source/ + portal/ | Specifications/dev-workflow-platform.md |
| `FR-070` to `FR-095` | portal/ image upload | Plans/image-upload/requirements.md (NO spec file) |
| `FR-TMP-001` to `FR-TMP-010` | platform/ orchestrator | Specifications/tiered-merge-pipeline.md |
