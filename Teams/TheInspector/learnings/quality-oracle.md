# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-11-09 — Full Audit

### Spec Coverage Trend
- **Self-Judging Workflow Engine** (FR-WF-001–013): **100%** — traceability enforcer passes, all 13 FRs traced
- **Dependency Tracking** (FR-dependency-*): **~80%** — most implemented; FR-dependency-search route unwired (failing tests), FR-dependency-seed missing, FR-dependency-api-types missing
- **Dev Workflow Platform** (Specifications/dev-workflow-platform.md, FR-001–FR-069): **0%** — describes a different unbuilt application; this is a known orphaned spec

### Key File Paths for Future Audits
- Active requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013)
- Dependency requirements: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Backend source: `Source/Backend/src/`
- Backend tests: `Source/Backend/tests/`
- Frontend source: `Source/Frontend/src/`
- Frontend tests: `Source/Frontend/tests/`
- Traceability enforcer: `python3 tools/traceability-enforcer.py` (only scans most-recent plan's requirements.md)

### Common Pattern Violations Found
1. **Route handlers bypass service layer**: `workItems.ts`, `workflow.ts`, `intake.ts` all import `* as store` directly — violates "No direct DB calls from route handlers"
2. **Search route not wired**: `GET /api/search` exists in tests but NOT in `app.ts` — tests are known-failing by design per comment in search.test.ts
3. **Orphaned spec**: `Specifications/dev-workflow-platform.md` has 74 FRs (FR-001–069) for a different system than what `Source/` builds — zero traceability

### Traceability Enforcer Limitation
The enforcer finds only `Plans/*/requirements.md` FRs (most recent plan). It does NOT scan:
- `Specifications/*.md` directly for FR IDs
- `Plans/dependency-linking/requirements.md` FR-dependency-* IDs
- The larger dev-workflow-platform.md spec FRs

### Dependency Feature State (2026-11-09)
Implemented in `Source/` (not `portal/` as the plan originally targeted):
- ✅ FR-dependency-service, FR-dependency-dispatch-gating, FR-dependency-endpoints, FR-dependency-metrics
- ❌ FR-dependency-search — route missing from app.ts; 5 failing tests documented
- ❌ FR-dependency-api-types — per plan delta (originally for portal/Shared/api.ts)
- ❌ FR-dependency-seed — per plan delta (originally for portal/Backend/)
