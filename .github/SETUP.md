# GitHub Actions Agent Pipeline — Setup Guide

## What you get

6 workflows that run your dev-crew agent teams on GitHub Actions:

| Workflow | Team | Trigger | Agents |
|---|---|---|---|
| `dispatch.yml` | Router | Issue labeled / manual | Routes to correct team |
| `run-ateam.yml` | TheATeam | Dispatched / manual | 12 agents, ~25 min |
| `run-fixer.yml` | TheFixer | Dispatched / manual | 8 agents, ~5 min |
| `run-designers.yml` | TheDesigners | Dispatched / manual | 6 agents |
| `run-inspector.yml` | TheInspector | Nightly / manual | 5 agents |
| `run-guardians.yml` | TheGuardians | Manual | 5 agents (ephemeral env) |

## Setup Steps

### 1. Add your Anthropic API key as a secret

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-... (your Anthropic API key)
```

### 2. Ensure GitHub token permissions

Go to Settings → Actions → General → Workflow permissions:
- Select **"Read and write permissions"**
- Check **"Allow GitHub Actions to create and approve pull requests"**

### 3. Push the workflows

```bash
cd repos/dev-crew
git add .github/workflows/
git commit -m "Add agent pipeline workflows for all teams"
git push origin master
```

### 4. Verify workflows appear

Go to your repo → Actions tab. You should see:
- Dispatch to Agent Team
- Run TheATeam
- Run TheFixer
- Run TheDesigners
- Run TheInspector
- Run TheGuardians

## How to Use

### Option A: Label-based dispatch (recommended)

1. Create a GitHub issue describing what you want built
2. Add one of these labels:

| Label | Routes to |
|---|---|
| `agent:build` | TheATeam (new features) |
| `agent:fix` | TheFixer (bug fixes) |
| `agent:design` | TheDesigners (pre-impl design) |
| `agent:audit` | TheInspector (health audit) |
| `agent:security` | TheGuardians (security audit) |

3. The dispatch workflow auto-runs, classifies, and triggers the right team
4. Watch progress in the Actions tab
5. Review the PR when it arrives

### Option B: Manual dispatch

1. Go to Actions → select the workflow
2. Click "Run workflow"
3. Fill in the inputs
4. Monitor progress

### Option C: Auto-classification

1. Create an issue with a descriptive title
2. Label it `agent:build` (dispatch will auto-classify based on keywords)
3. Keywords like "bug", "fix", "broken" → TheFixer
4. Keywords like "design", "mockup" → TheDesigners
5. Default → TheATeam

## Pipeline Flow

```
Issue created + labeled
       |
  [dispatch.yml]
  Classifies → routes to team workflow
       |
  +----+----+----+----+----+
  |    |    |    |    |    |
  A   Fix  Des  Ins  Grd
  Team      ign  pct  ns
       |
  Team-specific pipeline runs
  (agents as GitHub Actions jobs)
       |
  PR created automatically
       |
  Human reviews + approves
       |
  Merge
```

## Dashboard Integration

The workflows call `tools/pipeline-update.sh` to update the existing
dev-crew dashboard. If you have the Docker orchestrator running locally,
you'll see agent progress at `http://localhost:9800`.

If running on GitHub Actions only (no local Docker), the dashboard state
files are committed to the repo and visible in `tools/pipeline-state-*.json`.

## Cost Awareness

Each workflow run calls Claude API. Approximate costs per run:

| Team | Model mix | Est. cost per run |
|---|---|---|
| TheATeam | 10× sonnet + 2× haiku | ~$5-15 |
| TheFixer | 5× sonnet + 2× haiku | ~$2-5 |
| TheDesigners | 3× sonnet + 2× haiku | ~$3-8 |
| TheInspector | 3× sonnet + 2× haiku | ~$2-5 |
| TheGuardians | 4× sonnet + 1× haiku | ~$3-8 |

Monitor usage at console.anthropic.com.

## Troubleshooting

### "Claude Code not found"
The workflows install `@anthropic-ai/claude-code` via npm. Ensure
your runners have Node.js 22+. The `setup-node` action handles this.

### "Permission denied" on PR creation
Check workflow permissions (Step 2 above). The token needs write access
to contents, issues, and pull-requests.

### "Workflow not triggering on labels"
Create the labels first (`agent:build`, `agent:fix`, etc.) in your repo
under Issues → Labels. They must exist before the workflow can match them.

### Agent fails mid-pipeline
Check the Actions log for the specific job. Each agent runs as a separate
job — a failure in one doesn't necessarily block others (except where
there are `needs:` dependencies).
