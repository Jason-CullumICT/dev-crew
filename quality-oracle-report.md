## Quality Oracle Audit — 2026-07-30

**Grade: D** (1 P1 disqualifies A/B/C per grading config: `max_p1: 0`)

---

### Spec Coverage

| Scope | FRs | Covered | % |
|-------|-----|---------|---|
| Enforcer gate (what CI actually checks) | 13 | 13 | **100% — false green** |
| Source/ app (FR-WF-* + FR-dependency-*) | 29 | 28 | **97%** |
| portal/ app (FR-001 to FR-095+) | 95+ | Not scanned | **0%** |

---

### 10 Findings

| ID | Sev | Category | Finding |
|----|-----|----------|---------|
| **QO-001** | **P1** | correctness | `traceability-enforcer.py` auto-selects the most recently modified `requirements.md` (13 FRs) and reports PASS — while FR-dependency-* (16 FRs) and all portal/ requirements (95+ FRs) are invisible to the gate. The verification gate is structurally a false positive. |
| QO-002 | P2 | spec-drift | `portal/` is a full-stack production app (Backend + Frontend + Shared + Dockerfile, FR-001–FR-095) outside all inspector/enforcer scope. `inspector.config.yml` only lists `Source/` in `source.dirs`. |
| QO-003 | P2 | spec-drift | `FR-dependency-seed` confirmed missing — no `seed.ts` exists anywhere in `Source/Backend/src/`. Plan explicitly marks it ❌ Missing. Known dependency relationships are unseeded and unverifiable in a fresh environment. |
| QO-004 | P2 | architecture | Dependency tracking implemented independently in both `Source/` and `portal/` with incompatible FR ID aliases. Two codebases, no shared code, no reconciliation. A bug fixed in one is silently broken in the other. |
| QO-005 | P3 | doc-stale | `Plans/dependency-linking/requirements.md` implementation delta is wrong: marks BlockedBadge.test.tsx and DependencySection.test.tsx as missing (they exist), uses `portal/` paths everywhere (code is in `Source/`). |
| QO-006 | P3 | pattern-violation | `Source/Backend/src/utils/logger.ts` always emits JSON; never pretty-prints in development; ignores `LOG_LEVEL`. Violates FR-WF-013 acceptance criteria. |
| QO-007 | P3 | architecture | `workItems.ts` route handler calls `store.*` directly — bypasses service layer. Architecture rule: "No direct DB calls from route handlers." |
| QO-008 | P4 | pattern-violation | `eslint-disable-next-line react-hooks/exhaustive-deps` in two production files: `useWorkItems.ts:63`, `DependencyPicker.tsx:82`. |
| QO-009 | P4 | pattern-violation | `api/client.ts:26`: `.catch(() => ({}))` silently swallows JSON parse errors on error responses, masking proxy/service failures. |
| QO-010 | P4 | spec-drift | `WorkItemStatus` enum has no `pending_dependencies` value; dispatch gating blocks with HTTP 400 instead of status transition as the spec requires. |

---

### Top 3 Escalations

1. **QO-001 → solo-session**: Fix `traceability-enforcer.py` to scan all active `requirements.md` files, not just the most recently modified. One-file change to `tools/`.
2. **QO-002 → solo-session**: Add `portal/` to `inspector.config.yml` `source.dirs` and `source.test_dirs`. Update `CLAUDE.md` portal/ description.
3. **QO-003 → TheFixer**: Create `Source/Backend/src/store/seed.ts` with idempotent dependency seed data; wire into server startup.

Full report written to `Teams/TheInspector/findings/audit-2026-07-30-quality-oracle.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
