# Any-Repo Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable dev-crew's GitHub Actions pipeline to build code in any target GitHub repository, not just the dev-crew repo itself.

**Architecture:** Workflows always live in and dispatch FROM the dev-crew repo (centralized). Each workflow job performs two checkouts — dev-crew (for team role files and tools) and the target repo (for actual code work). A cross-repo PAT replaces `GITHUB_TOKEN` for push and PR creation, scoped to whatever repos dev-crew needs to work on. The orchestrator's `dispatchToGitHubActions` function is corrected to always dispatch against dev-crew, passing `target_repo` as a workflow input instead of using it as the dispatch host.

**Tech Stack:** GitHub Actions, GitHub REST API, Node.js (orchestrator), React/TypeScript (portal), actions/checkout@v4

---

## Context

### The problem

`dispatchToGitHubActions` in `server.js` currently does:
```js
const repoFull = (run.repo || config.githubRepo || "").replace("https://github.com/", "");
// → dispatches to: api.github.com/repos/{repoFull}/actions/workflows/run-ateam.yml/dispatches
```

If `run.repo` is anything other than `dev-crew`, that 404s — the workflows don't exist there.

### The fix

Dispatch always from dev-crew. Pass `target_repo` as a workflow input:
```
POST api.github.com/repos/Jason-CullumICT/dev-crew/actions/workflows/run-ateam.yml/dispatches
body: { ref: "master", inputs: { task_description: "...", target_repo: "owner/other-repo" } }
```

### Two-checkout pattern

Each workflow job checks out two repos into separate directories:

```
runner workspace/
├── _dev-crew/          ← team role files, tools, scripts (always dev-crew)
└── workspace/          ← target repo (the codebase being worked on)
```

Agents `cd workspace/` to do code work but reference role files from `../_dev-crew/Teams/`.

---

## File Map

| File | Change |
|---|---|
| `platform/orchestrator/lib/config.js` | Add `devCrewRepo` config key |
| `platform/orchestrator/server.js` | Fix `dispatchToGitHubActions` — always dispatch from `devCrewRepo`, pass `target_repo` as input |
| `.github/workflows/dispatch.yml` | Add `target_repo` input; pass through to all downstream dispatches |
| `.github/workflows/run-ateam.yml` | Add `target_repo` input; two-checkout; update all steps to work from `workspace/` |
| `.github/workflows/run-fixer.yml` | Same pattern as run-ateam |
| `.github/workflows/run-designers.yml` | Same pattern |
| `.github/workflows/run-inspector.yml` | Same pattern |
| `.github/workflows/run-guardians.yml` | Same pattern |

---

## Prerequisites

### Task 0: GitHub secret setup (manual — done once)

- [ ] **Step 1: Create a PAT**

  Go to github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.

  Set:
  - **Resource owner:** Jason-CullumICT (or org)
  - **Repository access:** All repositories (or select specific ones)
  - **Permissions:** `Contents: Read and write`, `Pull requests: Read and write`, `Actions: Read and write`, `Metadata: Read`

  Copy the token.

- [ ] **Step 2: Add PAT as GitHub secret**

  Go to `Jason-CullumICT/dev-crew` → Settings → Secrets and variables → Actions → New repository secret.

  ```
  Name:  REPO_PAT
  Value: github_pat_... (the token you just created)
  ```

- [ ] **Step 3: Verify the existing ANTHROPIC_API_KEY secret is set**

  Same location. If missing, add it now (the OAuth `sk-ant-oat01-...` token from `~/.claude/.credentials.json`).

---

## Task 1: Orchestrator — config and dispatch fix

**Files:**
- Modify: `platform/orchestrator/lib/config.js`
- Modify: `platform/orchestrator/server.js`

- [ ] **Step 1: Add `devCrewRepo` to config**

  Open `platform/orchestrator/lib/config.js`. Add after `githubToken`:

  ```js
  // The repo that hosts the pipeline workflows — always dev-crew itself.
  // Workflows dispatch FROM here regardless of which repo they're building.
  devCrewRepo: process.env.DEV_CREW_REPO || "Jason-CullumICT/dev-crew",
  ```

- [ ] **Step 2: Fix `dispatchToGitHubActions` in server.js**

  Find the `dispatchToGitHubActions` function (search for `async function dispatchToGitHubActions`).

  Replace the line that builds `repoFull` for dispatch and the inputs block:

  ```js
  // BEFORE (wrong — uses target repo as dispatch host):
  const repoFull = (run.repo || config.githubRepo || "").replace("https://github.com/", "");

  // AFTER (correct — always dispatch from dev-crew):
  const devCrewRepo = config.devCrewRepo;
  const targetRepo = (run.repo || config.githubRepo || "").replace("https://github.com/", "");
  ```

  Then update the inputs block (find the `const inputs = ...` line):

  ```js
  // BEFORE:
  const inputs = run.team === "TheFixer"
    ? { fix_description: run.task.slice(0, 500) }
    : { task_description: run.task.slice(0, 500) };

  // AFTER:
  const baseInputs = run.team === "TheFixer"
    ? { fix_description: run.task.slice(0, 500) }
    : { task_description: run.task.slice(0, 500) };
  const inputs = { ...baseInputs, target_repo: targetRepo };
  ```

  Then update the dispatch URL (find the `fetch(` call with `/dispatches`):

  ```js
  // BEFORE:
  const dispatchRes = await fetch(
    `https://api.github.com/repos/${repoFull}/actions/workflows/${workflowId}/dispatches`,

  // AFTER:
  const dispatchRes = await fetch(
    `https://api.github.com/repos/${devCrewRepo}/actions/workflows/${workflowId}/dispatches`,
  ```

  And update the polling URL (find the `fetch(` call with `/workflow_runs`):

  ```js
  // BEFORE:
  const listRes = await fetch(
    `https://api.github.com/repos/${repoFull}/actions/workflows/${workflowId}/runs?per_page=5`,

  // AFTER:
  const listRes = await fetch(
    `https://api.github.com/repos/${devCrewRepo}/actions/workflows/${workflowId}/runs?per_page=5`,
  ```

  Also update the run status URL:

  ```js
  // BEFORE:
  const statusRes = await fetch(
    `https://api.github.com/repos/${repoFull}/actions/runs/${ghRunId}`,

  // AFTER:
  const statusRes = await fetch(
    `https://api.github.com/repos/${devCrewRepo}/actions/runs/${ghRunId}`,
  ```

  And update the stored values on `run`:

  ```js
  // BEFORE:
  run.githubRepo = repoFull;
  run.githubRunUrl = `https://github.com/${repoFull}/actions/runs/${ghRunId}`;

  // AFTER:
  run.githubRepo = devCrewRepo;
  run.githubTargetRepo = targetRepo;
  run.githubRunUrl = `https://github.com/${devCrewRepo}/actions/runs/${ghRunId}`;
  ```

- [ ] **Step 3: Verify the function looks correct end-to-end**

  Read through `dispatchToGitHubActions` once. It should:
  1. Dispatch to `devCrewRepo` (never `targetRepo`)
  2. Pass `target_repo` as a workflow input
  3. Poll `devCrewRepo` for run status
  4. Store `githubTargetRepo` separately for reference

- [ ] **Step 4: Commit**

  ```bash
  cd /c/Users/JCullum/repos/dev-crew
  git add platform/orchestrator/lib/config.js platform/orchestrator/server.js
  git commit -m "fix(orchestrator): dispatch always from dev-crew, pass target_repo as workflow input"
  ```

---

## Task 2: dispatch.yml — add target_repo input and propagate

**Files:**
- Modify: `.github/workflows/dispatch.yml`

- [ ] **Step 1: Add `target_repo` to workflow_dispatch inputs**

  Open `.github/workflows/dispatch.yml`. In the `workflow_dispatch.inputs` block, add after `team_override`:

  ```yaml
  target_repo:
    description: "Target repo to build in (owner/repo). Defaults to dev-crew."
    required: false
    type: string
    default: "Jason-CullumICT/dev-crew"
  ```

- [ ] **Step 2: Propagate target_repo to each team dispatch step**

  Find each `Dispatch TheATeam`, `Dispatch TheFixer`, etc. step. In each one's `inputs:` object, add:

  ```js
  target_repo: '${{ github.event.inputs.target_repo || 'Jason-CullumICT/dev-crew' }}'
  ```

  Full example for TheATeam dispatch step after the change:

  ```js
  await github.rest.actions.createWorkflowDispatch({
    owner: context.repo.owner,
    repo: context.repo.repo,
    workflow_id: 'run-ateam.yml',
    ref: 'master',
    inputs: {
      issue_number: String(${{ steps.route.outputs.issue_number }}),
      task_description: context.payload.issue?.title || 'Feature implementation',
      target_repo: '${{ github.event.inputs.target_repo || 'Jason-CullumICT/dev-crew' }}'
    }
  });
  ```

  Apply the same `target_repo` addition to TheFixer, TheDesigners, TheInspector, TheGuardians dispatch steps.

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/dispatch.yml
  git commit -m "feat(dispatch): add target_repo input and propagate to team workflows"
  ```

---

## Task 3: run-ateam.yml — two-checkout pattern

**Files:**
- Modify: `.github/workflows/run-ateam.yml`

This is the template task. Tasks 4–7 follow the same pattern for the other workflows.

- [ ] **Step 1: Add `target_repo` input**

  In the `workflow_dispatch.inputs` block, add:

  ```yaml
  target_repo:
    description: "Target repo to build in (owner/repo)"
    required: false
    type: string
    default: "Jason-CullumICT/dev-crew"
  ```

- [ ] **Step 2: Add `REPO_PAT` and `TARGET_REPO` to the env block**

  Find the top-level `env:` block and add:

  ```yaml
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    REPO_PAT: ${{ secrets.REPO_PAT }}
    TARGET_REPO: ${{ inputs.target_repo || 'Jason-CullumICT/dev-crew' }}
    TEAM_DIR: "Teams/TheATeam"
  ```

- [ ] **Step 3: Replace the single checkout in every job with the two-checkout pattern**

  Every job currently has:
  ```yaml
  - uses: actions/checkout@v4
    with:
      ref: ${{ needs.plan.outputs.branch }}
  ```

  Replace with:
  ```yaml
  # Checkout dev-crew for team tools and role files
  - uses: actions/checkout@v4
    with:
      repository: Jason-CullumICT/dev-crew
      path: _dev-crew
      token: ${{ env.REPO_PAT }}

  # Checkout target repo for actual code work
  - uses: actions/checkout@v4
    with:
      repository: ${{ env.TARGET_REPO }}
      ref: ${{ needs.plan.outputs.branch }}
      path: workspace
      token: ${{ env.REPO_PAT }}
  ```

  For the **first job** (`plan`), the target repo has no branch yet, so use:
  ```yaml
  - uses: actions/checkout@v4
    with:
      repository: Jason-CullumICT/dev-crew
      path: _dev-crew
      token: ${{ env.REPO_PAT }}

  - uses: actions/checkout@v4
    with:
      repository: ${{ env.TARGET_REPO }}
      path: workspace
      token: ${{ env.REPO_PAT }}
  ```

- [ ] **Step 4: Update TEAM_DIR references in claude invocations**

  Every `claude` invocation uses `$(cat $TEAM_DIR/role.md)`. Since agents now run from `workspace/`, update the reference:

  ```yaml
  # BEFORE:
  --system-prompt "$(cat $TEAM_DIR/backend-coder.md)"

  # AFTER:
  --system-prompt "$(cat ../_dev-crew/$TEAM_DIR/backend-coder.md)"
  ```

  Apply to every `claude` invocation in the file.

- [ ] **Step 5: Update branch creation to target workspace/**

  In the `plan` job, the branch creation step:

  ```yaml
  # BEFORE:
  - name: Create feature branch
    id: branch
    run: |
      BRANCH="agent/ateam-$(date +%s)-$(echo $RANDOM | md5sum | head -c 8)"
      git checkout -b "$BRANCH"
      echo "name=$BRANCH" >> $GITHUB_OUTPUT

  # AFTER:
  - name: Create feature branch
    id: branch
    working-directory: workspace
    run: |
      BRANCH="agent/ateam-$(date +%s)-$(echo $RANDOM | md5sum | head -c 8)"
      git checkout -b "$BRANCH"
      git remote set-url origin https://x-access-token:${{ env.REPO_PAT }}@github.com/${{ env.TARGET_REPO }}.git
      echo "name=$BRANCH" >> $GITHUB_OUTPUT
  ```

- [ ] **Step 6: Update all push steps to use working-directory and PAT remote**

  Every push step currently does `git push origin HEAD`. Update to:

  ```yaml
  - name: Push
    working-directory: workspace
    run: |
      git config user.email "agent@dev-crew"
      git config user.name "dev-crew agent"
      git remote set-url origin https://x-access-token:${{ env.REPO_PAT }}@github.com/${{ env.TARGET_REPO }}.git
      git add -A
      git commit -m "Backend implementation

      Co-Authored-By: agent:backend-coder <agent@dev-crew>" || true
      git push origin HEAD
  ```

  Apply to every push step throughout the file.

- [ ] **Step 7: Update the PR creation step to target the correct repo**

  In the `create-pr` job, update the `github.rest.pulls.create` call:

  ```js
  // BEFORE:
  const pr = await github.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `[TheATeam] ${task.substring(0, 60)}`,
    head: branch,
    base: 'master',
    body: body,
  });

  // AFTER:
  const [targetOwner, targetRepoName] = process.env.TARGET_REPO.split('/');
  const pr = await github.rest.pulls.create({
    owner: targetOwner,
    repo: targetRepoName,
    title: `[TheATeam] ${task.substring(0, 60)}`,
    head: branch,
    base: 'master',
    body: body,
  });
  ```

  The `github-script` action uses the `GITHUB_TOKEN` by default which won't work cross-repo. Override it with `REPO_PAT`:

  ```yaml
  - name: Create Pull Request
    uses: actions/github-script@v7
    env:
      TARGET_REPO: ${{ env.TARGET_REPO }}
    with:
      github-token: ${{ env.REPO_PAT }}
      script: |
        const [targetOwner, targetRepoName] = process.env.TARGET_REPO.split('/');
        ...
  ```

- [ ] **Step 8: Update dashboard pipeline-update.sh calls to use _dev-crew path**

  Every `bash tools/pipeline-update.sh` call needs to reference the tools from dev-crew:

  ```yaml
  # BEFORE:
  run: |
    bash tools/pipeline-update.sh --team TheATeam ...

  # AFTER:
  run: |
    bash ../_dev-crew/tools/pipeline-update.sh --team TheATeam ...
  ```

  Apply to every `pipeline-update.sh` call in the file.

- [ ] **Step 9: Add `working-directory: workspace` to all claude invocation steps**

  Claude agents need to run from within the target repo so they read and write the right files:

  ```yaml
  - name: Run Backend Coder
    working-directory: workspace
    run: |
      claude --model claude-sonnet-4-6 \
        ...
  ```

  Apply to every `claude` step throughout the file.

- [ ] **Step 10: Commit**

  ```bash
  git add .github/workflows/run-ateam.yml
  git commit -m "feat(run-ateam): two-checkout pattern for any-repo support"
  ```

---

## Task 4: run-fixer.yml — same pattern

**Files:**
- Modify: `.github/workflows/run-fixer.yml`

Apply all the same changes as Task 3, with these differences:
- `TEAM_DIR: "Teams/TheFixer"`
- Input name is `fix_description` (not `task_description`)
- PR title prefix is `[TheFixer]`
- Branch prefix is `fix/fixer-`

- [ ] **Step 1:** Add `target_repo` input (same as Task 3 Step 1)
- [ ] **Step 2:** Update `env:` block (same, but `TEAM_DIR: "Teams/TheFixer"`)
- [ ] **Step 3:** Two-checkout pattern in every job (same as Task 3 Step 3)
- [ ] **Step 4:** Update `$(cat $TEAM_DIR/...)` references (same as Task 3 Step 4)
- [ ] **Step 5:** Update branch creation with PAT remote (same as Task 3 Step 5)
- [ ] **Step 6:** Update all push steps (same as Task 3 Step 6)
- [ ] **Step 7:** Update PR creation to use `REPO_PAT` and `TARGET_REPO` (same as Task 3 Step 7)
- [ ] **Step 8:** Update `pipeline-update.sh` paths (same as Task 3 Step 8)
- [ ] **Step 9:** Add `working-directory: workspace` to claude steps (same as Task 3 Step 9)
- [ ] **Step 10: Commit**

  ```bash
  git add .github/workflows/run-fixer.yml
  git commit -m "feat(run-fixer): two-checkout pattern for any-repo support"
  ```

---

## Task 5: run-designers.yml — same pattern

**Files:**
- Modify: `.github/workflows/run-designers.yml`

Same changes as Task 3. Differences:
- `TEAM_DIR: "Teams/TheDesigners"`
- No `pipeline-update.sh` calls currently in this file (skip Step 8)
- Design artifacts are written to `Teams/TheDesigners/artifacts/` — this path needs to stay in `workspace/` since it should land in the target repo

- [ ] Steps 1–7, 9 from Task 3 (skip Step 8)
- [ ] **Step 8: Commit**

  ```bash
  git add .github/workflows/run-designers.yml
  git commit -m "feat(run-designers): two-checkout pattern for any-repo support"
  ```

---

## Task 6: run-inspector.yml — same pattern

**Files:**
- Modify: `.github/workflows/run-inspector.yml`

Same changes as Task 3. Differences:
- `TEAM_DIR: "Teams/TheInspector"`
- Has `schedule` trigger (nightly) — no `target_repo` on the scheduled run, defaults to dev-crew
- No branch creation or push steps — inspector is read-only, just produces a report
- The issue creation step at the end uses `context.repo` which is fine (dev-crew creates the issue in dev-crew)

- [ ] Steps 1–2 from Task 3 (add input and env)
- [ ] Step 3 (two-checkout)
- [ ] Step 4 (TEAM_DIR references)
- [ ] Step 8 (pipeline-update.sh paths)
- [ ] Step 9 (working-directory on claude steps)
- [ ] **Commit:**

  ```bash
  git add .github/workflows/run-inspector.yml
  git commit -m "feat(run-inspector): two-checkout pattern for any-repo support"
  ```

---

## Task 7: run-guardians.yml — same pattern

**Files:**
- Modify: `.github/workflows/run-guardians.yml`

Same as Task 6 (read-only, no push/PR steps). Differences:
- `TEAM_DIR: "Teams/TheGuardians"`
- Spins up Docker ephemeral environment — the `docker-compose.test.yml` needs to come from the target repo's workspace. If the target repo doesn't have one, the step should fail gracefully (already has `|| true`).

- [ ] Steps 1–2, 3, 4, 8, 9 from Task 3
- [ ] **Commit:**

  ```bash
  git add .github/workflows/run-guardians.yml
  git commit -m "feat(run-guardians): two-checkout pattern for any-repo support"
  ```

---

## Task 8: Push and smoke test with dev-crew as target

Verify backwards compatibility — building in dev-crew should work exactly as before.

- [ ] **Step 1: Push all changes**

  ```bash
  git push origin master
  ```

- [ ] **Step 2: Trigger a manual run of run-fixer.yml with dev-crew as target**

  Go to Actions → Run TheFixer → Run workflow.

  Fill in:
  - `fix_description`: "Test run — verify two-checkout works with dev-crew as target"
  - `target_repo`: `Jason-CullumICT/dev-crew`

  Click Run workflow.

- [ ] **Step 3: Watch the run**

  Go to the Actions tab. Open the run. Verify:
  - Both checkout steps complete (dev-crew → `_dev-crew/`, workspace → `workspace/`)
  - Claude invocations start and read role files from `../_dev-crew/Teams/TheFixer/`
  - Git operations happen inside `workspace/`
  - PR is created in `Jason-CullumICT/dev-crew`

- [ ] **Step 4: If any step fails, fix and re-push**

  Common failure modes:
  - `No such file: ../_dev-crew/Teams/TheFixer/planner.md` → TEAM_DIR path not updated in that step
  - `remote: Permission denied` → REPO_PAT secret not set or missing `contents: write`
  - `working-directory: workspace: No such directory` → checkout path mismatch

---

## Task 9: Smoke test with an external repo

- [ ] **Step 1: Create or identify a test repo**

  Use any existing repo you own (e.g. `Jason-CullumICT/some-other-repo`). It needs at least one file and a `master` or `main` branch.

- [ ] **Step 2: Trigger run-fixer.yml targeting the external repo**

  Actions → Run TheFixer → Run workflow:
  - `fix_description`: "Add a README section describing this repo"
  - `target_repo`: `Jason-CullumICT/some-other-repo`

- [ ] **Step 3: Verify the run**

  Check that:
  - `workspace/` checkout is `some-other-repo`, not `dev-crew`
  - Branch is created in `some-other-repo`
  - Code changes land in `some-other-repo`
  - PR is opened in `some-other-repo`

- [ ] **Step 4: Verify the portal flow end-to-end**

  In the portal, create a bug report. Set target repo to `Jason-CullumICT/some-other-repo`. Set pipeline mode to `⚡ GitHub Actions`. Submit. Verify the orchestrator dispatches correctly and the run appears in GitHub Actions.

---

## Rollback notes

If something goes wrong mid-implementation:
- The local Docker pipeline is unaffected by all of these changes — `pipelineMode: 'local'` continues to use `workflowEngine.executeWorkflow()` with no changes
- Each workflow file change is a separate commit — revert individual files with `git revert <sha>` if needed
- The `REPO_PAT` secret can be deleted from GitHub to disable cross-repo writes without touching code
