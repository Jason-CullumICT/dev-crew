---

## Quality Oracle Findings — 2026-11-02

**Overall Grade: D**

### Spec Coverage

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| `Plans/self-judging-workflow` (active plan) | 13 | 13 | **100%** ✅ |
| `Plans/dev-workflow-platform` | 34 | 0 | **0%** ❌ |
| `Specifications/workflow-engine.md` | 0 (narrative) | — | not enforceable |
| `Specifications/dev-workflow-platform.md` | 69 | 0 | **0%** (never scanned) |
| **All Plans combined** | ~47 | ~13 | **~28%** |

---

### QO-001 — P1 · Traceability Gate Has a Fatal Blind Spot
**File:** `tools/traceability-enforcer.py:54`

The enforcer uses `max(req_files, key=os.path.getmtime)` — picking the single most-recently-modified `requirements.md` from all of `Plans/`. All 8 requirements files in this repo share the same `mtime`, so the selection is **arbitrary**. Currently it picks `Plans/self-judging-workflow/requirements.md` (13 FRs, all traced → gate reports PASSED). 

- `Plans/dev-workflow-platform/requirements.md` (34 FRs) → **never checked** → manually running it shows 34/34 MISSING
- `Specifications/` (the CLAUDE.md "Domain truth") → **never scanned at all**

**Recommendation:** Iterate all non-archived plans (or name the active plan explicitly in CLAUDE.md's gate command). Mark superseded plans with `status: archived` so they are skipped.

---

### QO-002 — P1 · `Specifications/dev-workflow-platform.md` Describes an Unimplemented Application
**File:** `Specifications/dev-workflow-platform.md` (lines 337–452)

The canonical Specifications directory contains 69 FRs (FR-001–FR-069) for a **feature-request management platform** (FeatureRequest, BugReport, DevelopmentCycle, SQLite). The source code implements a completely different domain: a **self-judging WorkItem workflow engine** (in-memory store). Zero of the 69 FRs are referenced anywhere in source. No spec status (superseded/deferred) is documented.

**Recommendation:** Determine product direction. If WorkItem engine is the product: archive or prepend `> Status: SUPERSEDED` to `dev-workflow-platform.md`. If both are planned: track them as separate Plans with distinct status.

---

### QO-003 — P2 · Silent Error Swallow in Frontend API Client
**File:** `Source/Frontend/src/api/client.ts:26`

```ts
const body = await response.json().catch(() => ({}));
```

JSON parse errors are silently dropped, returning `{}`. Violates CLAUDE.md: *"Never swallow errors silently — every catch must re-throw, log with full context, or explicitly document why."*

---

### QO-004 — P2 · `eslint-disable` Without Documented Rationale
**Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` with bare disable comments. No explanation of why the lint bypass is intentional, hiding potential stale-closure risks.

---

### QO-005 — P3 · Hardcoded `localhost` URL as Production Fallback
**File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`

```ts
const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
```

Silently falls back to localhost in staging/CI/demo environments if env var is unset.

---

### What's Clean ✅
- No `console.log` in production source (logger abstraction used throughout)
- No framework imports inside services (pure domain logic)
- No direct DB calls from route handlers
- No hardcoded secrets or API keys
- Zero skipped/todo tests
- Zero files over 500 lines
- All list endpoints return `{data: T[]}` wrappers
- Backend (14 test files) and Frontend tests are fully traced with `// Verifies:`

Full report saved to `Teams/TheInspector/findings/audit-2026-11-02-D.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
