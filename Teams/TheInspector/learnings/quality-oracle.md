# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-25 — Full Audit

### Spec Coverage Trend

| Spec | FRs | Covered | % | Enforcer Sees? |
|------|-----|---------|---|----------------|
| `Specifications/workflow-engine.md` → `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-*) | 13 | 100% | YES |
| `Specifications/dev-workflow-platform.md` | 69 (FR-001 to FR-069) | 69 | 100% | NO — portal/ not scanned |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-*) | 9 | 90% | NO — platform/ not scanned |

**Critical tool gap**: `tools/traceability-enforcer.py` line 70 hardcodes `source_dirs = ["Source", "E2E"]`. The portal/ and platform/ codebases are never scanned. Running `--plan dev-workflow-platform` produces 34/34 FALSE failures.

### Key File Paths for Future Audits

- Traceability enforcer: `tools/traceability-enforcer.py:70` — scan dirs hardcoded
- Architecture violation: `portal/Backend/src/routes/teamDispatches.ts:37-43,72` — direct DB calls
- Duplicate tests: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- Ghost requirement ID: `portal/Frontend/tests/DependencyPicker.test.tsx:1` — `// Verifies: FR-0001` (should be `FR-dependency-picker`)
- FR-TMP-008 (Dockerfile.worker gh CLI): implemented at `platform/Dockerfile.worker:32-40` but traced as `dev-crew unified repo` not `FR-TMP-008`

### Common Pattern Violations Found

1. Direct DB calls in route handler (teamDispatches.ts) — not using service layer
2. eslint-disable-next-line in two hooks (useWorkItems.ts:63, DependencyPicker.tsx:82)
3. Plan-level requirements (FR-DUP-*, FR-070+) not promoted to Specifications/ — spec doc lags behind implementation

### Learnings

- **Two distinct codebases**: `Source/` = Self-Judging Workflow Engine; `portal/` = Dev Workflow Platform
- **Traceability enforcer is plan-specific**, not spec-file-specific — always pass `--plan` to target the right requirements file
- **portal/ requirements must use portal/ scan dirs** — the enforcer silently passes for FR-WF-* (runs against Source/) even when portal/ is what implements the main app
- **teamDispatches has zero tests** in portal/Backend/tests/ — 15 test files exist but none cover this route
- **FR-DUP-* and FR-dependency-* extended specs** exist only in `Plans/*/requirements.md`, never promoted to `Specifications/`
