# Dispatch Plan: Update Root CLAUDE.md for dev-crew Unified Repo

**Task:** Update the root `CLAUDE.md` to reflect the dev-crew unified repository structure.
**Source:** `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md` Task 5
**Scope:** `CLAUDE.md` only (governance file — not Source/)
**Risk:** Low — single documentation file, no schema changes, no code changes

## Analysis

The current `CLAUDE.md` still has Work-backlog placeholder text. Four sections need updating:

1. **Project description** (line 6): "Work-backlog" → "dev-crew" with new description
2. **Repository Layout** (lines 29-35): Add `platform/`, `portal/`, `templates/`, `docs/`
3. **Dev Environment Quick Reference** (lines 55-59): Add orchestrator, portal, reports dashboard URLs
4. **Module Ownership table** (lines 158-163): Add `platform/orchestrator/`, `portal/`, `templates/`

All changes are within the same file. No cross-module coordination needed.

## Scope

- **scope_tag:** `backend-only`
- **Files:** `CLAUDE.md` (root)
- **confidence:** high

---

### backend-fixer-1

**Role file:** `Teams/TheFixer/backend-fixer.md`
**Task:** Apply four edits to `/workspace/CLAUDE.md`

**Edit 1 — Project description (line 6):**

Replace:
```
**Work-backlog** — AI-managed project. Update this description in CLAUDE.md.
```

With:
```
**dev-crew** — AI-powered development platform. Orchestrates autonomous agent teams to build software through specifications, plans, and automated pipelines.
```

**Edit 2 — Repository Layout (lines 29-35):**

Replace the code block contents:
```
Specifications/          # Domain truth (technology-agnostic)
Source/                  # Application source code
Plans/                   # Feature plans (prompt/design/plan per feature)
Teams/                   # Agent team definitions and learnings
tools/                   # Pipeline dashboard scripts
```

With:
```
Specifications/          # Domain truth (technology-agnostic)
Source/                  # Application source code (the product)
Plans/                   # Feature plans (prompt/design/plan per feature)
Teams/                   # Agent team definitions and learnings
tools/                   # Pipeline dashboard scripts
platform/                # Orchestrator infrastructure (Docker, server, scripts)
portal/                  # Debug UI (embedded via iframe)
templates/               # Clean scaffold for external projects
docs/                    # Design specs and implementation plans
```

**Edit 3 — Dev Environment Quick Reference (lines 55-59):**

Replace the table:
```
| Item | Value |
|------|-------|
| Backend URL | `http://localhost:3001` |
| Frontend URL | `http://localhost:5173` |
| Login credentials | `admin@example.com / admin123` |
```

With:
```
| Item | Value |
|------|-------|
| Orchestrator Dashboard | `http://localhost:9800` |
| Portal (Debug UI) | `http://localhost:4200` |
| Reports Dashboard | `http://localhost:9801` |
| App Backend URL | `http://localhost:3001` |
| App Frontend URL | `http://localhost:5173` |
| Login credentials | `admin@example.com / admin123` |
```

**Edit 4 — Module Ownership table (lines 158-163):**

Replace:
```
| Module | Owner | Notes |
|--------|-------|-------|
| `Source/Backend/` | backend-coder | Routes, services, database, tests |
| `Source/Frontend/` | frontend-coder | Components, hooks, pages, tests |
| `Source/Shared/` | api-contract | Shared types -- backend-coder may update if no api-contract agent in pipeline |
| `Specifications/` | requirements-reviewer | Domain truth documents |
```

With:
```
| Module | Owner | Notes |
|--------|-------|-------|
| `Source/Backend/` | backend-coder | Routes, services, database, tests |
| `Source/Frontend/` | frontend-coder | Components, hooks, pages, tests |
| `Source/Shared/` | api-contract | Shared types -- backend-coder may update if no api-contract agent in pipeline |
| `platform/orchestrator/` | backend-coder | Orchestrator server and lib |
| `portal/` | frontend-coder | Debug portal UI |
| `Specifications/` | requirements-reviewer | Domain truth documents |
| `templates/` | solo-session | Clean scaffold -- no team pipeline needed |
```

**Verification:** After edits, confirm:
- `grep "dev-crew" CLAUDE.md` returns the new description
- `grep "platform/" CLAUDE.md` appears in both Repository Layout and Module Ownership
- `grep "9800" CLAUDE.md` confirms orchestrator URL is present
- No other content was accidentally removed or modified

---

## Verification

### verify-reporter-1

Run after backend-fixer-1 completes:
- Verify all four sections were updated correctly
- Confirm no unintended changes to other sections of CLAUDE.md
- Check that markdown formatting is valid (table alignment, code blocks)
