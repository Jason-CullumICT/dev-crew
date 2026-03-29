# dev-crew

AI-powered development platform that orchestrates autonomous agent teams to build software through specifications, plans, and automated pipelines.

## Quick Start

```bash
git clone https://github.com/Jason-CullumICT/dev-crew
cd dev-crew/platform
cp .env.example .env
# Edit .env — add your GITHUB_TOKEN
docker compose up -d
```

That's it. Three services start:

| Service | URL | Purpose |
|---------|-----|---------|
| Orchestrator | http://localhost:9800 | API + dashboard — submit work, monitor runs |
| Portal | http://localhost:4200 | Debug UI — detailed cycle/run viewer |
| Reports | http://localhost:9801 | Static HTML reports from Inspector and QA |

## How It Works

Submit work via the API. The orchestrator assigns an agent team, spins up a worker container, and runs the full pipeline: planning, implementation, QA, validation, E2E testing, commit, and PR creation.

```bash
# Work on this repo (default)
curl -X POST http://localhost:9800/api/work \
  -H "Content-Type: application/json" \
  -d '{"task": "Add user authentication to the backend"}'

# Work on an external repo
curl -X POST http://localhost:9800/api/work \
  -H "Content-Type: application/json" \
  -d '{"task": "Fix the login bug", "repo": "https://github.com/org/project"}'
```

External repos without agent team structure get automatically scaffolded from `templates/` on first run.

## Agent Teams

| Team | Purpose | Agents |
|------|---------|--------|
| **TheATeam** | New features | 12 agents — requirements, API contract, parallel coders, chaos testing, security QA, traceability, visual review |
| **TheFixer** | Bug fixes | 8 agents — planner, parallel fixers, verification, security spot-check |
| **TheInspector** | Health audits | 6 specialists — red team, quality, performance, chaos, dependencies |

The orchestrator automatically routes work to the right team based on the task description. Override with `"team": "TheFixer"` in the request body.

## Repository Structure

```
Specifications/     Domain truth (technology-agnostic)
Source/             Application source code
Plans/              Feature plans (prompt/design/plan per feature)
Teams/              Agent team definitions and learnings
tools/              Pipeline dashboard and traceability scripts
platform/           Orchestrator infrastructure (Docker, server, scripts)
portal/             Debug UI (embedded via iframe at /debug)
templates/          Clean scaffold for external projects
docs/               Design specs and implementation plans
```

## Configuration

Copy `platform/.env.example` to `platform/.env` and set:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | — | GitHub PAT for cloning repos and creating PRs |
| `GITHUB_REPO` | No | This repo | Default repo workers clone |
| `GITHUB_BRANCH` | No | master | Default branch |
| `DASHBOARD_PORT` | No | 9800 | Orchestrator port |
| `PORTAL_FRONTEND_PORT` | No | 4200 | Portal UI port |
| `PORTAL_BACKEND_PORT` | No | 4201 | Portal API port |
| `REPORT_PORT` | No | 9801 | Reports dashboard port |

## Monitoring

- **Dashboard** at `:9800` — live run status, phase progress
- **Reports** at `:9801` — static HTML from Inspector, QA, security audits
- **Debug portal** at `:4200` — full cycle/run detail (also embedded at `/debug` in the app)
- **API** — `GET /api/runs/:id` for programmatic access, `GET /api/health` for status

## Failure Recovery

- Failed runs preserve their Docker volume — retry reuses the code
- `POST /api/runs/:id/retry` to retry a failed run
- Force a specific team: `{"team": "TheFixer"}`

## Requirements

- Docker with Compose v2
- A GitHub Personal Access Token with repo scope
- Anthropic API access (via Claude Code credentials at `~/.claude/.credentials.json`)
