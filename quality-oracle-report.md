## Quality Oracle Audit — 2026-11-08

**Grade: D** (2 P1 findings; grading table requires zero P1s for any passing grade)

---

### Spec Coverage: ~0% against `Specifications/`

| Metric | Value |
|--------|-------|
| FR IDs in `Specifications/` | 77 (FR-001 → FR-069 + sub-specs) |
| FR IDs in Source `Verifies:` | 28 (FR-WF-* and FR-dependency-*) |
| Namespace overlap | **0** |
| Enforcer result | PASSED — but only on 13 FRs from `Plans/self-judging-workflow/` |

---

### Findings

#### 🔴 QO-001 — P1 · spec-drift
**FR namespace entirely disconnected from `Specifications/`**

The 77 FRs in `Specifications/dev-workflow-platform.md` use `FR-001`–`FR-069`. Every `// Verifies:` comment in `Source/` uses `FR-WF-*` and `FR-dependency-*` IDs from a *Plans* file — zero overlap. The traceability enforcer never reads `Specifications/`, so `python3 tools/traceability-enforcer.py` always reports PASSED regardless of Specifications/ coverage.

**Fix:** Decide which FR namespace is authoritative; either realign `// Verifies:` comments to match `Specifications/` IDs, or extend the enforcer to also scan `Specifications/`.

---

#### 🔴 QO-002 — P1 · architecture-violation
**Route handlers bypass service layer (3 of 4 route files)**

`workflow.ts`, `workItems.ts`, and `intake.ts` all `import * as store from '../store/workItemStore'` and call it directly — 16+ direct store calls in route handlers. Only `dashboard.ts` correctly delegates to a service. This violates the non-negotiable CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."*

**Fix:** Extract `services/workItemService.ts` and `services/intakeService.ts`; routes should handle only HTTP concerns. Route through **TheFixer**.

---

#### 🟡 QO-003 — P2 · spec-drift
**Traceability enforcer blind spot: `Specifications/` never checked**

The enforcer scans only `Plans/*/requirements.md` (most recently modified). All 77 FRs in `Specifications/` are permanently invisible to it.

---

#### 🟡 QO-004 — P2 · spec-drift
**`Specifications/dev-workflow-platform.md` describes a superseded system**

The spec describes feature requests, bug reports, dev cycles, AI voting, SQLite — a system once implemented (confirmed by historical traceability reports in `Plans/dev-workflow-platform/`) but replaced by the self-judging workflow engine. The spec was never archived or updated, creating a landmine for agents reading it as source of truth.

**Fix:** Add a `## Status: SUPERSEDED` header or archive to `Specifications/archive/`. Route through **requirements-reviewer**.

---

#### 🟡 QO-005 — P2 · pattern-violation
**`eslint-disable` suppressions without justification (2 occurrences)**

`hooks/useWorkItems.ts:63` and `components/DependencyPicker.tsx:82` both suppress `react-hooks/exhaustive-deps` with no comment explaining why. Both were modified in the last 14 days.

---

#### 🔵 QO-006 — P4 · spec-drift
**`DebugPortalPage.tsx` uses non-standard `Verifies:` comment format** — no `FR-XXX` ID, enforcer cannot link it to any requirement.

---

Full report saved to `Teams/TheInspector/findings/quality-oracle-2026-11-08.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
