# Template Cleanup — Dispatch Plan

**Task:** Clean up `templates/` directory for use as a project scaffold.
**Source:** `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md` Task 4
**Risk:** Low — file creation/deletion in templates only, no schema changes, no Source/ edits.
**Scope tag:** `backend-only` (file operations only, no frontend component work)

---

## Pre-Analysis

### Current State
- `templates/Teams/*/learnings/` — contains only `.gitkeep` files (no `.md` to delete) ✓
- No `findings/` directories exist anywhere in `templates/Teams/` ✓
- `templates/CLAUDE.md` does NOT exist — there is `templates/CLAUDE.md.template` (uses `{{placeholder}}` syntax)
- `templates/Specifications/` directory does NOT exist — need to create with `README.md`
- `templates/Plans/_template/README.md` exists and is complete ✓
- `templates/tools/` has all 3 required scripts: `pipeline-update.sh`, `traceability-enforcer.py`, `spec-drift-audit.py` ✓

### What Needs Doing
1. **Step 1 (learnings/findings cleanup):** Already clean. Verify and confirm — no action needed.
2. **Step 2 (Create `templates/CLAUDE.md`):** Create a new `templates/CLAUDE.md` with `<!-- Replace -->` placeholders. Use architecture rules from root `CLAUDE.md` but strip project-specific content. The existing `CLAUDE.md.template` uses `{{mustache}}` placeholders — the task explicitly asks for `<!-- Replace -->` style. Create the new file; optionally remove the old `.template` file.
3. **Step 3 (Create `templates/Specifications/README.md`):** Create directory and README with instructions.
4. **Step 4 (Verify `templates/Plans/_template/README.md`):** Already exists and is good. No action needed.
5. **Step 5 (Verify `templates/tools/`):** All 3 files present. No action needed.

---

## Dispatch

### backend-fixer-1

**Scope:** Create and clean up template files in `templates/` directory.

**Files to modify/create:**
- CREATE: `templates/CLAUDE.md`
- CREATE: `templates/Specifications/README.md`
- OPTIONAL DELETE: `templates/CLAUDE.md.template` (superseded by new `CLAUDE.md`)

**Instructions:**

#### 1. Verify learnings/findings are clean (no changes needed)

Run these verifications:
```bash
# Should only show .gitkeep files
find templates/Teams -path "*/learnings/*" -type f
# Should show nothing
find templates/Teams -name "findings" -type d
```

Both should confirm the directories are already clean.

#### 2. Create `templates/CLAUDE.md`

Create `templates/CLAUDE.md` with these exact contents:

```markdown
# CLAUDE.md

## This is an AI-first, spec-first project.

<!-- Replace this with your project description -->

Every decision and line of code must trace back to a specification. If the spec doesn't cover it, write the spec first.

The workflow is always: **Specifications -> Plans -> Source -> Tests**.

## Read These First

| Document | What it covers |
|----------|---------------|
| [`Specifications/`](Specifications/) | Domain specifications. **The most critical documents.** |
| [`Plans/`](Plans/) | Feature plans with prompt, design, and plan files. |
| [`Teams/`](Teams/) | Agent team definitions and learnings |
| [`tools/`](tools/) | Pipeline dashboard reporting and traceability enforcement |

## Repository Layout

```
Specifications/          # Domain truth (technology-agnostic)
Source/                  # Application source code
Plans/                   # Feature plans (prompt/design/plan per feature)
Teams/                   # Agent team definitions and learnings
tools/                   # Pipeline dashboard scripts
```

## Dev Environment Quick Reference

| Item | Value |
|------|-------|
| Backend URL | <!-- Replace with your backend URL --> |
| Frontend URL | <!-- Replace with your frontend URL --> |

## Build & Test

<!-- Replace with your build and test commands -->

## Architecture Rules

These are non-negotiable. All agents and solo sessions must follow them.

- **Specs are source of truth** -- implementation traces to specs, never the other way around
- **No direct DB calls from route handlers** -- use the service layer
- **Shared types are single source of truth** -- no inline type re-definitions across layers
- **Every FR needs a test** with `// Verifies: FR-XXX` traceability comments
- **Schema changes require a migration**
- **No hardcoded secrets** -- use environment variables via `.env`
- **No silent failures** -- every operation that can fail must have its outcome checked and logged

## Testing Rules

Write tests before or alongside implementation. Run verification gates before marking any task done.

**Verification gates:**
```bash
# <!-- Replace with your test commands -->
```

If any gate fails: fix it, re-run the full gate sequence, then mark done.

## Agent Teams

**Source code changes MUST go through a team pipeline** (TheATeam or TheFixer) for QA, code review, traceability, and test coverage. Solo sessions may edit `Specifications/`, `Plans/`, `Teams/`, `docs/`, and `tools/` freely. If a solo session must touch `Source/` (e.g., urgent hotfix), it MUST run all verification gates, confirm zero new failures, and update any broken tests before committing.

**Team rules** (when running as part of any agent team):
1. **Read `CLAUDE.md` in full** before starting any task
2. **Stay in your module** -- do not edit files outside your assigned scope
3. **Run verification gates** before reporting completion -- all gates must pass with zero new failures
4. **Share findings** via `agent.md` when you discover something that affects other agents
5. **Do not suppress test output** or skip verification
```

**IMPORTANT:** The file must use triple-backtick fenced code blocks for the Repository Layout and Verification gates sections. Ensure the markdown is valid — nested code fences need care.

#### 3. Create `templates/Specifications/README.md`

Create `templates/Specifications/README.md` with:

```markdown
# Specifications

Add your domain specifications here. Each spec should be technology-agnostic and describe WHAT the system does, not HOW.

Use functional requirement IDs (e.g., FR-XX-001) for traceability.
```

#### 4. Delete the old template file

```bash
rm templates/CLAUDE.md.template
```

This file is superseded by the new `templates/CLAUDE.md`.

#### 5. Verify final state

```bash
# CLAUDE.md exists with Replace placeholders
grep "Replace" templates/CLAUDE.md

# Specifications README exists
cat templates/Specifications/README.md

# Plans template exists
ls templates/Plans/_template/README.md

# Tools are present
ls templates/tools/pipeline-update.sh templates/tools/traceability-enforcer.py templates/tools/spec-drift-audit.py

# No learnings .md files (only .gitkeep)
find templates/Teams -path "*/learnings/*.md" -type f

# No findings directories
find templates/Teams -name "findings" -type d
```

All checks should pass.

---

## Verification Criteria

- [ ] `templates/Teams/*/learnings/` contains only `.gitkeep` files
- [ ] No `findings/` directories exist in `templates/Teams/`
- [ ] `templates/CLAUDE.md` exists with `<!-- Replace -->` placeholders
- [ ] `templates/CLAUDE.md` includes: Read These First, Repository Layout, Architecture Rules, Agent Teams sections
- [ ] `templates/Specifications/README.md` exists with instructions
- [ ] `templates/Plans/_template/README.md` exists
- [ ] `templates/tools/` contains: `pipeline-update.sh`, `traceability-enforcer.py`, `spec-drift-audit.py`
- [ ] `templates/CLAUDE.md.template` removed (superseded)
