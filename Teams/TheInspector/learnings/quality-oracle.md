# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-23 — Full Audit

### Spec Coverage Trend

| Spec | FRs in Spec | Covered | % |
|------|------------|---------|---|
| Plans/self-judging-workflow (FR-WF-*) | 13 | 13* | ~100% |
| Specifications/dev-workflow-platform (FR-001–FR-069 + FR-dependency-*) | 86 | 83 | 97% |
| Specifications/tiered-merge-pipeline (FR-TMP-001–010) | 10 | 0 | 0% |
| **Combined** | **109** | **96** | **88%** |

*FR-dependency-search traced but endpoint not wired — false positive from enforcer.

### Common Pattern Violations Found

1. **Route handlers directly calling store** — `Source/Backend/src/routes/workItems.ts` and `workflow.ts` bypass service layer. Persistent violation of arch rule.
2. **Dual logger in portal/Backend** — `dependencyService.ts` imports `'../logger'` (pino, no OTel) while all other modules use `'../lib/logger'` (OTel-instrumented). Easy to miss, causes silent trace gaps.
3. **Scope creep FRs** — `portal/` implements FR-070 through FR-095, which are not defined in `Specifications/dev-workflow-platform.md`. Spec-first rule violated.
4. **Traceability enforcer blind spots** — Enforcer only checks `Source/` against the most-recently-modified `Plans/*/requirements.md`. `portal/` is invisible to it. FR-TMP-* never checked.

### Useful File Paths for Faster Future Audits

- Traceability enforcer: `tools/traceability-enforcer.py` — run with `--file Specifications/dev-workflow-platform.md` to scan Specifications directly (unsupported today, needs extension)
- Source backend routes: `Source/Backend/src/routes/` — check for store imports (architecture violations)
- Portal backend services: `portal/Backend/src/services/` — verify all import from `'../lib/logger'` not `'../logger'`
- Portal Shared API types: `portal/Shared/api.ts` — check `UpdateBugInput` and `UpdateFeatureRequestInput` for `blocked_by` field
- Seed file gap: `portal/Backend/src/database/seed.ts` — does not exist (FR-dependency-seed)

### Key Findings Summary (P1/P2)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| QO-001 | P1 | `/api/search` not wired in `Source/Backend` (test explicitly fails) | OPEN |
| QO-002 | P2 | Architecture: routes directly call store without service layer | OPEN |
| QO-003 | P2 | FR-TMP-001–010 (tiered-merge-pipeline) not implemented — 0% coverage | OPEN |
| QO-004 | P2 | `FR-dependency-api-types` missing — `blocked_by` absent from UpdateBug/FRInput, forces `as any` | OPEN |
| QO-005 | P2 | Dual logger in portal/Backend — dependencyService uses pino (no OTel), rest use lib/logger | OPEN |
| QO-006 | P2 | Traceability enforcer scope gap — portal/ and FR-TMP-* never checked | OPEN |
