# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-26 — Grade D

### Spec Coverage Trend

- **First audit run.** Baseline: 25% spec coverage (28/112 FRs traced).
- Coverage is strongly bi-modal: the two implemented features (self-judging-workflow and dependency-linking) have 100% traceability. All other plans have 0%.

### Architecture Discovery: Two Competing Specs

There are **two system architectures** in the repo that are NOT the same product:

| Spec | System | Tech | Status |
|---|---|---|---|
| `Specifications/dev-workflow-platform.md` | Feature Request / Bug / Cycle platform | SQLite + better-sqlite3 | **UNBUILT** |
| `Specifications/workflow-engine.md` | Self-Judging Work Item Workflow Engine | In-memory Map store | **BUILT** (100%) |

The current `Source/` code implements the *workflow-engine* spec (FR-WF-*), not the *dev-workflow-platform* spec (FR-001 to FR-069). This is either a product pivot that was never documented, or the dev-workflow-platform is future-planned. Key discriminator: check if `Specifications/dev-workflow-platform.md` has a `superseded-by` note — it currently does not.

### Critical Tool Gap: Traceability Enforcer Single-Plan Bias

`tools/traceability-enforcer.py` picks only the most recently modified `Plans/*/requirements.md`. With 9 plans having requirements files, this means 8 plans are never checked. The enforcer reports `PASSED` even when 56+ FRs are unimplemented. This is the **highest-leverage fix** in the codebase.

- Enforcer code location: `tools/traceability-enforcer.py:49-57`
- Fix: iterate all plans or require explicit `--plan` arg in CLAUDE.md gate

### FR ID Namespace Inconsistency

The `Plans/dependency-linking/requirements.md` uses a different ID namespace (FR-0002, FR-085) than the source code (FR-dependency-service, FR-dependency-endpoints). The feature IS implemented but the plan IDs never match. This is a P2 finding that will persist until the plan is updated.

### Useful File Paths for Fast Future Audits

```
Plans/*/requirements.md                  # All plan requirements files (9 total)
tools/traceability-enforcer.py           # Run with --plan <name> to check any plan
Specifications/dev-workflow-platform.md  # 69 FRs, unbuilt
Specifications/workflow-engine.md        # 13 FRs, fully built
Specifications/tiered-merge-pipeline.md  # 10 FRs, no requirements.md in plan
Source/Backend/tests/                    # 13 test files, all traced
Source/Frontend/tests/                   # Duplicate: WorkItemDetailPage + WorkItemListPage in both tests/ and tests/pages/
```

### Common Pattern Violations Found

- `// eslint-disable-next-line react-hooks/exhaustive-deps` in 2 frontend files (not documented)
- `// Verifies: dev-crew debug portal` in DebugPortalPage (non-FR format — untraceable)

### Plans With Requirements Files (for future audit iteration)

```
Plans/self-judging-workflow/requirements.md       ← enforcer default (most recently modified)
Plans/orchestrator-cycle-dashboard/requirements.md
Plans/orchestrated-dev-cycles/requirements.md
Plans/image-upload/requirements.md
Plans/duplicate-deprecated-status/requirements.md
Plans/dev-workflow-platform/requirements.md
Plans/dev-cycle-traceability/requirements.md
Plans/dependency-linking/requirements.md
```

### Plans Without requirements.md (cannot be enforced)

```
Plans/tiered-merge-pipeline/    ← has QA/design reports but no requirements.md
Plans/deferred-pipeline-architecture/
Plans/dev-crew-path-references/
Plans/docker-compose-setup/
Plans/phase-signals/
Plans/pipeline-hardening/
Plans/pipeline-optimisations/
Plans/soc-mock-ui/
Plans/template-cleanup/
Plans/token-optimization/
Plans/update-claude-md-dev-crew/
```
