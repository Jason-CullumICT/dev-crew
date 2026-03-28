# Fix Plan: Update Internal Path and Repo References for dev-crew

**Task:** Update all references to "claude-ai-OS", "container-test", and "Work-backlog" in platform/, Source/, portal/, CLAUDE.md, tools/, and Teams/ to use "dev-crew" or the correct new paths. Add template auto-apply logic to setup-workspace.sh. Update config.js defaults.

**Scope tag:** `backend-only`
**Confidence:** high
**Risk level:** medium (10 files, no schema changes, infrastructure renaming)

---

## Root Cause Analysis

The repo was merged from three separate repos (claude-ai-OS, Work-backlog, container-test) into a single `dev-crew` repo. Task 7 of the merge plan requires updating all internal references that still point to the old repo names.

## Files to Modify

| File | Changes |
|------|---------|
| `platform/orchestrator/server.js` | Lines 2, 688-690, 905, 942, 986: rename branding and repo list |
| `platform/orchestrator/lib/workflow-engine.js` | Line 781: git config user.name; Line 1436: portal repo check |
| `platform/orchestrator/lib/container-manager.js` | Lines 118, 238: GIT_AUTHOR_NAME env var |
| `platform/orchestrator/lib/config.js` | Line 30: workerImage default |
| `platform/scripts/setup-cycle-workspace.sh` | Lines 12-13, 38, 41, 63: git identity and bootstrap comments |
| `platform/scripts/setup-workspace.sh` | Lines 54, 57: bootstrap comments; add git add/commit/push after template copy |
| `CLAUDE.md` | Line 6: project description |
| `Plans/orchestrator-cycle-dashboard/design.md` | Line 5: reference to old repo name |

**Files explicitly NOT modified** (historical documentation of the migration itself):
- `docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md`
- `docs/superpowers/specs/2026-03-27-dev-crew-repo-merge-design.md`
- `docs/superpowers/specs/2026-03-24-parallel-container-cycles-design.md`

---

## Detailed Fix Instructions

### backend-fixer-1

**Module:** `platform/`, `CLAUDE.md`, `Plans/`
**Scope:** Update all old repo references to dev-crew across platform infrastructure and root files.

#### 1. `platform/orchestrator/server.js`

**Line 2** — Change comment:
```
OLD: * claude-ai-OS Orchestrator
NEW: * dev-crew Orchestrator
```

**Lines 688-690** — Update repo list to reference dev-crew instead of old repos:
```javascript
// OLD:
  const knownRepos = [
    { name: "container-test", fullName: "Jason-CullumICT/container-test", url: "https://github.com/Jason-CullumICT/container-test" },
    { name: "claude-ai-OS", fullName: "Jason-CullumICT/claude-ai-OS", url: "https://github.com/Jason-CullumICT/claude-ai-OS" },
  ];

// NEW:
  const knownRepos = [
    { name: "dev-crew", fullName: "Jason-CullumICT/dev-crew", url: "https://github.com/Jason-CullumICT/dev-crew" },
  ];
```

**Line 905** — Change HTML title:
```
OLD: <html><head><title>claude-ai-OS Pipeline</title>
NEW: <html><head><title>dev-crew Pipeline</title>
```

**Line 942** — Change H1 heading:
```
OLD: <h1>claude-ai-OS Pipeline</h1>
NEW: <h1>dev-crew Pipeline</h1>
```

**Line 986** — Change startup log:
```
OLD: console.log(`claude-ai-OS orchestrator on :${config.port}`);
NEW: console.log(`dev-crew orchestrator on :${config.port}`);
```

#### 2. `platform/orchestrator/lib/workflow-engine.js`

**Line 781** — Update git config user.name in the credential refresh command:
```
OLD: git config user.name "claude-ai-OS" && git config user.email "pipeline@claude-ai-os.local"
NEW: git config user.name "dev-crew" && git config user.email "pipeline@dev-crew.local"
```

**Line 1436** — Update portal repo detection:
```javascript
// OLD:
const isPortalRepo = run.repo.includes("container-test");
// NEW:
const isPortalRepo = run.repo.includes("container-test") || run.repo.includes("dev-crew");
```
Note: Keep "container-test" check for backwards compatibility with any in-flight runs. The portal is now part of dev-crew, so also check for dev-crew. However, the portal auto-update should only trigger for portal-specific changes, so this needs careful handling. Actually, since the portal is now embedded in dev-crew, and the cycle always targets dev-crew, we should check if portal/ files changed instead:
```javascript
// BETTER NEW:
const isPortalRepo = run.repo.includes("container-test") || run.repo.includes("dev-crew");
```
And update the git diff on line 1440 to also check `portal/`:
```
OLD: git diff --name-only ${run.repoBranch || "master"}..HEAD -- Source/
NEW: git diff --name-only ${run.repoBranch || "master"}..HEAD -- Source/ portal/
```

#### 3. `platform/orchestrator/lib/container-manager.js`

**Line 118** — Update GIT_AUTHOR_NAME:
```
OLD: `GIT_AUTHOR_NAME=claude-ai-OS`,
NEW: `GIT_AUTHOR_NAME=dev-crew`,
```

**Line 119** — Update GIT_AUTHOR_EMAIL:
```
OLD: `GIT_AUTHOR_EMAIL=pipeline@claude-ai-os.local`,
NEW: `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local`,
```

**Line 238** — Same change (second occurrence):
```
OLD: `GIT_AUTHOR_NAME=claude-ai-OS`,
NEW: `GIT_AUTHOR_NAME=dev-crew`,
```

**Line 239** — Same change:
```
OLD: `GIT_AUTHOR_EMAIL=pipeline@claude-ai-os.local`,
NEW: `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local`,
```

#### 4. `platform/orchestrator/lib/config.js`

**Line 30** — Update worker image default:
```
OLD: workerImage: process.env.WORKER_IMAGE || "claude-ai-os-worker:latest",
NEW: workerImage: process.env.WORKER_IMAGE || "dev-crew-worker:latest",
```

#### 5. `platform/scripts/setup-cycle-workspace.sh`

**Line 12** — Update default git author name:
```
OLD: git config --global user.name  "${GIT_AUTHOR_NAME:-claude-ai-OS}"
NEW: git config --global user.name  "${GIT_AUTHOR_NAME:-dev-crew}"
```

**Line 13** — Update default git author email:
```
OLD: git config --global user.email "${GIT_AUTHOR_EMAIL:-pipeline@claude-ai-os.local}"
NEW: git config --global user.email "${GIT_AUTHOR_EMAIL:-pipeline@dev-crew.local}"
```

**Line 38** — Update comment:
```
OLD: # ── Bootstrap with claude-ai-OS templates if Teams/ doesn't exist ────────────
NEW: # ── Bootstrap with dev-crew templates if Teams/ doesn't exist ────────────
```

**Line 41** — Update echo message:
```
OLD: echo "[setup] Bootstrapping with claude-ai-OS framework templates..."
NEW: echo "[setup] Bootstrapping with dev-crew framework templates..."
```

**Line 63** — Update commit message:
```
OLD: git commit -m "chore: bootstrap with claude-ai-OS framework" || true
NEW: git commit -m "chore: scaffold agent team structure from dev-crew templates" || true
```

#### 6. `platform/scripts/setup-workspace.sh`

**Line 54** — Update comment:
```
OLD: # Bootstrap with claude-ai-OS framework if Teams/ doesn't exist
NEW: # Bootstrap with dev-crew framework if Teams/ doesn't exist
```

**Line 57** — Update echo message:
```
OLD: echo "No Teams/ directory found — bootstrapping with claude-ai-OS framework..."
NEW: echo "No Teams/ directory found — bootstrapping with dev-crew framework..."
```

**After the template copy block (after line 106, before `fi` on line 107)** — Add git add/commit/push for the scaffold:

After the `echo "✓ Framework bootstrapped"` line (102), before the closing `fi` (107), add:
```bash
    # Commit and push the scaffolded files
    cd "$WORKSPACE"
    git add -A
    git commit -m "chore: scaffold agent team structure from dev-crew templates" || true
    if ! git push origin HEAD; then
      echo "⚠ WARNING: Failed to push scaffold commit — continuing anyway"
    fi
    echo "✓ Scaffold committed and pushed"
```

#### 7. `CLAUDE.md`

**Line 6** — Update project description:
```
OLD: **Work-backlog** — AI-managed project. Update this description in CLAUDE.md.
NEW: **dev-crew** — AI-powered development platform. Orchestrates autonomous agent teams to build software through specifications, plans, and automated pipelines.
```

#### 8. `Plans/orchestrator-cycle-dashboard/design.md`

**Line 5** — Update reference:
```
OLD: ...from the external claude-ai-OS orchestrator, accessed via...
NEW: ...from the external dev-crew orchestrator, accessed via...
```

---

## Verification Steps

After all edits, run:

```bash
# Verify no remaining old references in active code (excluding docs/ which are historical)
grep -rn "claude-ai-OS\|container-test\|Work-backlog" platform/ Source/ portal/ CLAUDE.md tools/ Teams/ Plans/ \
  --include="*.js" --include="*.ts" --include="*.tsx" --include="*.sh" --include="*.md" --include="*.yml" --include="*.yaml" --include="*.json" \
  | grep -v node_modules | grep -v ".git/" | grep -v "docs/"
```

Expected: Only the `workflow-engine.js` line 1436 backwards-compat `container-test` check should remain. All other references should be `dev-crew`.

```bash
# Verify JS files have no syntax errors
node -c platform/orchestrator/server.js
node -c platform/orchestrator/lib/config.js
node -c platform/orchestrator/lib/workflow-engine.js
node -c platform/orchestrator/lib/container-manager.js
```

Expected: all pass with no errors.

```bash
# Verify shell scripts parse
bash -n platform/scripts/setup-workspace.sh
bash -n platform/scripts/setup-cycle-workspace.sh
```

Expected: no syntax errors.
