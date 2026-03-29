# Inspector Loop — Automated Self-Review System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a rotating, persona-driven self-review process that continuously audits the project from different perspectives and files findings directly into the portal.

**Architecture:** A `platform/personas/` directory holds review persona templates. A cron-scheduled job rotates through personas, submitting each as a work item to the orchestrator targeting TheInspector team. Inspectors file findings as bugs/features via the portal API. A monthly retro persona reads the backlog for patterns and produces a trend report.

**Tech Stack:** Markdown (persona templates), Node.js (orchestrator scheduling), Bash (cron), Portal REST API

---

### Task 1: Create persona prompt templates

Each persona is a markdown file that defines the review question, scope, what to check, and how to file findings. The orchestrator reads these and sends them as the task description to TheInspector team.

**Files:**
- Create: `platform/personas/new-user.md`
- Create: `platform/personas/external-repo.md`
- Create: `platform/personas/security.md`
- Create: `platform/personas/reliability.md`
- Create: `platform/personas/staleness.md`
- Create: `platform/personas/performance.md`
- Create: `platform/personas/dry-debt.md`
- Create: `platform/personas/retro.md`

- [ ] **Step 1: Create the personas directory**

```bash
mkdir -p platform/personas
```

- [ ] **Step 2: Create `new-user.md`**

```markdown
# Persona: New User

## Question
Can someone set up and use this project from scratch using only the README and .env.example?

## Scope
- README.md, SETUP-GUIDE.md, .env.example, docker-compose.yml
- First 10 minutes of experience: clone, configure, start, verify

## Review Checklist
1. Follow the README Quick Start literally — does every command work?
2. Are all prerequisites listed with install instructions and links?
3. Is there a verification step (health check, expected output)?
4. Are error messages helpful when something is misconfigured?
5. Does .env.example have comments explaining every variable?
6. Is the first build time mentioned? Does it warn about slow steps?
7. On Windows: do all paths, commands, and mounts work?
8. On macOS: any Homebrew or M1/M2 specific gotchas?

## Filing Instructions
- Before filing, GET /api/bugs and check for duplicates (similar title)
- File issues as bugs via POST http://localhost:4201/api/bugs
- Set source_system to the file where the issue lives
- Set severity: critical if it blocks setup, high if it misleads, medium if confusing, low if cosmetic
- Include the exact step where the user would get stuck

## Frequency
Weekly (Monday)
```

- [ ] **Step 3: Create `external-repo.md`**

```markdown
# Persona: External Repo User

## Question
Does anything in the platform assume this specific project's language, structure, ports, or conventions?

## Scope
- platform/orchestrator/ (server.js, lib/*.js)
- platform/scripts/*.sh
- platform/Dockerfile.worker
- templates/CLAUDE.md

## Review Checklist
1. Search for hardcoded paths: Source/Backend, Source/Frontend, Source/E2E
2. Search for hardcoded ports: 3001, 5173, 4200, 4201
3. Search for hardcoded branch names: master, main
4. Search for hardcoded tech: npm, node, vite, prisma, playwright, express
5. Search for hardcoded API endpoints specific to this project
6. Check if CLAUDE.md template works for non-web projects (CLI tools, libraries, mobile apps)
7. Check if agent prompts reference project-specific patterns
8. Test mentally: "What happens if I point this at a Python Django repo? A Go CLI? A Rust library?"

## Filing Instructions
- File hardcoded assumptions as bugs via POST http://localhost:4201/api/bugs
- File missing configurability as features via POST http://localhost:4201/api/feature-requests
- Set severity/priority based on: blocker (prevents usage) > degraded (works poorly) > cosmetic
- Include the file, line number, what's hardcoded, and what language/framework it breaks for

## Frequency
Weekly (Thursday)
```

- [ ] **Step 4: Create `security.md`**

```markdown
# Persona: Security Reviewer

## Question
Are there exposed secrets, injection risks, auth gaps, or unsafe defaults?

## Scope
- All files in platform/orchestrator/ and platform/scripts/
- .env files, Docker volumes, credential mounts
- API endpoints (authentication, authorization)
- Shell command construction (injection risks)

## Review Checklist
1. Are any secrets committed to git? (grep for tokens, passwords, API keys)
2. Are .env files in .gitignore?
3. Is the Docker socket mount (/var/run/docker.sock) necessary? What's the blast radius?
4. Are API endpoints authenticated or open to anyone on the network?
5. Are shell commands constructed from user input without sanitization? (command injection)
6. Are container escape paths possible? (privileged mode, host mounts)
7. Are credentials passed via environment variables only, never command line args?
8. Is GITHUB_TOKEN exposed in logs, error messages, or PR bodies?
9. Are worker containers isolated from each other?

## Filing Instructions
- File via POST http://localhost:4201/api/bugs with severity: critical for exposed secrets or injection, high for auth gaps, medium for unsafe defaults
- Set source_system to the affected file
- Include proof: the exact line where the vulnerability exists and how it could be exploited

## Frequency
Weekly (Tuesday)
```

- [ ] **Step 5: Create `reliability.md`**

```markdown
# Persona: Reliability Reviewer

## Question
What happens when things fail? Are errors handled, logged, and recoverable?

## Scope
- platform/orchestrator/lib/*.js (all error paths)
- platform/scripts/*.sh (error handling, set -e behavior)
- Docker container lifecycle (restart policies, health checks)

## Review Checklist
1. Search for empty catch blocks: catch {} and .catch(() => {})
2. Search for || true without justification comments
3. Search for 2>/dev/null — is stderr being silenced unnecessarily?
4. Are Docker containers restarted on failure? Do they have health checks?
5. If a worker crashes mid-run, is the run marked as failed? Is the volume preserved?
6. If the orchestrator crashes, do in-progress runs recover on restart?
7. Are timeouts enforced? What happens when CYCLE_TIMEOUT_MS or PHASE_TIMEOUT_MS fires?
8. Are retry mechanisms idempotent? Can a retried run corrupt the previous attempt's state?
9. Are log messages structured with enough context to diagnose failures?

## Filing Instructions
- File via POST http://localhost:4201/api/bugs
- Set severity: high for data loss or silent corruption, medium for missing error handling, low for log verbosity
- Include the failure scenario: "If X fails, then Y happens (or doesn't happen)"

## Frequency
Bi-weekly (Week 2, 4 — Wednesday)
```

- [ ] **Step 6: Create `staleness.md`**

```markdown
# Persona: Staleness Auditor

## Question
Are docs, dependencies, configs, and references still accurate for the current state of the code?

## Scope
- README.md, CLAUDE.md, docs/*.md
- package.json dependencies (outdated, vulnerable)
- Docker base images (outdated Node, Ubuntu versions)
- Internal references (file paths, line numbers in comments, URLs)

## Review Checklist
1. Do README code examples actually work? (copy-paste test)
2. Does CLAUDE.md "Repository Layout" match the actual directory structure?
3. Are package.json dependencies up to date? Any known vulnerabilities? (npm audit)
4. Are Docker base images recent? (node:22-slim, ubuntu:24.04 — check for newer)
5. Do internal comments reference correct line numbers? (code may have shifted)
6. Are links in docs valid? (no 404s)
7. Do .env.example variables match what the code actually reads?
8. Are team definitions in Teams/ consistent with what dispatch.js expects?

## Filing Instructions
- File stale docs as bugs (source_system: the stale file)
- File dependency updates as bugs with severity: high for security vulns, low for version bumps
- Include what's stale and what the current correct value should be

## Frequency
Bi-weekly (Week 1, 3 — Wednesday)
```

- [ ] **Step 7: Create `dry-debt.md`**

```markdown
# Persona: Tech Debt Reviewer

## Question
Is there duplicated code, dead code, growing complexity, or patterns that should be abstracted?

## Scope
- platform/orchestrator/lib/*.js
- platform/scripts/*.sh
- templates/

## Review Checklist
1. Are there files with near-identical logic? (setup-workspace.sh vs setup-cycle-workspace.sh)
2. Are there functions longer than 100 lines that do multiple things?
3. Are there magic numbers or strings that should be constants or config?
4. Is there dead code? (unreachable branches, unused exports, commented-out blocks)
5. Are there TODO/FIXME/HACK comments that have been there for more than 2 weeks?
6. Are there abstractions that serve only one caller? (premature abstraction)
7. Are there copy-pasted code blocks that diverged slightly? (most dangerous form of duplication)
8. Is the test coverage adequate for critical paths? (pipeline phases, error handling)

## Filing Instructions
- File duplication and dead code as bugs
- File missing abstractions and architectural improvements as feature requests
- Set severity/priority based on: how often the duplicated code needs to change (high frequency = high priority)

## Frequency
Monthly (Week 3 — Friday)
```

- [ ] **Step 8: Create `performance.md`**

```markdown
# Persona: Performance Reviewer

## Question
Are there unnecessary bottlenecks, wasteful operations, or scalability limits?

## Scope
- platform/orchestrator/ (API response times, container management)
- platform/scripts/ (setup time, build time)
- Docker images (layer caching, image size)
- Pipeline phases (which phases take longest, can they be parallelized)

## Review Checklist
1. How large is the worker Docker image? Can layers be optimized?
2. Are npm install / dependency installs cached between runs?
3. Are there sequential operations that could be parallelized? (e.g., backend + frontend install)
4. Are there unbounded loops or queries? (listing all runs without pagination)
5. How many concurrent workers can run before the system degrades?
6. Are there polling loops that should be event-driven?
7. Is the workspace volume shared efficiently or copied redundantly?
8. Are Playwright browser downloads cached or re-downloaded each run?

## Filing Instructions
- File bottlenecks as bugs if they affect every run
- File optimization opportunities as feature requests
- Include estimated time impact: "This adds ~X minutes to every run"

## Frequency
Monthly (Week 4 — Friday)
```

- [ ] **Step 9: Create `retro.md`**

```markdown
# Persona: Monthly Retro

## Question
What patterns are emerging across all review findings? What's getting better, what's getting worse?

## Scope
- All bugs and feature requests in the portal (GET /api/bugs, GET /api/feature-requests)
- Git log for the past month
- Previous retro findings (if any)

## Review Process
1. GET /api/bugs — group by source_system, count by severity, count by status
2. GET /api/feature-requests — group by source, count by priority, count by status
3. Calculate: resolved vs reported ratio for the past month
4. Identify top 3 categories with most open items
5. Identify any items that have been "reported" for more than 2 weeks without progress
6. Check: are previous retro recommendations being acted on?

## Output Format
Write a retro report to docs/retro/YYYY-MM.md with:
- **Health score:** Open critical/high items count (lower is better)
- **Top patterns:** What categories keep appearing?
- **Velocity:** How many items resolved vs filed this month?
- **Stale items:** Anything sitting untouched for 2+ weeks?
- **Recommendations:** Top 3 architectural changes that would prevent the most bugs

## Filing Instructions
- Do NOT file individual bugs from the retro — those should come from persona runs
- File architectural recommendations as feature requests with source: "code_review"
- If a pattern spans multiple existing items, add a comment linking them (once portal supports it)

## Frequency
Monthly (Last Friday of month)
```

- [ ] **Step 10: Commit**

```bash
git add platform/personas/
git commit -m "docs: add review persona templates for inspector loop

8 personas: new-user, external-repo, security, reliability,
staleness, dry-debt, performance, and monthly retro. Each defines
the review question, scope, checklist, filing instructions, and
suggested frequency."
```

---

### Task 2: Add persona runner to the orchestrator

The orchestrator needs a way to load a persona template and submit it as a work item targeting TheInspector team.

**Files:**
- Create: `platform/orchestrator/lib/persona-runner.js`
- Modify: `platform/orchestrator/server.js` (add POST /api/inspect endpoint)

- [ ] **Step 1: Create `persona-runner.js`**

```javascript
const fs = require("fs");
const path = require("path");

const PERSONAS_DIR = path.join(__dirname, "../../personas");

function listPersonas() {
  if (!fs.existsSync(PERSONAS_DIR)) return [];
  return fs
    .readdirSync(PERSONAS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""));
}

function loadPersona(name) {
  const filePath = path.join(PERSONAS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Persona not found: ${name}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function buildInspectorTask(personaName, repoOverride) {
  const template = loadPersona(personaName);
  const prefix = [
    `You are running a scheduled review as the "${personaName}" persona.`,
    "Read your persona definition below, then follow its review checklist.",
    "File all findings via the portal REST API as described in your filing instructions.",
    "Before filing, check GET http://localhost:4201/api/bugs for duplicates.",
    "",
    "---",
    "",
  ].join("\n");

  return {
    task: prefix + template,
    team: "TheInspector",
    repo: repoOverride || undefined,
  };
}

module.exports = { listPersonas, loadPersona, buildInspectorTask };
```

- [ ] **Step 2: Add API endpoint to server.js**

Add to the API routes section of server.js:

```javascript
const { listPersonas, buildInspectorTask } = require("./lib/persona-runner");

// List available review personas
app.get("/api/personas", (req, res) => {
  res.json({ data: listPersonas() });
});

// Trigger a review run for a specific persona
app.post("/api/inspect", (req, res) => {
  const { persona, repo } = req.body;
  if (!persona) {
    return res.status(400).json({ error: "persona is required" });
  }
  try {
    const workItem = buildInspectorTask(persona, repo);
    // Reuse existing work submission logic
    // (same as POST /api/work but with pre-built task)
    // ... submit workItem through the normal pipeline ...
    res.json({ status: "submitted", persona, team: "TheInspector" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Verify persona loading works**

```bash
cd platform/orchestrator && node -e "
  const { listPersonas, loadPersona } = require('./lib/persona-runner');
  console.log('Personas:', listPersonas());
  console.log('First 100 chars:', loadPersona('new-user').slice(0, 100));
"
```

Expected: List of 8 persona names, first 100 chars of new-user.md content.

- [ ] **Step 4: Commit**

```bash
git add platform/orchestrator/lib/persona-runner.js platform/orchestrator/server.js
git commit -m "feat: add persona runner for scheduled inspector reviews

GET /api/personas lists available review personas.
POST /api/inspect {persona, repo?} triggers TheInspector team
with the persona's review template as the task description."
```

---

### Task 3: Add dedup check to inspector filing workflow

Inspectors need to check the portal for existing bugs before filing duplicates. This is a utility function they can call before POSTing.

**Files:**
- Create: `platform/scripts/portal-dedup.sh`

- [ ] **Step 1: Create the dedup helper script**

```bash
#!/bin/bash
set -euo pipefail

# portal-dedup.sh — check if a similar bug already exists before filing
# Usage: portal-dedup.sh "title fragment to search for"
# Exit 0 = no duplicate found, safe to file
# Exit 1 = probable duplicate exists, prints matching bug ID

PORTAL_API="${PORTAL_API:-http://localhost:4201}"
SEARCH_TERM="$1"

if [[ -z "$SEARCH_TERM" ]]; then
  echo "Usage: portal-dedup.sh <title-fragment>" >&2
  exit 2
fi

# Fetch all bugs and search titles (case-insensitive)
MATCH=$(curl -sf "$PORTAL_API/api/bugs" \
  | python3 -c "
import sys, json
term = '$SEARCH_TERM'.lower()
bugs = json.load(sys.stdin).get('data', [])
for b in bugs:
    if term in b['title'].lower():
        print(f\"{b['id']}: {b['title']}\")
" 2>/dev/null)

if [[ -n "$MATCH" ]]; then
  echo "DUPLICATE FOUND:" >&2
  echo "$MATCH" >&2
  exit 1
else
  echo "No duplicate found for: $SEARCH_TERM" >&2
  exit 0
fi
```

- [ ] **Step 2: Make it executable and test**

```bash
chmod +x platform/scripts/portal-dedup.sh
platform/scripts/portal-dedup.sh "template filename" && echo "No dup" || echo "Dup found"
```

Expected: "DUPLICATE FOUND: BUG-0001: setup-workspace.sh references wrong template filename..."

- [ ] **Step 3: Commit**

```bash
git add platform/scripts/portal-dedup.sh
git commit -m "feat: add portal dedup check for inspector filing

portal-dedup.sh checks existing bugs before filing duplicates.
Exit 0 = safe to file, exit 1 = probable duplicate found.
Used by inspector personas to avoid re-filing known issues."
```

---

### Task 4: Add cron schedule configuration

Define the rotation schedule so the orchestrator can trigger persona reviews automatically.

**Files:**
- Create: `platform/personas/schedule.json`
- Modify: `platform/orchestrator/lib/persona-runner.js` (add schedule loader)

- [ ] **Step 1: Create `schedule.json`**

```json
{
  "description": "Inspector loop review schedule. Day 0=Sunday, 1=Monday, ..., 5=Friday.",
  "schedules": [
    { "persona": "new-user",      "day": 1, "week": "every",   "note": "Monday weekly" },
    { "persona": "security",      "day": 2, "week": "every",   "note": "Tuesday weekly" },
    { "persona": "staleness",     "day": 3, "week": "odd",     "note": "Wednesday weeks 1,3" },
    { "persona": "reliability",   "day": 3, "week": "even",    "note": "Wednesday weeks 2,4" },
    { "persona": "external-repo", "day": 4, "week": "every",   "note": "Thursday weekly" },
    { "persona": "dry-debt",      "day": 5, "week": "third",   "note": "Friday week 3 only" },
    { "persona": "performance",   "day": 5, "week": "fourth",  "note": "Friday week 4 only" },
    { "persona": "retro",         "day": 5, "week": "last",    "note": "Last Friday of month" }
  ]
}
```

- [ ] **Step 2: Add schedule loader to persona-runner.js**

Add to persona-runner.js:

```javascript
function loadSchedule() {
  const schedulePath = path.join(PERSONAS_DIR, "schedule.json");
  if (!fs.existsSync(schedulePath)) return [];
  return JSON.parse(fs.readFileSync(schedulePath, "utf8")).schedules;
}

function getTodaysPersonas() {
  const schedule = loadSchedule();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekOfMonth = Math.ceil(now.getDate() / 7);
  const isLastWeek = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() < 7;

  return schedule
    .filter((s) => s.day === dayOfWeek)
    .filter((s) => {
      if (s.week === "every") return true;
      if (s.week === "odd") return weekOfMonth % 2 === 1;
      if (s.week === "even") return weekOfMonth % 2 === 0;
      if (s.week === "third") return weekOfMonth === 3;
      if (s.week === "fourth") return weekOfMonth === 4;
      if (s.week === "last") return isLastWeek;
      return false;
    })
    .map((s) => s.persona);
}

module.exports = { listPersonas, loadPersona, buildInspectorTask, loadSchedule, getTodaysPersonas };
```

- [ ] **Step 3: Add GET /api/personas/today endpoint**

Add to server.js:

```javascript
const { getTodaysPersonas } = require("./lib/persona-runner");

app.get("/api/personas/today", (req, res) => {
  res.json({ data: getTodaysPersonas(), date: new Date().toISOString() });
});
```

- [ ] **Step 4: Commit**

```bash
git add platform/personas/schedule.json platform/orchestrator/lib/persona-runner.js platform/orchestrator/server.js
git commit -m "feat: add review schedule configuration for inspector loop

schedule.json defines which persona runs on which day/week.
GET /api/personas/today returns today's scheduled reviews.
Supports weekly, bi-weekly, monthly, and last-week-of-month patterns."
```

---

### Task 5: Add the daily trigger

A lightweight script (or orchestrator startup hook) that checks the schedule and submits today's review personas.

**Files:**
- Create: `platform/scripts/run-inspector-loop.sh`

- [ ] **Step 1: Create the trigger script**

```bash
#!/bin/bash
set -euo pipefail

# run-inspector-loop.sh — check today's schedule and submit review personas
# Run via cron: 0 9 * * 1-5 /app/scripts/run-inspector-loop.sh

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:8080}"

echo "═══════════════════════════════════════════"
echo "  Inspector Loop — $(date '+%A %Y-%m-%d')"
echo "═══════════════════════════════════════════"

# Get today's scheduled personas
PERSONAS=$(curl -sf "$ORCHESTRATOR_URL/api/personas/today" \
  | python3 -c "import sys,json; print(' '.join(json.load(sys.stdin).get('data',[])))" 2>/dev/null)

if [[ -z "$PERSONAS" ]]; then
  echo "No reviews scheduled for today."
  exit 0
fi

echo "Scheduled reviews: $PERSONAS"
echo ""

for persona in $PERSONAS; do
  echo "Submitting: $persona"
  RESULT=$(curl -sf -X POST "$ORCHESTRATOR_URL/api/inspect" \
    -H "Content-Type: application/json" \
    -d "{\"persona\": \"$persona\"}" 2>/dev/null)
  echo "  Result: $RESULT"
  echo ""
done

echo "═══════════════════════════════════════════"
echo "  All reviews submitted."
echo "═══════════════════════════════════════════"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x platform/scripts/run-inspector-loop.sh
```

- [ ] **Step 3: Add cron example to .env.example**

Add to the bottom of platform/.env.example:

```env
# Inspector Loop — automated review schedule
# To enable, add a cron job in the orchestrator container:
#   0 9 * * 1-5 /app/scripts/run-inspector-loop.sh
# Or trigger manually: curl -X POST localhost:9800/api/inspect -d '{"persona":"new-user"}'
INSPECTOR_ENABLED=false
```

- [ ] **Step 4: Commit**

```bash
git add platform/scripts/run-inspector-loop.sh platform/.env.example
git commit -m "feat: add inspector loop trigger script

run-inspector-loop.sh checks today's schedule and submits review
personas to the orchestrator. Run via cron at 9am weekdays or
trigger manually via POST /api/inspect."
```
