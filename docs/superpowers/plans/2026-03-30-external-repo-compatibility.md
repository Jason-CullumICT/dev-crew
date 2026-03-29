# External Repo Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dev-crew work with any external GitHub repo regardless of language, framework, directory structure, or branch naming.

**Architecture:** Four phases of progressive decoupling — branch name parameterization, language/stack detection, configurable project structure, and configurable ports/smoketests. Each phase independently unblocks a class of external repos.

**Tech Stack:** Node.js (orchestrator), Bash (scripts), Docker, YAML config

---

### Task 1: Replace hardcoded `master` branch with configurable base branch

The orchestrator hardcodes the literal string `master` in 8 places within `workflow-engine.js`. The infrastructure already supports configurability — `config.js` exposes `githubBranch` (from `GITHUB_BRANCH` env var, defaulting to `"main"`) and the run object carries `repoBranch`. But workflow-engine.js ignores both and uses the literal `"master"` in git commands for PR creation, diffing, rebasing, and code-change detection.

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js` (lines 443, 451, 505, 646, 649, 871, 1112, 1176)

- [ ] **Step 1: Add a `_baseBranch(run)` helper method to WorkflowEngine**

Add this method to the `WorkflowEngine` class, near the other private helpers:

```javascript
  /**
   * Resolve the base branch for a run. Priority:
   *   1. run.repoBranch (per-task override from API)
   *   2. this.config.githubBranch (GITHUB_BRANCH env var)
   *   3. "master" (legacy fallback)
   */
  _baseBranch(run) {
    return run.repoBranch || this.config.githubBranch || "master";
  }
```

- [ ] **Step 2: Replace hardcoded `master` in PR creation (lines 443, 451)**

Line 443 — PR create with labels:

```javascript
// Before:
["-c", `cd /workspace && gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file /tmp/pr-body.txt --base master --head "cycle/${run.id}" --label "${labels}" 2>&1`],

// After:
["-c", `cd /workspace && gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file /tmp/pr-body.txt --base ${this._baseBranch(run)} --head "cycle/${run.id}" --label "${labels}" 2>&1`],
```

Line 451 — PR create without labels (fallback):

```javascript
// Before:
["-c", `cd /workspace && gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file /tmp/pr-body.txt --base master --head "cycle/${run.id}" 2>&1`],

// After:
["-c", `cd /workspace && gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body-file /tmp/pr-body.txt --base ${this._baseBranch(run)} --head "cycle/${run.id}" 2>&1`],
```

- [ ] **Step 3: Replace hardcoded `master` in diff for AI review (line 505)**

```javascript
// Before:
["-c", `cd /workspace && git diff master...cycle/${run.id} 2>/dev/null | head -c 50000`],

// After:
["-c", `cd /workspace && git diff ${this._baseBranch(run)}...cycle/${run.id} 2>/dev/null | head -c 50000`],
```

- [ ] **Step 4: Replace hardcoded `master` in merge-conflict rebase (lines 646, 649)**

```javascript
// Before:
console.warn(`[${run.id}] Merge failed, attempting rebase on master...`);
const rebaseResult = await this.containerManager.execInWorker(
  containerId, "bash",
  ["-c", `cd /workspace && git fetch origin master && git rebase origin/master 2>&1 && git push origin "cycle/${run.id}" --force 2>&1`],
  { label: "pr-rebase" }
);

// After:
const baseBranch = this._baseBranch(run);
console.warn(`[${run.id}] Merge failed, attempting rebase on ${baseBranch}...`);
const rebaseResult = await this.containerManager.execInWorker(
  containerId, "bash",
  ["-c", `cd /workspace && git fetch origin ${baseBranch} && git rebase origin/${baseBranch} 2>&1 && git push origin "cycle/${run.id}" --force 2>&1`],
  { label: "pr-rebase" }
);
```

- [ ] **Step 5: Replace hardcoded `master` in git repo repair (line 871)**

```javascript
// Before:
`cd /workspace && git init && git remote add origin "${repoUrl}" && git fetch origin ${run.repoBranch || "master"} --depth 1 && git reset --soft FETCH_HEAD 2>/dev/null || true`

// After:
`cd /workspace && git init && git remote add origin "${repoUrl}" && git fetch origin ${this._baseBranch(run)} --depth 1 && git reset --soft FETCH_HEAD 2>/dev/null || true`
```

- [ ] **Step 6: Replace hardcoded `master` in code-change detection (lines 1112, 1176)**

Line 1112 — initial implementation verification:

```javascript
// Before:
"  { git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; git diff --name-only $(git merge-base HEAD origin/master 2>/dev/null || echo HEAD~5) HEAD 2>/dev/null; } | sort -u | " +

// After:
`  { git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; git diff --name-only $(git merge-base HEAD origin/${this._baseBranch(run)} 2>/dev/null || echo HEAD~5) HEAD 2>/dev/null; } | sort -u | ` +
```

Line 1176 — retry implementation verification:

```javascript
// Before:
"{ git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; git diff --name-only $(git merge-base HEAD origin/master 2>/dev/null || echo HEAD~5) HEAD 2>/dev/null; } | sort -u | " +

// After:
`{ git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; git diff --name-only $(git merge-base HEAD origin/${this._baseBranch(run)} 2>/dev/null || echo HEAD~5) HEAD 2>/dev/null; } | sort -u | ` +
```

Note: Line 1593 (`const mainBranch = run.repoBranch || "master"`) and line 1628 (`run.repoBranch || "master"`) already use `run.repoBranch` with a fallback — update these to use `this._baseBranch(run)` for consistency.

- [ ] **Step 7: Verify no remaining hardcoded `master` references**

Run: `grep -n '"master"' platform/orchestrator/lib/workflow-engine.js`

Expected: Zero matches (all replaced with `_baseBranch(run)` calls).

Also run: `grep -n 'master' platform/orchestrator/lib/workflow-engine.js` — any remaining hits should be in comments or the string literal inside `_baseBranch()` itself.

- [ ] **Step 8: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js
git commit -m "fix: replace hardcoded 'master' branch with configurable base branch

workflow-engine.js hardcoded 'master' in 8 places for PR creation, diffing,
rebasing, and code-change detection. Added _baseBranch(run) helper that
resolves run.repoBranch -> config.githubBranch -> 'master' fallback.
This unblocks repos using 'main' or any other default branch name."
```

---

### Task 2: Add language detection and configurable app startup

Currently the entire pipeline assumes Node.js: `container-manager.js` checks for `package.json`, tries `ts-node`/`vite`/`npm start`, and hardcodes `Source/Backend` and `Source/Frontend`. The setup scripts only run `npm install`. The smoketest only tries Node.js startup patterns. Any non-Node repo (Python, Go, Rust, Java, etc.) will fail silently at every stage.

**Files:**
- Modify: `platform/orchestrator/lib/container-manager.js` (~lines 290-345, 370-384)
- Modify: `platform/scripts/setup-workspace.sh` (lines 40-52)
- Modify: `platform/scripts/setup-cycle-workspace.sh` (lines 85-97)
- Modify: `platform/scripts/run-smoketest.sh` (lines 75-130, 157-168, 181-186)

- [ ] **Step 1: Create a shared `detect-stack.sh` function library**

Create file `platform/scripts/lib/detect-stack.sh`:

```bash
#!/bin/bash
# Shared stack detection functions — sourced by setup and smoketest scripts

# Detect the primary language/framework of a project directory.
# Prints one of: node, python, go, rust, java, php, ruby, dotnet, unknown
detect_stack() {
  local dir="${1:-.}"

  # Check in priority order (most specific first)
  if [[ -f "$dir/package.json" ]]; then
    echo "node"
  elif [[ -f "$dir/pyproject.toml" ]] || [[ -f "$dir/requirements.txt" ]] || [[ -f "$dir/setup.py" ]]; then
    echo "python"
  elif [[ -f "$dir/go.mod" ]]; then
    echo "go"
  elif [[ -f "$dir/Cargo.toml" ]]; then
    echo "rust"
  elif [[ -f "$dir/pom.xml" ]] || [[ -f "$dir/build.gradle" ]] || [[ -f "$dir/build.gradle.kts" ]]; then
    echo "java"
  elif [[ -f "$dir/composer.json" ]]; then
    echo "php"
  elif [[ -f "$dir/Gemfile" ]]; then
    echo "ruby"
  elif [[ -f "$dir/.csproj" ]] || find "$dir" -maxdepth 2 -name "*.csproj" -print -quit 2>/dev/null | grep -q .; then
    echo "dotnet"
  else
    echo "unknown"
  fi
}

# Install dependencies for a detected stack.
# Usage: install_deps <stack> <dir>
install_deps() {
  local stack="$1"
  local dir="$2"

  case "$stack" in
    node)
      echo "[setup] Installing npm deps in $dir..."
      (cd "$dir" && npm install --production=false 2>/dev/null) || true
      ;;
    python)
      echo "[setup] Installing Python deps in $dir..."
      if [[ -f "$dir/pyproject.toml" ]]; then
        (cd "$dir" && pip install -e ".[dev]" 2>/dev/null || pip install -e . 2>/dev/null) || true
      elif [[ -f "$dir/requirements.txt" ]]; then
        (cd "$dir" && pip install -r requirements.txt 2>/dev/null) || true
      fi
      ;;
    go)
      echo "[setup] Downloading Go modules in $dir..."
      (cd "$dir" && go mod download 2>/dev/null) || true
      ;;
    rust)
      echo "[setup] Building Rust project in $dir..."
      (cd "$dir" && cargo build 2>/dev/null) || true
      ;;
    java)
      echo "[setup] Building Java project in $dir..."
      if [[ -f "$dir/pom.xml" ]]; then
        (cd "$dir" && mvn install -DskipTests 2>/dev/null) || true
      elif [[ -f "$dir/build.gradle" ]] || [[ -f "$dir/build.gradle.kts" ]]; then
        (cd "$dir" && ./gradlew build -x test 2>/dev/null) || true
      fi
      ;;
    php)
      echo "[setup] Installing Composer deps in $dir..."
      (cd "$dir" && composer install 2>/dev/null) || true
      ;;
    ruby)
      echo "[setup] Installing Ruby gems in $dir..."
      (cd "$dir" && bundle install 2>/dev/null) || true
      ;;
    dotnet)
      echo "[setup] Restoring .NET packages in $dir..."
      (cd "$dir" && dotnet restore 2>/dev/null) || true
      ;;
    *)
      echo "[setup] Unknown stack in $dir — skipping dependency install"
      ;;
  esac
}

# Parse a CLAUDE.md for explicit startup commands.
# Looks in the "Build & Test" or "Dev Environment" sections.
# Sets global vars: CLAUDE_MD_START_BACKEND, CLAUDE_MD_START_FRONTEND, CLAUDE_MD_MIGRATION_CMD
parse_claude_md_commands() {
  local claude_md="${1:-/workspace/CLAUDE.md}"
  CLAUDE_MD_START_BACKEND=""
  CLAUDE_MD_START_FRONTEND=""
  CLAUDE_MD_MIGRATION_CMD=""

  if [[ ! -f "$claude_md" ]]; then
    return
  fi

  # Look for start_backend / start_frontend in code blocks after "Build & Test" header
  local in_build_section=false
  local in_code_block=false
  while IFS= read -r line; do
    if [[ "$line" =~ ^##.*Build.*Test|^##.*Dev.*Environment|^##.*Quick.*Start ]]; then
      in_build_section=true
      continue
    fi
    if $in_build_section && [[ "$line" =~ ^## ]] && ! [[ "$line" =~ Build|Test|Dev|Quick ]]; then
      in_build_section=false
      continue
    fi
    if $in_build_section; then
      # Look for key=value patterns like: start_backend: npm start
      if [[ "$line" =~ start_backend[[:space:]]*[:=][[:space:]]*(.*) ]]; then
        CLAUDE_MD_START_BACKEND="${BASH_REMATCH[1]}"
      fi
      if [[ "$line" =~ start_frontend[[:space:]]*[:=][[:space:]]*(.*) ]]; then
        CLAUDE_MD_START_FRONTEND="${BASH_REMATCH[1]}"
      fi
      if [[ "$line" =~ migration[[:space:]]*[:=][[:space:]]*(.*) ]]; then
        CLAUDE_MD_MIGRATION_CMD="${BASH_REMATCH[1]}"
      fi
    fi
  done < "$claude_md"
}
```

- [ ] **Step 2: Update `setup-workspace.sh` to use stack detection (lines 40-52)**

Replace the hardcoded npm install loop and Prisma block:

```bash
# Before (lines 40-52):
# Install dependencies if package.json exists in common locations
for dir in "Source/Backend" "Source/Frontend" "Source/E2E" "."; do
  if [[ -f "$WORKSPACE/$dir/package.json" ]]; then
    echo "Installing npm deps in $dir..."
    (cd "$WORKSPACE/$dir" && npm install --production=false 2>/dev/null) || true
  fi
done

# Prisma generate if schema exists
if [[ -f "$WORKSPACE/Source/Backend/prisma/schema.prisma" ]]; then
  echo "Running prisma generate..."
  (cd "$WORKSPACE/Source/Backend" && npx prisma generate 2>/dev/null) || true
fi

# After:
# Source shared stack detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/detect-stack.sh" ]]; then
  source "$SCRIPT_DIR/lib/detect-stack.sh"
else
  # Fallback: inline minimal detection for backward compatibility
  detect_stack() { [[ -f "$1/package.json" ]] && echo "node" || echo "unknown"; }
  install_deps() { [[ "$1" == "node" ]] && (cd "$2" && npm install --production=false 2>/dev/null) || true; }
  parse_claude_md_commands() { true; }
fi

# Detect and install dependencies for backend, frontend, and root
for dir in "Source/Backend" "Source/Frontend" "Source/E2E" "."; do
  if [[ -d "$WORKSPACE/$dir" ]]; then
    STACK=$(detect_stack "$WORKSPACE/$dir")
    if [[ "$STACK" != "unknown" ]]; then
      install_deps "$STACK" "$WORKSPACE/$dir"
    fi
  fi
done

# Run migration command from CLAUDE.md if specified, otherwise try common patterns
parse_claude_md_commands "$WORKSPACE/CLAUDE.md"
if [[ -n "${CLAUDE_MD_MIGRATION_CMD:-}" ]]; then
  echo "Running migration: $CLAUDE_MD_MIGRATION_CMD"
  (cd "$WORKSPACE" && eval "$CLAUDE_MD_MIGRATION_CMD" 2>/dev/null) || true
elif [[ -f "$WORKSPACE/Source/Backend/prisma/schema.prisma" ]]; then
  echo "Running prisma generate..."
  (cd "$WORKSPACE/Source/Backend" && npx prisma generate 2>/dev/null) || true
fi
```

- [ ] **Step 3: Apply the same changes to `setup-cycle-workspace.sh` (lines 85-97)**

Replace the same hardcoded npm + Prisma block:

```bash
# Before (lines 85-97):
# ── Install npm dependencies ────────────────────────────────────────────────
for dir in Source/Backend Source/Frontend Source/E2E .; do
  if [ -f "$WORKSPACE/$dir/package.json" ]; then
    echo "[setup] npm install in $dir..."
    (cd "$WORKSPACE/$dir" && npm install)
  fi
done

# ── Prisma generate ─────────────────────────────────────────────────────────
if [ -f "$WORKSPACE/Source/Backend/prisma/schema.prisma" ]; then
  echo "[setup] Running prisma generate..."
  (cd "$WORKSPACE/Source/Backend" && npx prisma generate)
fi

# After:
# ── Install dependencies (language-aware) ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/detect-stack.sh" ]]; then
  source "$SCRIPT_DIR/lib/detect-stack.sh"
else
  detect_stack() { [[ -f "$1/package.json" ]] && echo "node" || echo "unknown"; }
  install_deps() { [[ "$1" == "node" ]] && (cd "$2" && npm install --production=false 2>/dev/null) || true; }
  parse_claude_md_commands() { true; }
fi

for dir in Source/Backend Source/Frontend Source/E2E .; do
  if [[ -d "$WORKSPACE/$dir" ]]; then
    STACK=$(detect_stack "$WORKSPACE/$dir")
    if [[ "$STACK" != "unknown" ]]; then
      install_deps "$STACK" "$WORKSPACE/$dir"
    fi
  fi
done

# ── Run migrations ─────────────────────────────────────────────────────────
parse_claude_md_commands "$WORKSPACE/CLAUDE.md"
if [[ -n "${CLAUDE_MD_MIGRATION_CMD:-}" ]]; then
  echo "[setup] Running migration: $CLAUDE_MD_MIGRATION_CMD"
  (cd "$WORKSPACE" && eval "$CLAUDE_MD_MIGRATION_CMD" 2>/dev/null) || true
elif [[ -f "$WORKSPACE/Source/Backend/prisma/schema.prisma" ]]; then
  echo "[setup] Running prisma generate..."
  (cd "$WORKSPACE/Source/Backend" && npx prisma generate)
fi
```

- [ ] **Step 4: Update `container-manager.js` supervisor script (~lines 305-341)**

Replace the Node.js-only supervisor with a multi-language version:

```javascript
// Before (lines 305-341):
const supervisorScript = `#!/bin/bash
# App supervisor — keeps backend and frontend alive
BACKEND_ENTRY=""
FRONTEND_ENTRY=""

if [ -f /workspace/Source/Backend/package.json ]; then
  cd /workspace/Source/Backend
  if [ -f src/index.ts ]; then BACKEND_ENTRY="npx ts-node src/index.ts"
  elif [ -f src/server.ts ]; then BACKEND_ENTRY="npx ts-node src/server.ts"
  elif [ -f src/app.ts ]; then BACKEND_ENTRY="npx ts-node src/app.ts"
  elif [ -f dist/index.js ]; then BACKEND_ENTRY="node dist/index.js"
  elif [ -f dist/server.js ]; then BACKEND_ENTRY="node dist/server.js"
  elif grep -q '"start"' package.json 2>/dev/null; then BACKEND_ENTRY="npm start"
  fi
fi

if [ -f /workspace/Source/Frontend/package.json ]; then
  FRONTEND_ENTRY="npx vite --host 0.0.0.0 --port 5173"
fi

// After:
const supervisorScript = `#!/bin/bash
# App supervisor — keeps backend and frontend alive (multi-language)
BACKEND_ENTRY=""
FRONTEND_ENTRY=""
BACKEND_DIR=""
FRONTEND_DIR=""

# Parse CLAUDE.md for explicit startup commands
parse_start_commands() {
  local claude_md="/workspace/CLAUDE.md"
  if [[ -f "$claude_md" ]]; then
    local be=$(grep -E 'start_backend\s*[:=]' "$claude_md" 2>/dev/null | head -1 | sed 's/.*start_backend\s*[:=]\s*//')
    local fe=$(grep -E 'start_frontend\s*[:=]' "$claude_md" 2>/dev/null | head -1 | sed 's/.*start_frontend\s*[:=]\s*//')
    [[ -n "$be" ]] && BACKEND_ENTRY="$be"
    [[ -n "$fe" ]] && FRONTEND_ENTRY="$fe"
  fi
}

# Detect backend entry point
detect_backend() {
  local dir="$1"
  if [[ -f "$dir/package.json" ]]; then
    cd "$dir"
    if [ -f src/index.ts ]; then BACKEND_ENTRY="npx ts-node src/index.ts"
    elif [ -f src/server.ts ]; then BACKEND_ENTRY="npx ts-node src/server.ts"
    elif [ -f src/app.ts ]; then BACKEND_ENTRY="npx ts-node src/app.ts"
    elif [ -f dist/index.js ]; then BACKEND_ENTRY="node dist/index.js"
    elif [ -f dist/server.js ]; then BACKEND_ENTRY="node dist/server.js"
    elif grep -q '"start"' package.json 2>/dev/null; then BACKEND_ENTRY="npm start"
    fi
  elif [[ -f "$dir/main.py" ]] || [[ -f "$dir/app.py" ]] || [[ -f "$dir/manage.py" ]]; then
    cd "$dir"
    if [ -f manage.py ]; then BACKEND_ENTRY="python manage.py runserver 0.0.0.0:3001"
    elif [ -f app.py ]; then BACKEND_ENTRY="python app.py"
    elif [ -f main.py ]; then BACKEND_ENTRY="python main.py"
    fi
  elif [[ -f "$dir/go.mod" ]]; then
    cd "$dir"
    BACKEND_ENTRY="go run ."
  elif [[ -f "$dir/Cargo.toml" ]]; then
    cd "$dir"
    BACKEND_ENTRY="cargo run"
  fi
  [[ -n "$BACKEND_ENTRY" ]] && BACKEND_DIR="$dir"
}

# Detect frontend entry point
detect_frontend() {
  local dir="$1"
  if [[ -f "$dir/package.json" ]]; then
    cd "$dir"
    if grep -q '"dev"' package.json 2>/dev/null; then
      FRONTEND_ENTRY="npx vite --host 0.0.0.0 --port 5173"
    elif grep -q '"start"' package.json 2>/dev/null; then
      FRONTEND_ENTRY="npm start"
    fi
    FRONTEND_DIR="$dir"
  fi
}

# Priority 1: explicit CLAUDE.md commands
parse_start_commands

# Priority 2: auto-detect from Source/ layout
if [[ -z "$BACKEND_ENTRY" ]]; then
  for dir in /workspace/Source/Backend /workspace/backend /workspace/server /workspace/api /workspace/src /workspace; do
    if [[ -d "$dir" ]]; then
      detect_backend "$dir"
      [[ -n "$BACKEND_ENTRY" ]] && break
    fi
  done
fi

if [[ -z "$FRONTEND_ENTRY" ]]; then
  for dir in /workspace/Source/Frontend /workspace/frontend /workspace/client /workspace/web /workspace/app; do
    if [[ -d "$dir" ]]; then
      detect_frontend "$dir"
      [[ -n "$FRONTEND_ENTRY" ]] && break
    fi
  done
fi
`;
```

The rest of the supervisor script (starting backend, starting frontend, wait loop) stays the same, but update the `cd` commands to use `BACKEND_DIR` and `FRONTEND_DIR`:

```javascript
// Before:
// # Start backend
// if [ -n "$BACKEND_ENTRY" ]; then
//   echo "[supervisor] Starting backend: $BACKEND_ENTRY"
//   cd /workspace/Source/Backend
//   $BACKEND_ENTRY > /tmp/backend.log 2>&1 &

// After:
// # Start backend
// if [ -n "$BACKEND_ENTRY" ]; then
//   echo "[supervisor] Starting backend: $BACKEND_ENTRY"
//   if [ -n "$BACKEND_DIR" ]; then cd "$BACKEND_DIR"; fi
//   $BACKEND_ENTRY > /tmp/backend.log 2>&1 &
```

Same pattern for frontend — replace `cd /workspace/Source/Frontend` with `if [ -n "$FRONTEND_DIR" ]; then cd "$FRONTEND_DIR"; fi`.

- [ ] **Step 5: Update `container-manager.js` backend/frontend detection checks (lines 291-298)**

The `startApp()` method begins by testing for `Source/Backend/package.json` and `Source/Frontend/package.json`. Replace with broader detection:

```javascript
// Before (lines 291-298):
const checkBackend = await this.docker.execInContainer(
  containerId, "test", ["-f", "/workspace/Source/Backend/package.json"],
  { quiet: true }
);
const checkFrontend = await this.docker.execInContainer(
  containerId, "test", ["-f", "/workspace/Source/Frontend/package.json"],
  { quiet: true }
);

// After:
// Check for backend in multiple possible locations
const checkBackend = await this.docker.execInContainer(
  containerId, "bash", ["-c",
    "test -f /workspace/Source/Backend/package.json || " +
    "test -f /workspace/backend/package.json || " +
    "test -f /workspace/server/package.json || " +
    "test -f /workspace/Source/Backend/main.py || " +
    "test -f /workspace/Source/Backend/go.mod || " +
    "test -f /workspace/Source/Backend/Cargo.toml || " +
    "test -f /workspace/manage.py || " +
    "test -f /workspace/app.py || " +
    "test -f /workspace/main.py || " +
    "test -f /workspace/go.mod || " +
    "test -f /workspace/Cargo.toml"
  ],
  { quiet: true }
);
const checkFrontend = await this.docker.execInContainer(
  containerId, "bash", ["-c",
    "test -f /workspace/Source/Frontend/package.json || " +
    "test -f /workspace/frontend/package.json || " +
    "test -f /workspace/client/package.json || " +
    "test -f /workspace/web/package.json"
  ],
  { quiet: true }
);
```

- [ ] **Step 6: Update `run-smoketest.sh` backend startup (lines 75-109) to be multi-language**

```bash
# Before (lines 75-109):
# ── Start backend ──
if [[ -f "$WORKSPACE/Source/Backend/package.json" ]]; then
  cd "$WORKSPACE/Source/Backend"
  # ... Node.js only startup ...

# After:
# Source shared detection if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SCRIPT_DIR/lib/detect-stack.sh" ]] && source "$SCRIPT_DIR/lib/detect-stack.sh"

# ── Parse CLAUDE.md for explicit commands ──
CLAUDE_MD_START_BACKEND=""
CLAUDE_MD_START_FRONTEND=""
if [[ -f "$WORKSPACE/CLAUDE.md" ]]; then
  CLAUDE_MD_START_BACKEND=$(grep -E 'start_backend\s*[:=]' "$WORKSPACE/CLAUDE.md" 2>/dev/null | head -1 | sed 's/.*start_backend\s*[:=]\s*//')
  CLAUDE_MD_START_FRONTEND=$(grep -E 'start_frontend\s*[:=]' "$WORKSPACE/CLAUDE.md" 2>/dev/null | head -1 | sed 's/.*start_frontend\s*[:=]\s*//')
fi

# ── Start backend ──
BACKEND_DIR=""
if [[ -n "$CLAUDE_MD_START_BACKEND" ]]; then
  echo "[smoketest] Starting backend via CLAUDE.md command: $CLAUDE_MD_START_BACKEND"
  cd "$WORKSPACE"
  eval "$CLAUDE_MD_START_BACKEND" > /tmp/backend.log 2>&1 &
  PIDS="$PIDS $!"
  BACKEND_DIR="$WORKSPACE"
else
  # Try common backend locations
  for dir in "$WORKSPACE/Source/Backend" "$WORKSPACE/backend" "$WORKSPACE/server" "$WORKSPACE/api" "$WORKSPACE"; do
    if [[ ! -d "$dir" ]]; then continue; fi
    cd "$dir"

    if [[ -f "package.json" ]]; then
      [[ -d "node_modules" ]] || npm install --production=false 2>/dev/null
      if grep -q '"start"' package.json 2>/dev/null; then
        echo "[smoketest] Starting backend via 'npm start' in $dir..."
        npm start > /tmp/backend.log 2>&1 &
        PIDS="$PIDS $!"
      elif [[ -f "src/index.ts" ]]; then
        echo "[smoketest] Starting backend via ts-node in $dir..."
        npx ts-node src/index.ts > /tmp/backend.log 2>&1 &
        PIDS="$PIDS $!"
      elif [[ -f "src/index.js" ]]; then
        node src/index.js > /tmp/backend.log 2>&1 &
        PIDS="$PIDS $!"
      elif [[ -f "dist/index.js" ]]; then
        node dist/index.js > /tmp/backend.log 2>&1 &
        PIDS="$PIDS $!"
      fi
      BACKEND_DIR="$dir"
      break
    elif [[ -f "manage.py" ]]; then
      echo "[smoketest] Starting Django backend in $dir..."
      python manage.py runserver "0.0.0.0:$BACKEND_PORT" > /tmp/backend.log 2>&1 &
      PIDS="$PIDS $!"
      BACKEND_DIR="$dir"
      break
    elif [[ -f "app.py" ]] || [[ -f "main.py" ]]; then
      local entry=$(ls app.py main.py 2>/dev/null | head -1)
      echo "[smoketest] Starting Python backend ($entry) in $dir..."
      python "$entry" > /tmp/backend.log 2>&1 &
      PIDS="$PIDS $!"
      BACKEND_DIR="$dir"
      break
    elif [[ -f "go.mod" ]]; then
      echo "[smoketest] Starting Go backend in $dir..."
      go run . > /tmp/backend.log 2>&1 &
      PIDS="$PIDS $!"
      BACKEND_DIR="$dir"
      break
    fi
  done
fi
```

- [ ] **Step 7: Update `run-smoketest.sh` frontend startup (lines 111-125) similarly**

```bash
# Before:
if [[ -f "$WORKSPACE/Source/Frontend/package.json" ]]; then
  cd "$WORKSPACE/Source/Frontend"
  ...

# After:
if [[ -n "$CLAUDE_MD_START_FRONTEND" ]]; then
  echo "[smoketest] Starting frontend via CLAUDE.md command: $CLAUDE_MD_START_FRONTEND"
  cd "$WORKSPACE"
  eval "$CLAUDE_MD_START_FRONTEND" > /tmp/frontend.log 2>&1 &
  PIDS="$PIDS $!"
else
  for dir in "$WORKSPACE/Source/Frontend" "$WORKSPACE/frontend" "$WORKSPACE/client" "$WORKSPACE/web"; do
    if [[ -f "$dir/package.json" ]]; then
      cd "$dir"
      [[ -d "node_modules" ]] || npm install --production=false 2>/dev/null
      if grep -q '"dev"' package.json 2>/dev/null; then
        echo "[smoketest] Starting frontend via vite in $dir..."
        npx vite --host 0.0.0.0 --port "$FRONTEND_PORT" > /tmp/frontend.log 2>&1 &
        PIDS="$PIDS $!"
      elif grep -q '"start"' package.json 2>/dev/null; then
        echo "[smoketest] Starting frontend via 'npm start' in $dir..."
        npm start > /tmp/frontend.log 2>&1 &
        PIDS="$PIDS $!"
      fi
      break
    fi
  done
fi
```

- [ ] **Step 8: Copy `detect-stack.sh` into the Docker image**

Verify the Dockerfile for the worker image copies `platform/scripts/` into the container. If scripts are mounted at `/app/scripts/`, the `lib/` subdirectory will be included automatically. If not, add the COPY directive.

- [ ] **Step 9: Test with a Python project**

Create a minimal test: a repo with `requirements.txt` and `app.py` (Flask hello-world on port 3001). Run a dev-crew cycle against it and verify:
1. `setup-workspace.sh` runs `pip install` instead of `npm install`
2. The supervisor starts `python app.py` instead of `npx ts-node`
3. Smoketest hits the backend health endpoint

- [ ] **Step 10: Commit**

```bash
git add platform/scripts/lib/detect-stack.sh
git add platform/scripts/setup-workspace.sh
git add platform/scripts/setup-cycle-workspace.sh
git add platform/scripts/run-smoketest.sh
git add platform/orchestrator/lib/container-manager.js
git commit -m "feat: add multi-language detection and configurable app startup

Added detect-stack.sh library that identifies Node, Python, Go, Rust,
Java, PHP, Ruby, and .NET projects from manifest files. Updated setup
scripts to install deps based on detected stack. Updated supervisor and
smoketest to try multiple startup patterns and read explicit commands
from CLAUDE.md (start_backend/start_frontend keys). Preserves full
backward compatibility for existing Node.js repos."
```

---

### Task 3: Make project structure configurable

The pipeline hardcodes `Source/Backend`, `Source/Frontend`, and `Source/E2E` in 20+ places across four files. Any repo that uses `src/`, `backend/`, `server/`, `client/`, or any other layout will fail code-change detection, dependency installs, app startup, and E2E tests. The fix is to read paths from environment variables (with CLAUDE.md auto-detection as a bonus) and propagate them everywhere.

**Files:**
- Modify: `platform/orchestrator/lib/config.js` (add path config)
- Modify: `platform/orchestrator/lib/container-manager.js` (all Source/ references)
- Modify: `platform/orchestrator/lib/workflow-engine.js` (code change detection, E2E paths, portal check)
- Modify: `platform/orchestrator/lib/dispatch.js` (agent prompts)
- Modify: `platform/scripts/setup-workspace.sh` (npm install paths)
- Modify: `platform/scripts/setup-cycle-workspace.sh` (npm install paths)
- Modify: `platform/scripts/run-smoketest.sh` (all Source/ references)

- [ ] **Step 1: Add project structure config to `config.js`**

Add after the existing config entries (before the closing `};`):

```javascript
// Before (end of config object):
  autoMergeMedium: process.env.AUTO_MERGE_MEDIUM !== "false",
};

// After:
  autoMergeMedium: process.env.AUTO_MERGE_MEDIUM !== "false",

  // Project structure — configurable paths (relative to workspace root)
  backendPath: process.env.BACKEND_PATH || "Source/Backend",
  frontendPath: process.env.FRONTEND_PATH || "Source/Frontend",
  e2ePath: process.env.E2E_PATH || "Source/E2E",

  // Internal container ports (what the app listens on inside the container)
  appBackendPort: Number(process.env.APP_BACKEND_PORT) || 3001,
  appFrontendPort: Number(process.env.APP_FRONTEND_PORT) || 5173,
};
```

- [ ] **Step 2: Pass structure config as env vars to worker containers**

In `container-manager.js`, add these to the `Env` array in both `spawnWorker()` (line ~111) and `spawnWorkerFromVolume()` (line ~231):

```javascript
// Add to Env array after the existing entries:
`BACKEND_PATH=${config.backendPath}`,
`FRONTEND_PATH=${config.frontendPath}`,
`E2E_PATH=${config.e2ePath}`,
`APP_BACKEND_PORT=${config.appBackendPort}`,
`APP_FRONTEND_PORT=${config.appFrontendPort}`,
```

- [ ] **Step 3: Update `container-manager.js` `startApp()` supervisor script**

Replace all hardcoded `/workspace/Source/Backend` and `/workspace/Source/Frontend` with environment variables. The supervisor runs inside the container, so it should read from env:

```bash
# At the top of the supervisor script, add:
BACKEND_PATH="${BACKEND_PATH:-Source/Backend}"
FRONTEND_PATH="${FRONTEND_PATH:-Source/Frontend}"

# Then replace all /workspace/Source/Backend with /workspace/$BACKEND_PATH
# And all /workspace/Source/Frontend with /workspace/$FRONTEND_PATH
```

In the broader detection loop from Task 2, update the search order:

```bash
# Before:
for dir in /workspace/Source/Backend /workspace/backend /workspace/server ...

# After:
for dir in "/workspace/$BACKEND_PATH" /workspace/backend /workspace/server ...
```

- [ ] **Step 4: Update `container-manager.js` port bindings (lines 125-133, 244-248)**

Replace hardcoded 3001/5173 with config values. In `spawnWorker()`:

```javascript
// Before (lines 125-133):
PortBindings: {
  "3001/tcp": [{ HostPort: String(ports.backend) }],
  "5173/tcp": [{ HostPort: String(ports.frontend) }],
},
ExposedPorts: {
  "3001/tcp": {},
  "5173/tcp": {},
},

// After:
PortBindings: {
  [`${config.appBackendPort}/tcp`]: [{ HostPort: String(ports.backend) }],
  [`${config.appFrontendPort}/tcp`]: [{ HostPort: String(ports.frontend) }],
},
ExposedPorts: {
  [`${config.appBackendPort}/tcp`]: {},
  [`${config.appFrontendPort}/tcp`]: {},
},
```

Apply the same change to `spawnWorkerFromVolume()` (lines 244-248).

- [ ] **Step 5: Update `container-manager.js` health checks (lines 372, 380)**

```javascript
// Before:
"curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:3001/ || echo 000"
"curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:5173/ || echo 000"

// After:
`curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:${config.appBackendPort}/ || echo 000`
`curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:${config.appFrontendPort}/ || echo 000`
```

- [ ] **Step 6: Update `workflow-engine.js` code change detection regex (lines 1112-1117, 1176-1177)**

The code change detection uses a hardcoded regex that lists `Source/` along with other paths. Make it dynamic based on config:

```javascript
// Add a helper method to WorkflowEngine:
_codeChangePattern() {
  const paths = [
    this.config.backendPath,
    this.config.frontendPath,
    this.config.e2ePath,
    "src/", "backend/", "frontend/", "lib/", "app/",
    "services/", "routes/", "components/", "pages/",
    "docker/orchestrator/", "platform/", "portal/",
    "Teams/", "Specifications/", "templates/", "tools/",
    "CLAUDE\\\\.md", "docs/"
  ].map(p => p.replace(/\//g, "/")).join("|");
  return `'^(${paths})'`;
}
```

Then at lines 1112-1113, replace the hardcoded grep pattern:

```javascript
// Before:
"  grep -iE '^(Source/|src/|backend/|frontend/|lib/|app/|services/|routes/|components/|pages/|docker/orchestrator/|platform/|portal/|Teams/|Specifications/|templates/|tools/|CLAUDE\\.md|docs/)' | head -50; " +

// After:
`  grep -iE ${this._codeChangePattern()} | head -50; ` +
```

Apply the same replacement at line 1177.

- [ ] **Step 7: Update `workflow-engine.js` E2E test path (line 258)**

```javascript
// Before (line 258):
const testDir = `Source/E2E/tests/cycle-${run.id}`;

// After:
const testDir = `${this.config.e2ePath}/tests/cycle-${run.id}`;
```

- [ ] **Step 8: Update `workflow-engine.js` portal source check (line 1628)**

```javascript
// Before:
["-c", `cd /workspace && git diff --name-only ${run.repoBranch || "master"}..HEAD -- Source/`],

// After:
["-c", `cd /workspace && git diff --name-only ${this._baseBranch(run)}..HEAD -- ${this.config.backendPath}/ ${this.config.frontendPath}/`],
```

- [ ] **Step 9: Update `workflow-engine.js` E2E base URL (line 300)**

```javascript
// Before (line 300):
const frontendUrl = run.app?.frontend || "http://localhost:5173";

// After:
const frontendUrl = run.app?.frontend || `http://localhost:${this.config.appFrontendPort}`;
```

- [ ] **Step 10: Update `dispatch.js` agent prompt (line 184)**

```javascript
// Before (line 184):
Write Playwright E2E test files at Source/E2E/tests/cycle-${runId}/ that verify

// After:
Write Playwright E2E test files at ${e2ePath}/tests/cycle-${runId}/ that verify
```

This requires passing the config into the dispatcher. Update `createDispatcher` to accept config:

```javascript
// Before:
function createDispatcher(runClaudeFn, workspace) {

// After:
function createDispatcher(runClaudeFn, workspace, config = {}) {
  const e2ePath = config.e2ePath || "Source/E2E";
```

And update the callsite in `server.js` or wherever `createDispatcher` is invoked to pass `config`.

- [ ] **Step 11: Update setup scripts to use `BACKEND_PATH` / `FRONTEND_PATH` / `E2E_PATH` env vars**

In both `setup-workspace.sh` and `setup-cycle-workspace.sh`, replace the hardcoded directory list:

```bash
# Before:
for dir in "Source/Backend" "Source/Frontend" "Source/E2E" "."; do

# After:
BACKEND_PATH="${BACKEND_PATH:-Source/Backend}"
FRONTEND_PATH="${FRONTEND_PATH:-Source/Frontend}"
E2E_PATH="${E2E_PATH:-Source/E2E}"
for dir in "$BACKEND_PATH" "$FRONTEND_PATH" "$E2E_PATH" "."; do
```

- [ ] **Step 12: Update `run-smoketest.sh` to use path env vars**

Replace all `Source/Backend`, `Source/Frontend` references:

```bash
# At the top of the script (after WORKSPACE line):
BACKEND_PATH="${BACKEND_PATH:-Source/Backend}"
FRONTEND_PATH="${FRONTEND_PATH:-Source/Frontend}"
E2E_PATH="${E2E_PATH:-Source/E2E}"

# Then replace:
#   $WORKSPACE/Source/Backend  ->  $WORKSPACE/$BACKEND_PATH
#   $WORKSPACE/Source/Frontend ->  $WORKSPACE/$FRONTEND_PATH
#   $WORKSPACE/Source/Backend/src/routes -> $WORKSPACE/$BACKEND_PATH/src/routes
```

- [ ] **Step 13: Verify no remaining hardcoded Source/Backend or Source/Frontend**

Run:
```bash
grep -rn "Source/Backend" platform/orchestrator/lib/ platform/scripts/
grep -rn "Source/Frontend" platform/orchestrator/lib/ platform/scripts/
```

Expected: Only references should be in comments, fallback defaults, or the config.js default values.

- [ ] **Step 14: Commit**

```bash
git add platform/orchestrator/lib/config.js
git add platform/orchestrator/lib/container-manager.js
git add platform/orchestrator/lib/workflow-engine.js
git add platform/orchestrator/lib/dispatch.js
git add platform/scripts/setup-workspace.sh
git add platform/scripts/setup-cycle-workspace.sh
git add platform/scripts/run-smoketest.sh
git commit -m "feat: make project structure configurable via BACKEND_PATH/FRONTEND_PATH/E2E_PATH

Replaced 20+ hardcoded Source/Backend, Source/Frontend, Source/E2E
references with configurable paths from env vars. Added BACKEND_PATH,
FRONTEND_PATH, E2E_PATH, APP_BACKEND_PORT, APP_FRONTEND_PORT to
config.js. Propagated to container env, setup scripts, supervisor,
smoketest, code-change detection, E2E paths, and dispatch prompts.
Defaults preserve backward compatibility with existing Source/ layout."
```

---

### Task 4: Configurable ports and generic smoketests

The pipeline hardcodes ports 3001 (backend) and 5173 (frontend) in container port bindings, health checks, and the supervisor script. The smoketest has dev-crew-specific fallback endpoints (`/api/feature-requests`, `/api/bugs`, etc.) and Express-specific route discovery (`router.get/post/...`). Any repo with different ports or a non-Express backend will get misleading smoketest results.

**Files:**
- Modify: `platform/orchestrator/lib/container-manager.js` (supervisor script port refs, health checks)
- Modify: `platform/orchestrator/lib/workflow-engine.js` (E2E base URL)
- Modify: `platform/scripts/run-smoketest.sh` (fallback endpoints, route detection)

Note: Port bindings and health check port changes are covered in Task 3 Steps 4-5. This task focuses on the remaining port references and the smoketest endpoint logic.

- [ ] **Step 1: Update supervisor script port references in `container-manager.js`**

The supervisor script hardcodes `--port 5173` for vite:

```bash
# Before (in supervisor script):
FRONTEND_ENTRY="npx vite --host 0.0.0.0 --port 5173"

# After:
FRONTEND_ENTRY="npx vite --host 0.0.0.0 --port \${APP_FRONTEND_PORT:-5173}"
```

Note the escaped `\$` because this string is embedded in a JavaScript template literal that becomes a bash script inside the container.

- [ ] **Step 2: Update supervisor script backend port references**

For Python/Django backends in the supervisor (from Task 2):

```bash
# Before:
BACKEND_ENTRY="python manage.py runserver 0.0.0.0:3001"

# After:
BACKEND_ENTRY="python manage.py runserver 0.0.0.0:\${APP_BACKEND_PORT:-3001}"
```

- [ ] **Step 3: Replace dev-crew-specific fallback endpoints in `run-smoketest.sh` (lines 167, 183)**

```bash
# Before (line 167):
DISCOVERED="/api/feature-requests /api/bugs /api/cycles /api/learnings /api/features"

# After — use generic API patterns that work for any project:
DISCOVERED=""
# Try common health/API patterns
for probe_path in "/api/health" "/health" "/healthz" "/api" "/api/v1" "/"; do
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${BACKEND_URL}${probe_path}" 2>/dev/null || echo "000")
  if [[ "$status" =~ ^[23] ]]; then
    DISCOVERED="$DISCOVERED $probe_path"
  fi
done
```

```bash
# Before (lines 182-186):
if ! $FOUND_ANY; then
  for endpoint in "/api/feature-requests" "/api/bugs" "/api/cycles" "/api/learnings" "/api/features"; do
    check "API ${endpoint}" "${BACKEND_URL}${endpoint}" || true
  done
fi

# After — remove entirely. The generic probe above replaces this.
# If no endpoints responded, report that rather than testing nonexistent dev-crew routes:
if ! $FOUND_ANY && [[ -z "$DISCOVERED" ]]; then
  echo "  — No API endpoints responded. Backend may not expose REST routes."
fi
```

- [ ] **Step 4: Replace Express-specific route discovery in `run-smoketest.sh` (lines 159-163)**

```bash
# Before (lines 159-163):
if [[ -d "$WORKSPACE/Source/Backend/src/routes" ]]; then
  # Extract route paths from Express router files
  DISCOVERED=$(grep -rh "router\.\(get\|post\|patch\|put\|delete\)\s*(" "$WORKSPACE/Source/Backend/src/routes/" 2>/dev/null \
    | grep -oP "'(/[^']+)'" | tr -d "'" | grep -v ':' | sort -u | head -20)
fi

# After — framework-agnostic route discovery:
ROUTE_DIR="$WORKSPACE/${BACKEND_PATH:-Source/Backend}"
DISCOVERED=""

# Try Express-style route files
if [[ -d "$ROUTE_DIR/src/routes" ]]; then
  DISCOVERED=$(grep -rh "router\.\(get\|post\|patch\|put\|delete\)\s*(" "$ROUTE_DIR/src/routes/" 2>/dev/null \
    | grep -oP "'(/[^']+)'" | tr -d "'" | grep -v ':' | sort -u | head -20)
fi

# Try FastAPI/Flask decorators (Python)
if [[ -z "$DISCOVERED" ]]; then
  DISCOVERED=$(grep -rh '@app\.\(get\|post\|put\|delete\|route\)\s*(' "$ROUTE_DIR" 2>/dev/null \
    | grep -oP '"(/[^"]+)"' | tr -d '"' | grep -v '{' | sort -u | head -20)
fi

# Try Go chi/gin/mux patterns
if [[ -z "$DISCOVERED" ]]; then
  DISCOVERED=$(grep -rh '\.\(Get\|Post\|Put\|Delete\|Handle\|HandleFunc\)\s*(' "$ROUTE_DIR" 2>/dev/null \
    | grep -oP '"(/[^"]+)"' | tr -d '"' | grep -v '{' | sort -u | head -20)
fi

# If no routes discovered via code, try generic endpoint probing
if [[ -z "$DISCOVERED" ]]; then
  for probe_path in "/api/health" "/health" "/healthz" "/api" "/api/v1" "/"; do
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${BACKEND_URL}${probe_path}" 2>/dev/null || echo "000")
    if [[ "$status" =~ ^[23] ]]; then
      DISCOVERED="$DISCOVERED $probe_path"
    fi
  done
fi
```

- [ ] **Step 5: Read port config from CLAUDE.md "Dev Environment Quick Reference" table**

Add to `run-smoketest.sh` near the top (after WORKSPACE line), as a fallback if env vars are not set:

```bash
# Read ports from CLAUDE.md if env vars not explicitly set
if [[ -z "${BACKEND_PORT_SET:-}" ]] && [[ -f "$WORKSPACE/CLAUDE.md" ]]; then
  # Look for "Backend URL" line with port number
  BE_PORT_FROM_MD=$(grep -iE 'Backend.*URL.*localhost:([0-9]+)' "$WORKSPACE/CLAUDE.md" 2>/dev/null \
    | grep -oP ':(\d+)' | head -1 | tr -d ':')
  FE_PORT_FROM_MD=$(grep -iE 'Frontend.*URL.*localhost:([0-9]+)' "$WORKSPACE/CLAUDE.md" 2>/dev/null \
    | grep -oP ':(\d+)' | head -1 | tr -d ':')

  [[ -n "$BE_PORT_FROM_MD" ]] && BACKEND_PORT="$BE_PORT_FROM_MD"
  [[ -n "$FE_PORT_FROM_MD" ]] && FRONTEND_PORT="$FE_PORT_FROM_MD"

  # Re-derive URLs if ports changed
  BACKEND_URL="http://localhost:${BACKEND_PORT}"
  FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
fi
```

- [ ] **Step 6: Update `workflow-engine.js` E2E frontendUrl fallback**

This was partially covered in Task 3 Step 9, but verify the final state:

```javascript
// Final version (line 300):
const frontendUrl = run.app?.frontend || `http://localhost:${this.config.appFrontendPort}`;
```

- [ ] **Step 7: Verify no remaining hardcoded 3001/5173 port references**

Run:
```bash
grep -rn '3001' platform/orchestrator/lib/container-manager.js
grep -rn '5173' platform/orchestrator/lib/container-manager.js
grep -rn '5173' platform/orchestrator/lib/workflow-engine.js
```

Expected: Only references should be in config defaults or comments.

Also verify the smoketest:
```bash
grep -n 'feature-requests\|/api/bugs\|/api/cycles\|/api/learnings\|/api/features' platform/scripts/run-smoketest.sh
```

Expected: Zero matches (all dev-crew-specific endpoints removed).

- [ ] **Step 8: Test with a non-standard port configuration**

Set `APP_BACKEND_PORT=8000` and `APP_FRONTEND_PORT=3000` in `.env`, run a cycle, and verify:
1. Container port bindings use 8000/3000 instead of 3001/5173
2. Health checks probe the correct ports
3. Smoketest discovers endpoints without relying on dev-crew-specific routes
4. E2E tests use the correct frontend URL

- [ ] **Step 9: Commit**

```bash
git add platform/orchestrator/lib/container-manager.js
git add platform/orchestrator/lib/workflow-engine.js
git add platform/scripts/run-smoketest.sh
git commit -m "feat: configurable ports and generic smoketests

Replaced hardcoded 3001/5173 ports with APP_BACKEND_PORT/APP_FRONTEND_PORT
config. Removed dev-crew-specific fallback endpoints (/api/feature-requests,
/api/bugs, etc.) from smoketest. Added framework-agnostic route discovery
that tries Express, FastAPI/Flask, and Go patterns before falling back to
generic endpoint probing (/health, /healthz, /api). Added CLAUDE.md port
parsing as secondary fallback. Any repo with any port config now works."
```
