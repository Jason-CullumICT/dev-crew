# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-09-26

### Architecture Key Facts
- **Two parallel codebases exist:**
  - `Source/` — workflow engine (FR-WF-001…FR-WF-013 from Plans/self-judging-workflow). This is the active working app.
  - `portal/` — dev-workflow-platform (FR-001…FR-069 from Specifications/dev-workflow-platform.md). A separate app; dependency-linking plan was written against this.
- The `FR-dependency-*` feature was implemented in **Source/** (not portal/) even though Plans/dependency-linking references `portal/Backend/` paths. The implementation landed in Source/ as an extension to the workflow engine.
- Plans/dependency-linking/requirements.md documents this migration delta and marks FR-dependency-seed as ❌ Missing.

### Traceability Enforcer Behaviour
- The enforcer auto-selects the most-recently-modified `requirements.md` under Plans/ — currently `Plans/self-judging-workflow/requirements.md`. This gives a false-green result because the dependency-linking plan (which has an open gap) is not selected.
- When run with `--plan dependency-linking` it reports 7 failures, but most (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) are **false positives** — they are seed data item IDs embedded in prose, not requirement IDs. Only **FR-dependency-seed** is a real unimplemented requirement.
- Recommendation: run enforcer against ALL plans or configure inspector.config.yml to pin the target plan list.

### Spec Coverage Trend
- FR-WF-* (self-judging-workflow): **100% covered** (13/13)
- FR-dependency-* (dependency-linking): **15/16 covered** (FR-dependency-seed missing)
- FR-001…FR-069 (dev-workflow-platform.md): implemented in portal/ (not audited here — separate codebase)
- FR-TMP-001…FR-TMP-010 (tiered-merge-pipeline.md): implemented in platform/ (infrastructure, not Source/)

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` used as workaround in DependencyPicker.tsx and useWorkItems.ts — suppress rather than fix.
- `catch(() => ({}))` silent JSON-parse swallow in api/client.ts — violates "never swallow errors silently" rule.

### Fast-Lookup File Paths
- Traceability enforcer: `tools/traceability-enforcer.py`
- Inspector config: `Teams/TheInspector/inspector.config.yml`
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`
- Dependency plan (open gap): `Plans/dependency-linking/requirements.md`
- Backend services (no Express imports — clean): `Source/Backend/src/services/`
- Backend routes: `Source/Backend/src/routes/`
- Frontend API client: `Source/Frontend/src/api/client.ts`
