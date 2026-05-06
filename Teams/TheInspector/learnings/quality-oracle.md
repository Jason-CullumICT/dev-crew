# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-06 — First Full Audit

### Architecture Summary

This repo has **two distinct products** plus orchestrator infrastructure, mapped to three source trees:

| Directory | Product | Spec Source |
|-----------|---------|-------------|
| `Source/` | Self-Judging Workflow Engine | `Plans/self-judging-workflow/requirements.md` (FR-WF-*) |
| `portal/` | Dev Workflow Platform (SQLite, feature/bug/cycle tracking) | `Specifications/dev-workflow-platform.md` (FR-001–069, FR-dependency-*) |
| `platform/` | Orchestrator infrastructure (Docker, workflow runner) | `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) |

**Do NOT** confuse Source/ and portal/ — they are different apps implementing different specs.

### Traceability Enforcer Scope (Critical Gap)

`python3 tools/traceability-enforcer.py` only scans:
- **Input:** `Plans/*/requirements.md` (most recently modified — unreliable when all files have same mtime)
- **Targets:** `Source/` and `E2E/` directories only

It is **completely blind** to:
- `Specifications/` (80+ FRs for portal and tiered merge pipeline)
- `portal/` codebase (1073+ `Verifies:` comments, unvalidated)
- `platform/` codebase (FR-TMP-* implementation, no `Verifies:` comments after docker→platform rename)

**Impact:** The enforcer reports "PASS" for 13 FR-WF-* requirements but the full spec surface is ~120 requirements across three products.

### Known Open Issues (as of 2026-05-06)

| ID | Finding | Severity | Location |
|----|---------|----------|----------|
| QO-001 | FR-dependency-search: `/api/search` not mounted in app.ts | P1 | Source/Backend/src/app.ts |
| QO-002 | Enforcer blind to Specifications/ and portal/ (80+ FRs unvalidated) | P2 | tools/traceability-enforcer.py |
| QO-003 | FR-TMP Verifies: comments stripped — docker→platform rename | P2 | platform/orchestrator/lib/ |
| QO-004 | FR-dependency-api-types: blocked_by missing from UpdateBugInput/UpdateFeatureRequestInput | P2 | portal/Shared/api.ts |
| QO-005 | FR-dependency-seed: seed.ts missing from portal | P2 | portal/Backend/src/database/ |
| QO-006 | FR-dependency-frontend-tests: DependencySection.test.tsx + BlockedBadge.test.tsx missing | P2 | portal/Frontend/tests/ |
| QO-007 | Source/Frontend BlockedBadge missing amber pending_dependencies state | P3 | Source/Frontend/src/components/BlockedBadge.tsx |
| QO-008 | eslint-disable-next-line in production (DependencyPicker.tsx:82, useWorkItems.ts:63) | P3 | Source/Frontend |
| QO-009 | Silent .catch(() => ({})) in API client | P3 | Source/Frontend/src/api/client.ts:26 |
| QO-010 | playwright.pipeline.config.ts has hardcoded past-run testDir | P3 | Source/E2E/playwright.pipeline.config.ts |
| QO-011 | workflow.ts at 374 lines (>300 guideline) | P3 | Source/Backend/src/routes/workflow.ts |
| QO-012 | Route handlers call workItemStore directly (bypasses service layer) | P4 | Source/Backend/src/routes/ |

### Useful Paths for Fast Future Audits

```
Plans/self-judging-workflow/requirements.md   # enforcer's current target (FR-WF-*)
Plans/dependency-linking/requirements.md      # FR-dependency-* with implementation delta table
Specifications/dev-workflow-platform.md       # canonical FR-001–069 + FR-dependency-* for portal
Specifications/tiered-merge-pipeline.md       # FR-TMP-001–010 for orchestrator
Source/Backend/src/app.ts                     # route mount registry (check against spec endpoints)
Source/Backend/src/metrics.ts                 # Prometheus metrics registry
portal/Shared/api.ts                          # API input/output types (UpdateBugInput, etc.)
portal/Backend/src/database/schema.ts         # SQLite schema migrations
platform/orchestrator/lib/workflow-engine.js  # Tiered merge pipeline (2047 lines, no Verifies: comments)
```

### Spec Coverage Trend

| Audit | FR-WF-* (enforcer) | portal FRs (manual) | FR-TMP-* (manual) | Overall |
|-------|--------------------|---------------------|-------------------|---------|
| 2026-05-06 | 100% (13/13) | ~87% (missing: api-types, seed, frontend-tests) | ~90% (Verifies: stripped) | Unmeasured by enforcer |

### Pattern Violations Observed

- `console.log`/`console.warn` NOT found in Source/ (good — logger abstraction used)  
- Portal and platform use `console.log` (pre-logger abstraction codebases)
- No hardcoded secrets found in Source/
- Two `eslint-disable-next-line react-hooks/exhaustive-deps` in Source/Frontend (stale closure risk)
- One silent `.catch(() => ({}))` in frontend API client (minor, but architecture rule says no silent swallowing)

### Common Architecture Mismatches

1. **FR-dependency-* implemented in BOTH Source/ and portal/** — different implementations, different data stores. Source/ uses in-memory store; portal/ uses SQLite.
2. **BlockedBadge exists in both codebases** — portal version is complete (red + amber), Source/ version only has red. This divergence creates UX inconsistency if the codebases are ever merged.
3. **Enforcer mtime tie-breaking is unreliable** — when all requirements.md files have the same mtime (e.g., after a `git clone`), the enforcer will arbitrarily pick one. Fix: add `--plan` argument or use alphabetical tie-breaking with a documented default.
