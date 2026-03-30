# README & Setup Documentation Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dev-crew usable by any first-time developer, on any OS, targeting any repo — without needing to ask the maintainer for help.

**Architecture:** Documentation-and-config changes only. The README gets restructured with a Prerequisites section, expanded Quick Start, a "Use Your Own Repo" guide, and a Troubleshooting section. Docker Compose gets a small fix for Windows path compatibility. The `.env.example` gets inline guidance. A setup-workspace.sh bug (wrong template filename) gets fixed.

**Tech Stack:** Markdown, Docker Compose YAML, Bash, `.env`

---

### Task 1: Fix the `setup-workspace.sh` template filename bug

The scaffold script at `platform/scripts/setup-workspace.sh:80` references `CLAUDE.md.template` but the actual file is `templates/CLAUDE.md`. This means external repos never get a CLAUDE.md scaffolded.

**Files:**
- Modify: `platform/scripts/setup-workspace.sh:80`

- [ ] **Step 1: Fix the template filename reference**

Change line 80 from:

```bash
    if [[ ! -f "$WORKSPACE/CLAUDE.md" ]] && [[ -f "$TEMPLATE_DIR/CLAUDE.md.template" ]]; then
      cp "$TEMPLATE_DIR/CLAUDE.md.template" "$WORKSPACE/CLAUDE.md"
```

To:

```bash
    if [[ ! -f "$WORKSPACE/CLAUDE.md" ]] && [[ -f "$TEMPLATE_DIR/CLAUDE.md" ]]; then
      cp "$TEMPLATE_DIR/CLAUDE.md" "$WORKSPACE/CLAUDE.md"
```

- [ ] **Step 2: Remove the now-unnecessary placeholder replacements**

Lines 84-97 use `sed` to replace `{{PLACEHOLDER}}` patterns, but `templates/CLAUDE.md` uses HTML `<!-- Replace -->` comments instead — it has no `{{}}` placeholders. These sed commands silently do nothing. Remove lines 84-97 and replace with a simpler PROJECT_NAME substitution:

```bash
      # Replace the generic project name placeholder
      PNAME="${PROJECT_NAME:-my-project}"
      sed -i "s|**Project Name** — Project description goes here.|**${PNAME}** — AI-managed project. Update this description in CLAUDE.md.|g" "$WORKSPACE/CLAUDE.md"
```

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `bash -n platform/scripts/setup-workspace.sh`
Expected: No output (clean parse)

- [ ] **Step 4: Commit**

```bash
git add platform/scripts/setup-workspace.sh
git commit -m "fix: correct template filename in setup-workspace.sh

setup-workspace.sh referenced CLAUDE.md.template but the actual file
is templates/CLAUDE.md. Also removed dead placeholder sed commands
that targeted {{PLACEHOLDER}} patterns not present in the template."
```

---

### Task 2: Make docker-compose credentials mount cross-platform

The `~/.claude/.credentials.json` bind mount in `docker-compose.yml:27` fails on Windows because `~` resolves differently across shells. Use an environment variable with a sensible default instead.

**Files:**
- Modify: `platform/docker-compose.yml:27`
- Modify: `platform/.env.example:7` (add new variable)

- [ ] **Step 1: Add `CLAUDE_CREDENTIALS_PATH` to `.env.example`**

Add after line 7 (`GITHUB_TOKEN=`):

```env
# Claude Code credentials — path to your local credentials file
# Run 'claude login' locally first, then point this to the generated file
# Linux/macOS: ~/.claude/.credentials.json
# Windows:     C:\Users\<you>\.claude\.credentials.json
CLAUDE_CREDENTIALS_PATH=~/.claude/.credentials.json
```

- [ ] **Step 2: Update docker-compose.yml to use the variable**

Change line 27 from:

```yaml
      - ~/.claude/.credentials.json:/root/.claude/.credentials.json:ro
```

To:

```yaml
      - ${CLAUDE_CREDENTIALS_PATH:-~/.claude/.credentials.json}:/root/.claude/.credentials.json:ro
```

- [ ] **Step 3: Verify compose config parses**

Run: `cd platform && docker compose config --quiet`
Expected: Exit 0, no errors

- [ ] **Step 4: Commit**

```bash
git add platform/docker-compose.yml platform/.env.example
git commit -m "fix: make Claude credentials mount cross-platform

Use CLAUDE_CREDENTIALS_PATH env var instead of hardcoded ~ path.
Adds inline comments in .env.example explaining the path per OS."
```

---

### Task 3: Add Prerequisites section to README

The current README jumps straight to `docker compose up` without telling the user what they need installed or how to get Claude credentials. This is the biggest blocker for first-time users.

**Files:**
- Modify: `README.md` (insert new section between line 3 and line 5)

- [ ] **Step 1: Insert Prerequisites section after the tagline (line 3)**

Insert between the tagline and `## Quick Start`:

```markdown
## Prerequisites

Before starting, you need three things:

### 1. Docker

Install [Docker Desktop](https://docs.docker.com/desktop/) (Windows/macOS) or [Docker Engine](https://docs.docker.com/engine/install/) (Linux). Compose v2 is included.

Verify: `docker compose version` should print `v2.x.x` or higher.

> **Windows users:** Docker Desktop requires WSL 2. The installer will prompt you if it's not enabled. After install, open Docker Desktop and ensure "Use the WSL 2 based engine" is checked in Settings > General.

### 2. Claude Code credentials

Workers run Claude Code inside containers. They need your local credentials.

```bash
# Install Claude Code and log in (one-time setup)
npm install -g @anthropic-ai/claude-code
claude login
```

This creates `~/.claude/.credentials.json`. Docker Compose mounts this file into the orchestrator container at startup.

> **Windows:** The file is at `C:\Users\<your-username>\.claude\.credentials.json`. Set `CLAUDE_CREDENTIALS_PATH` in your `.env` to the full path.

### 3. GitHub Personal Access Token

Create a [fine-grained token](https://github.com/settings/tokens?type=beta) with these permissions on your target repo(s):

| Permission | Access | Why |
|------------|--------|-----|
| Contents | Read and write | Clone repos, push commits |
| Pull requests | Read and write | Create PRs from completed work |
| Metadata | Read-only | Required by GitHub for all tokens |

Classic tokens with `repo` scope also work.
```

- [ ] **Step 2: Verify the markdown renders correctly**

Visually scan the raw markdown for broken tables, unclosed code blocks, or mismatched headers. All links should point to real URLs (Docker docs, GitHub token page).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Prerequisites section to README

Covers Docker install (with Windows WSL2 note), Claude Code login
for credentials, and GitHub token creation with specific permissions."
```

---

### Task 4: Expand Quick Start with build time warning and verification

First-time users need to know the first build is slow and need a way to verify everything is working.

**Files:**
- Modify: `README.md` (rewrite the Quick Start section, currently lines 5-22)

- [ ] **Step 1: Replace the Quick Start section**

Replace lines 5-22 with:

```markdown
## Quick Start

```bash
git clone https://github.com/Jason-CullumICT/dev-crew
cd dev-crew/platform
cp .env.example .env
# Edit .env:
#   - Set GITHUB_TOKEN to your PAT
#   - Set GITHUB_REPO to the repo you want agents to work on
#   - On Windows: set CLAUDE_CREDENTIALS_PATH to the full path
docker compose up -d
```

> **First build takes 5-10 minutes** — the worker image installs Node.js, Go, GitHub CLI, Playwright, and Claude Code. Subsequent starts are instant.

Verify it's running:

```bash
curl http://localhost:9800/api/health
# Expected: {"status":"ok"}
```

Three services start:

| Service | URL | Purpose |
|---------|-----|---------|
| Orchestrator | http://localhost:9800 | API + dashboard — submit work, monitor runs |
| Portal | http://localhost:4200 | Debug UI — detailed cycle/run viewer |
| Reports | http://localhost:9801 | Static HTML reports from Inspector and QA |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: expand Quick Start with build warning and health check

First-time users now know the initial build is slow, know to set
GITHUB_REPO, and have a curl command to verify the platform started."
```

---

### Task 5: Add "Using With Your Own Repo" section to README

This is the key missing piece for the "any repo" story. Users need to understand what happens when they point dev-crew at their own project.

**Files:**
- Modify: `README.md` (insert new section after the current "How It Works" section)

- [ ] **Step 1: Insert the new section after "How It Works"**

Add after the external repo scaffolding paragraph (currently line 39):

```markdown
## Using With Your Own Repo

Point dev-crew at any GitHub repository by setting `GITHUB_REPO` in your `.env`:

```env
GITHUB_REPO=https://github.com/your-org/your-project
GITHUB_BRANCH=main
```

Then submit work as normal — the orchestrator clones your repo into the worker container.

### What gets scaffolded

If your repo doesn't have a `Teams/` directory, the worker automatically creates:

| Directory | Purpose |
|-----------|---------|
| `Teams/` | Agent role definitions (TheATeam, TheFixer, TheInspector) |
| `Plans/` | Feature plan templates |
| `tools/` | Pipeline dashboard and traceability scripts |
| `CLAUDE.md` | Project configuration for AI agents (edit this to describe your project) |

This scaffold is committed and pushed to your repo on the first run. After that, customize `CLAUDE.md` to describe your project's domain, architecture, and build commands — this is how agent teams learn your codebase.

### Supported languages and tools

The worker container ships with:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22 | JavaScript/TypeScript projects |
| Python 3 | System | Python projects, pipeline scripts |
| Go | 1.23 | Go projects |
| GitHub CLI | Latest | PR creation, repo operations |
| Playwright | Chromium | End-to-end browser testing |

For projects needing other runtimes (Rust, Java, .NET, etc.), extend `platform/Dockerfile.worker` with additional install steps and rebuild with `docker compose build worker`.

### Private repos

Private repos work automatically — the `GITHUB_TOKEN` in your `.env` is used for cloning and pushing. The token needs access to the target repo (see Prerequisites for required permissions).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add 'Using With Your Own Repo' section

Explains scaffolding, supported languages, how to extend the worker
for other runtimes, and confirms private repos work via GITHUB_TOKEN."
```

---

### Task 6: Add Troubleshooting section to README

Cover the three most common first-run failures.

**Files:**
- Modify: `README.md` (append new section before the final `## Requirements` section)

- [ ] **Step 1: Insert Troubleshooting before Requirements**

Add before the `## Requirements` section:

```markdown
## Troubleshooting

### `docker compose up` fails with credentials mount error

```
Error: invalid mount config for type "bind": bind source path does not exist: ~/.claude/.credentials.json
```

You haven't logged into Claude Code locally yet. Run:

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

Then retry `docker compose up -d`. On Windows, also set `CLAUDE_CREDENTIALS_PATH` in `.env` to the full path (e.g., `C:\Users\YourName\.claude\.credentials.json`).

### Workers fail with "Claude auth: MISSING"

The credentials file exists but isn't being mounted correctly. Check:

1. `ls ~/.claude/.credentials.json` — file must exist and not be empty
2. The file must be valid JSON — run `cat ~/.claude/.credentials.json | python3 -m json.tool`
3. If you're on Windows and using Docker Desktop with WSL, the `~` path resolves inside WSL. Set `CLAUDE_CREDENTIALS_PATH` in `.env` to the Windows path instead.

### Workers can't push to the repo

Your `GITHUB_TOKEN` either doesn't have write access to the target repo or has expired. Create a new token with `contents: write` and `pull-requests: write` permissions (see Prerequisites).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Troubleshooting section to README

Covers the three most common first-run failures: credentials mount,
missing auth inside workers, and token permission issues."
```

---

### Task 7: Update the Configuration table and Requirements

The Configuration table is missing new variables (`CLAUDE_CREDENTIALS_PATH`) and the Requirements section needs to reference Prerequisites instead of being standalone.

**Files:**
- Modify: `README.md` (update Configuration table and Requirements section)

- [ ] **Step 1: Add `CLAUDE_CREDENTIALS_PATH` to the Configuration table**

Add a new row after the `GITHUB_TOKEN` row:

```markdown
| `CLAUDE_CREDENTIALS_PATH` | No | `~/.claude/.credentials.json` | Path to Claude Code credentials file (see Prerequisites) |
```

- [ ] **Step 2: Replace the Requirements section**

Replace the current Requirements section (currently the last section) with:

```markdown
## Requirements

- **Docker** with Compose v2 — see [Prerequisites](#prerequisites) for install instructions
- **GitHub PAT** — fine-grained token with `contents` + `pull-requests` write access, or classic with `repo` scope
- **Claude Code credentials** — run `claude login` once locally (see [Prerequisites](#prerequisites))
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update Configuration table and Requirements section

Adds CLAUDE_CREDENTIALS_PATH to config table. Requirements section
now cross-references Prerequisites for install details."
```

---

### Task 8: Clean up CLAUDE.md template placeholders

The dev-crew `CLAUDE.md` still has HTML comment placeholders from the template (`<!-- Add more rows -->`, `<!-- Replace: ... -->`) and unfilled sections. Clean these up for the dev-crew project specifically — this is not the template file, it's the project's own CLAUDE.md.

**Files:**
- Modify: `CLAUDE.md` (lines 5-6 tagline, lines 42-54 domain concepts, lines 98-100 build commands, lines 137-139 verification gates, lines 147-153 MCP tools)

- [ ] **Step 1: Remove unused HTML comment placeholders**

Remove these comment-only lines throughout the file — they are template instructions, not content:

1. Line 5-6: Remove `<!-- Replace with a 1-2 sentence project description -->` (the description is already filled in on line 6)
2. Lines 22-25: Remove the commented-out "Read These First" example rows
3. Lines 42-54: Replace the entire commented-out Key Domain Concepts block with actual dev-crew domain definitions:

```markdown
## Key Domain Concepts

- **Cycle** = one unit of work submitted via the API. Contains one or more runs. Has a task description, target repo, and assigned team
- **Run** = a single execution attempt within a cycle. A cycle may have multiple runs if retried after failure
- **Phase** = a pipeline stage within a run (planning, implementation, QA, validation, E2E, commit). Runs sequentially with timeout enforcement
- **Worker** = a Docker container that executes a run. Cloned repo + Claude Code credentials. Orchestrator creates workers on demand
- **Scaffold** = the `Teams/`, `Plans/`, `tools/`, `CLAUDE.md` structure auto-applied to external repos lacking agent team definitions
```

4. Lines 98-100: Replace "Build & Test" placeholder with actual commands:

```markdown
## Build & Test

```bash
# Platform (orchestrator)
cd platform && docker compose build

# Run the platform
cd platform && docker compose up -d

# Check health
curl http://localhost:9800/api/health
```

5. Lines 117-120: Remove the commented-out architecture rule examples
6. Lines 137-139: Replace verification gates placeholder:

```markdown
**Verification gates:**
```bash
# Orchestrator starts without errors
cd platform && docker compose up -d && docker compose logs orchestrator | tail -5

# Health check returns OK
curl -sf http://localhost:9800/api/health

# No syntax errors in scripts
bash -n platform/scripts/*.sh
```

7. Lines 149-153: Remove the commented-out MCP tool examples (leave the section header for future use)

- [ ] **Step 2: Verify no broken markdown**

Scan the file for unclosed code fences, broken tables, or orphaned comment tags.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: fill in CLAUDE.md domain concepts and build commands

Replaces template placeholders with actual dev-crew domain definitions
(cycle, run, phase, worker, scaffold), build/test commands, and
verification gates."
```

---

### Task 9: Clean up internal traceability comments from user-facing files

Comments like `# Verifies: dev-crew unified repo — Task 3 Step 5` in docker-compose.yml and .env.example are internal migration notes that mean nothing to outside users.

**Files:**
- Modify: `platform/docker-compose.yml:1-3`
- Modify: `platform/.env.example:1`
- Modify: `platform/Dockerfile.orchestrator:1-4`
- Modify: `platform/Dockerfile.worker:1-4`
- Modify: `portal/Dockerfile:1-4`

- [ ] **Step 1: Replace docker-compose.yml header comments**

Replace lines 1-3:

```yaml
# dev-crew platform services
# Run from platform/: docker compose up -d
# Docs: see README.md in repo root
```

- [ ] **Step 2: Replace .env.example header comment**

Replace line 1:

```env
# dev-crew platform configuration
```

- [ ] **Step 3: Replace Dockerfile headers**

In `platform/Dockerfile.orchestrator`, replace lines 1-4 with:

```dockerfile
########################################################################
# Orchestrator — API server that routes work to Claude Code workers
# Build context: repo root (..)
########################################################################
```

In `platform/Dockerfile.worker`, replace lines 1-4 with:

```dockerfile
########################################################################
# Worker — runs Claude Code team sessions in headless mode
# Build context: repo root (..)
########################################################################
```

In `portal/Dockerfile`, replace lines 1-4 with:

```dockerfile
########################################################################
# Portal — debug UI for viewing cycles, runs, and reports
# Build context: portal/
########################################################################
```

- [ ] **Step 4: Commit**

```bash
git add platform/docker-compose.yml platform/.env.example platform/Dockerfile.orchestrator platform/Dockerfile.worker portal/Dockerfile
git commit -m "chore: replace internal traceability comments with user-facing descriptions

Removes 'Verifies: dev-crew unified repo — Task N Step M' comments
from Docker and config files. These were migration tracking notes
not useful to external contributors."
```

---

### Task 10: Final review — read the README top to bottom

**Files:**
- Read: `README.md` (full file)

- [ ] **Step 1: Read the entire README and verify**

Read `README.md` from top to bottom. Check:

1. **Flow**: Prerequisites > Quick Start > How It Works > Using With Your Own Repo > Agent Teams > Repo Structure > Configuration > Monitoring > Failure Recovery > Troubleshooting > Requirements
2. **No broken links**: All anchor references (`#prerequisites`) resolve to actual headings
3. **No duplicate information**: Prerequisites and Requirements don't repeat each other verbatim
4. **Code blocks**: All fenced code blocks have language tags and are closed
5. **Tables**: All tables have correct column alignment

- [ ] **Step 2: If any issues found, fix and commit**

```bash
git add README.md
git commit -m "docs: fix review issues in README"
```
