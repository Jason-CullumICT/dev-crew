# Backlog Items — Saved Before Portal Reset (2026-04-14)

These items were in the portal at the time of the data reset. Items with status `in_development` at reset time are not included (they were already in progress). Everything here is actionable and can be re-entered into the portal when needed.

---

## Feature Requests

### FR-0001 — Display traceability reports per run in the feature portal
**Status:** approved | **Priority:** high | **Source:** code_review

The portal shows cycle/run details but has no visibility into traceability. Traceability reports are only available by running `tools/traceability-enforcer.py` manually.

**Requested behavior:**
1. Run detail view — add a Traceability tab showing coverage bar, FR table with covered/missing status, and links to source file lines.
2. Run list view — add a traceability badge (green 100%, yellow partial, red missing).
3. Surface `spec-drift-audit.py` output in an Audit section.

---

### FR-0002 — Add language detection and configurable app startup for non-Node.js projects
**Status:** approved | **Priority:** critical | **Source:** code_review

The pipeline assumes Node.js throughout. Python, Go, Rust, Java, Ruby, PHP, and .NET projects silently fail — dependencies never installed, app never starts.

**Requested behavior:**
1. `detect_stack()` function checking for `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `composer.json`, `Gemfile`.
2. Update `container-manager.js` supervisor script to try multiple startup patterns based on detected language.
3. Allow CLAUDE.md Build & Test section to specify explicit start commands.
4. Replace Prisma-specific migration with a generic CLAUDE.md-driven pattern.

**Plan ref:** `docs/superpowers/plans/2026-03-30-external-repo-compatibility.md` Task 2

---

### FR-0003 — Make project directory structure configurable instead of hardcoding Source/Backend, Source/Frontend, Source/E2E
**Status:** approved | **Priority:** critical | **Source:** code_review

The pipeline hardcodes `Source/Backend`, `Source/Frontend`, and `Source/E2E` in 20+ locations. Any repo with a different layout (`backend/`, `api/`, `server/`, `src/`) is invisible to the pipeline.

**Requested behavior:**
1. Add `BACKEND_PATH`, `FRONTEND_PATH`, `E2E_PATH` env vars with sensible fallbacks.
2. Parse CLAUDE.md Repository Layout section to auto-detect paths.
3. Make code change detection dynamic — build the regex from configured paths.
4. Update `dispatch.js` agent prompts and all shell scripts to use configured paths.

**Plan ref:** `docs/superpowers/plans/2026-03-30-external-repo-compatibility.md` Task 3

---

### FR-0004 — Configurable ports and generic smoketests — remove hardcoded 3001/5173 and dev-crew-specific endpoints
**Status:** potential | **Priority:** high | **Source:** code_review

Backend port 3001 and frontend port 5173 are hardcoded in `container-manager.js`, `workflow-engine.js`, and `run-smoketest.sh`. Any project running on different ports fails health checks silently.

`run-smoketest.sh` also has dev-crew-specific fallback endpoints hardcoded — every external repo hits 404s.

**Requested behavior:**
1. Read `BACKEND_PORT` and `FRONTEND_PORT` from env vars or CLAUDE.md.
2. In `run-smoketest.sh` replace dev-crew-specific fallbacks with generic health probing (`/health`, `/api/health`, `/healthz`, `/`).
3. Add port conflict detection.

**Depends on:** FR-0003 (configurable paths)
**Plan ref:** `docs/superpowers/plans/2026-03-30-external-repo-compatibility.md` Task 4

---

### FR-0005 — Worker Dockerfile must support languages matched by language detection
**Status:** potential | **Priority:** critical | **Source:** code_review

FR-0002 adds language detection for Python, Go, Rust, Java, Ruby, PHP, and .NET. But the worker Dockerfile only ships Node.js 22, Python 3, and Go 1.23.

**Languages to add:** Rust (rustc, cargo), Java 21 (openjdk-21-jdk, maven), Ruby 3.x (ruby, bundler), PHP 8.x (php-cli, composer), .NET 8 SDK (dotnet).

Recommended: fat image for MVP, then variant images as optimisation.

**Depends on:** FR-0002

---

### FR-0006 — Pre-flight validation on work submission — fail fast instead of 5 minutes deep
**Status:** voting | **Priority:** high | **Source:** code_review

`POST /api/work` accepts any repo URL and token with zero validation. If the repo does not exist or the token lacks access, the failure happens 5+ minutes into the pipeline inside a container.

**Requested behavior:**
1. At work submission, before creating the run: validate GITHUB_TOKEN has access to the repo, validate the branch exists.
2. Return clear error messages: 401 token access, 404 repo not found, 404 branch not found, 400 malformed URL.
3. Optional: warn if CLAUDE.md does not exist in the repo.

**Files to modify:** `platform/orchestrator/server.js`, `platform/orchestrator/lib/github-validator.js` (new)

---

### FR-0007 — E2E agent prompts should adapt to project test framework instead of forcing Playwright
**Status:** potential | **Priority:** medium | **Source:** code_review

`dispatch.js` line 184 hardcodes QA agent instructions to write Playwright TypeScript tests regardless of what test framework the project uses.

**Requested behavior:**
1. Detect existing test frameworks from marker files (`cypress.config.js`, `playwright.config.js`, `conftest.py`, `*_test.go`, `spec/` directory).
2. Store detected framework on the run object.
3. In `dispatch.js` QA agent prompt, adapt instructions based on detected framework.
4. Allow CLAUDE.md Build & Test section to specify a test framework as override.

**Depends on:** FR-0003 (configurable paths)

---

### FR-0008 — Portal should support dependency tracking between bugs and features
**Status:** approved | **Priority:** low | **Source:** manual

Multiple bugs and features have dependencies on each other but the portal has no way to express this.

**Requested behavior:**
1. Add `blocked_by` and `blocks` fields to bugs and feature requests.
2. UI: show dependency links on detail view.
3. UI: show a blocked badge on list view if any blocker is unresolved.
4. API: Accept `blocked_by` array of IDs on create/update.
5. Validation: warn (not hard block) if marking resolved with unresolved blockers.

**Note:** FR-0009 (which was in_development at reset time) is a superset of this with orchestrator dispatch gating. If FR-0009 is completed, this can be marked duplicate.

---

## Bug Reports

### BUG-0001 — setup-workspace.sh references wrong template filename (CLAUDE.md.template vs CLAUDE.md)
**Status:** reported | **Severity:** high | **Source:** platform/scripts

`platform/scripts/setup-workspace.sh` line 80 references `CLAUDE.md.template` but the actual file in `templates/` is `CLAUDE.md`. This means external repos never get a CLAUDE.md scaffolded.

**Fix:** Change the filename reference to `CLAUDE.md`, remove the dead sed placeholder replacements.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 1

---

### BUG-0002 — Docker Compose credentials mount fails on Windows (~/ path not cross-platform)
**Status:** reported | **Severity:** high | **Source:** platform/docker-compose

`docker-compose.yml` line 27 hardcodes `~/.claude/.credentials.json` as a bind mount source. On Windows, `~` resolves differently depending on the shell (PowerShell, CMD, Git Bash, WSL).

**Fix:** Add a `CLAUDE_CREDENTIALS_PATH` env var to `.env.example` with per-OS guidance comments. Update `docker-compose.yml` to use `${CLAUDE_CREDENTIALS_PATH:-~/.claude/.credentials.json}`.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 2

---

### BUG-0003 — README missing Prerequisites section — no Docker, Claude credentials, or token setup guidance
**Status:** reported | **Severity:** critical | **Source:** README.md

The README jumps straight from the tagline to "docker compose up" without telling the user what they need installed.

**Fix:** Add a Prerequisites section between the tagline and Quick Start covering Docker install, Claude Code login, and GitHub PAT creation with specific permissions.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 3

---

### BUG-0004 — Quick Start missing build time warning, GITHUB_REPO instruction, and health check verification
**Status:** reported | **Severity:** medium | **Source:** README.md

The Quick Start section has three gaps: (1) no build time warning, (2) no mention of GITHUB_REPO, (3) no verification step after `docker compose up`.

**Fix:** Rewrite Quick Start to add a build time callout, tell users to set GITHUB_REPO, and add a curl health check.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 4

---

### BUG-0005 — README missing "Using With Your Own Repo" section — no guidance on external repos
**Status:** reported | **Severity:** high | **Source:** README.md

The core pitch of dev-crew is "point it at any repo" but the README does not explain what gets scaffolded, what languages are supported, how to extend the worker Dockerfile, whether private repos work, or how to customise CLAUDE.md after scaffolding.

**Fix:** Add a "Using With Your Own Repo" section covering scaffolding details, supported languages table, Dockerfile extension instructions, and private repo confirmation.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 5

---

### BUG-0006 — README missing Troubleshooting section for common first-run failures
**Status:** reported | **Severity:** medium | **Source:** README.md

Three most common failures with no fix guidance:
1. "bind source path does not exist: ~/.claude/.credentials.json" — user has not run `claude login` yet
2. "Claude auth: MISSING" in worker logs — credentials not mounted correctly (especially Windows)
3. Workers cannot push to repo — GITHUB_TOKEN missing write permissions or expired

**Fix:** Add a Troubleshooting section with diagnostic steps and fixes for each scenario.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 6

---

### BUG-0007 — Configuration table missing CLAUDE_CREDENTIALS_PATH; Requirements section lacks actionable detail
**Status:** reported | **Severity:** low | **Source:** README.md

1. Configuration table is missing the `CLAUDE_CREDENTIALS_PATH` variable.
2. Requirements section lists prerequisites without actionable instructions.

**Fix:** Add `CLAUDE_CREDENTIALS_PATH` row to the Configuration table. Rewrite Requirements to cross-reference Prerequisites with anchor links.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 7

---

### BUG-0008 — CLAUDE.md has unfilled template placeholders and missing domain concepts
**Status:** reported | **Severity:** medium | **Source:** CLAUDE.md

1. "Key Domain Concepts" section is empty.
2. "Build & Test" section says "# Add your build and test commands here".
3. Verification gates say "# Add your test commands here".
4. Multiple HTML comment blocks clutter the file.
5. MCP Tools section has only commented-out examples.

**Fix:** Replace all placeholder content with actual dev-crew domain definitions, build commands, and verification gates.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 8

---

### BUG-0009 — Internal migration traceability comments in Docker and config files confuse external users
**Status:** reported | **Severity:** low | **Source:** platform/docker-compose, Dockerfiles

Several user-facing files contain internal migration tracking comments like "Verifies: dev-crew unified repo — Task 3 Step 5" that mean nothing to outside users:
- `platform/docker-compose.yml` lines 1-3
- `platform/.env.example` line 1
- `platform/Dockerfile.orchestrator` lines 1-4
- `platform/Dockerfile.worker` lines 1-4
- `portal/Dockerfile` lines 1-4

**Fix:** Replace each file header with user-facing descriptions.

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 9

---

### BUG-0010 — Final top-to-bottom README review after all doc changes are applied
**Status:** reported | **Severity:** low | **Source:** README.md

After BUG-0003 through BUG-0007 are resolved, the README will have several new sections written independently. A final review is needed to verify section flow, anchor links, no duplicate info, code block formatting, and table alignment.

**Depends on:** BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007

**Plan ref:** `docs/superpowers/plans/2026-03-30-readme-setup-overhaul.md` Task 10

---

### BUG-0011 — setup-cycle-workspace.sh is a copy-paste of setup-workspace.sh — DRY violation
**Status:** reported | **Severity:** medium | **Source:** platform/scripts

`setup-cycle-workspace.sh` lines 85-97 duplicate the dependency installation logic from `setup-workspace.sh` lines 41-52 almost verbatim. Every bug fix must be applied to both files or the fix is incomplete.

**Fix:** Extract shared logic into a shared function library (e.g. `platform/scripts/lib/setup-common.sh`) and source it from both scripts.

---

### BUG-0013 — No LICENSE file — blocks open-source adoption
**Status:** reported | **Severity:** high | **Source:** repo root

The dev-crew repo has no LICENSE file. Without a license, the code is under default copyright — no one can legally use, modify, or distribute it. GitHub displays "No license" on the repo page.

**Fix:** Add a LICENSE file to the repo root. Recommended: MIT (permissive, widely understood) or Apache 2.0 (permissive with patent protection).

---

## Items Cleared Without Saving (in_development at reset)

| ID | Title | Reason |
|----|-------|--------|
| FR-0009 | Dependency linking in UI/API with orchestrator dispatch gating | Already in active development |
| FR-0010 | Allow bugs and FRs to be tagged as duplicate or deprecated | Already in active development |
| BUG-0012 | `\|\| true` suppressing real npm install errors in setup scripts | Already in active development |
