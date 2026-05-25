---

## Quality Oracle Findings

**Grade: B** | Date: 2026-05-25 | Spec coverage: ~99.3% (139/140 traced FRs)

---

### Spec Coverage: ~99.3%

**~140 requirements** across 3 specs + 8 plans  
**~139 traced** — distributed across `Source/`, `portal/`, and `platform/`  
**1 truly unimplemented** — FR-dependency-seed

> ⚠️ **Critical context:** This project has a split implementation. The `portal/` directory (invisible to the default enforcer) implements ~80% of all FRs. What looks like missing coverage in the enforcer output is mostly a scan-scope gap.

---

### QO-001: Traceability Enforcer Scope is Fatally Misaligned
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:69`
- **Detail:** The mandatory gate `python3 tools/traceability-enforcer.py` has two blind spots: (1) it scans only `Source/` and `E2E/` — the `portal/` directory (implementing ~80% of product FRs) is completely invisible; (2) it auto-selects only the most-recently-modified `requirements.md` (13 FR-WF-* items from self-judging-workflow), leaving 7 other plans with ~127 requirements unchecked. The "TRACEABILITY PASSED" output is misleading — it validates 13 of ~140 total requirements.
- **Recommendation:** Add `portal/` and `platform/` to `source_dirs` in the enforcer. Add a `--all-plans` flag or update the CLAUDE.md gate to loop over all `Plans/*/requirements.md` files.

---

### QO-002: Route Handlers Bypass Service Layer
- **Severity:** P2  
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`
- **Detail:** Three route files import `* as store from '../store/workItemStore'` and call store functions directly (`store.createWorkItem`, `store.findById`, `store.updateWorkItem`, `store.softDelete`). CLAUDE.md rule: **"No direct DB calls from route handlers — use the service layer."** The store is the data layer. A service layer exists for domain operations but CRUD bypasses it entirely.
- **Recommendation:** Create `Source/Backend/src/services/workItemService.ts`. Route handlers call service functions only. [ESCALATE → TheFixer]

---

### QO-003: FR-dependency-seed Is Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/seed.ts` (file does not exist)
- **Detail:** The dependency-linking plan requires idempotent seed data creation for known dependency relationships (BUG-0010 blocked by 5 bugs; 3 FR→FR dependencies). No `seed.ts` file exists anywhere in the codebase. No `// Verifies: FR-dependency-seed` comment found in any file. Acceptance criteria ("GET /api/bugs/BUG-0010 returns 5 items in blocked_by on a fresh install") cannot be satisfied.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` per spec. [ESCALATE → TheFixer]

---

### QO-004: Enforcer Parses Entity IDs as Requirement IDs (False Positives)
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py:63`, `Plans/dependency-linking/requirements.md`
- **Detail:** The enforcer regex `FR-[A-Z0-9-]+` captures entity IDs embedded in plan prose (e.g. "FR-0007 blocked_by FR-0003" — these are Feature Request *record IDs* in seed data, not functional requirement IDs). Running `--plan dependency-linking` reports FR-0002, FR-0003, FR-0004, FR-0005, FR-0007 as missing requirements. Additionally, placeholder IDs (`FR-XXX`, `FR-XXXX`, `FR-0XX`) remain in 4 requirements files, generating permanent false failures.
- **Recommendation:** Distinguish entity ID references in prose (use backtick formatting). Add enforcer blocklist for `FR-0\d{3}` pattern. Remove all placeholder IDs from requirements files.

---

### QO-005: FR-070–095 and FR-DUP-01–13 Not in Specifications/ (Only in Plans/)
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (stops at FR-069)
- **Detail:** ~38 requirement IDs for image upload, orchestrator dashboard, and duplicate/deprecated status tracking are implemented and traced in `portal/` but have no entry in the canonical `Specifications/` directory. They exist only in `Plans/`. This inverts the "specs are source of truth" rule — implementation preceded canonicalization.
- **Recommendation:** Extend `Specifications/dev-workflow-platform.md` with domain-level coverage for these feature groups.

---

### QO-006: Unexplained eslint-disable in Production Frontend
- **Severity:** P3  
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions with no inline explanation of why the dependency is intentionally excluded.
- **Recommendation:** Add explanatory comment inline. Audit if dependency should actually be included.

---

### QO-007: DebugPortalPage Has No Test File
- **Severity:** P4
- **Category:** untested
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** The only page in Source/Frontend with no corresponding test file. Minimal page (renders an iframe), but should have a smoke test verifying the `src` attribute.

---

**Report written to:** `Teams/TheInspector/findings/audit-2026-05-25-B.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
