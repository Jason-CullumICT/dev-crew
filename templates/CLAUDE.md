# CLAUDE.md

## This is an AI-first, spec-first project.

<!-- Replace: Add a 1-2 sentence project description -->
**Project Name** — Project description goes here.

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

<!-- Replace: Customize the source layout to match your project structure -->
```
Specifications/          # Domain truth (technology-agnostic)
Source/                  # Application source code
Plans/                   # Feature plans (prompt/design/plan per feature)
Teams/                   # Agent team definitions and learnings
tools/                   # Pipeline dashboard scripts
```

## Key Domain Concepts

<!-- Replace: Define your project's core domain entities, rules, and terminology here -->

## Dev Environment Quick Reference

<!-- Replace: Fill in your project's URLs, credentials, and environment details -->

| Item | Value |
|------|-------|
| Backend URL | <!-- Replace --> |
| Frontend URL | <!-- Replace --> |

## Build & Test

<!-- Replace: Add your build and test commands here -->

## Architecture Rules

These are non-negotiable. All agents and solo sessions must follow them.

- **Specs are source of truth** -- implementation traces to specs, never the other way around
- **No direct DB calls from route handlers** -- use the service layer
- **Shared types are single source of truth** -- no inline type re-definitions across layers
- **Every FR needs a test** with `// Verifies: FR-XXX` traceability comments
- **Schema changes require a migration**
- **No hardcoded secrets** -- use environment variables via `.env`
- **All list endpoints return `{data: T[]}` wrappers** -- use the response patterns below
- **New routes must have observability** -- structured logging (not console.log), Prometheus metrics for domain-significant operations
- **Business logic has no framework imports** -- keep domain logic in pure functions/services
- **Shared type changes affect multiple layers** -- coordinate across layers before editing
- **No silent failures** -- every operation that can fail must have its outcome checked and logged

<!-- Replace: Add project-specific architecture rules as needed -->

**API response patterns:**

| Pattern | Type | Example |
|---------|------|---------|
| Paginated list | `PaginatedResponse<T>` | `{data: [...], page, limit, total, totalPages}` |
| Simple list | `DataResponse<T>` | `{data: [...]}` |
| Single item | `T` directly | `{id, name, ...}` |
| Delete | `204 No Content` | (no body) |
| Error | `ApiErrorResponse` | `{error: "message"}` |

## Observability

All new code must maintain observability. This is an architecture rule, not optional.

### Logging
- Use structured JSON logging in production, pretty-printing in development
- Use the project's logger abstraction, never `console.log` or `log.Printf`
- `LOG_LEVEL` env var controls verbosity

### Metrics
- Expose Prometheus-compatible metrics at `GET /metrics`
- **When to add a new metric**: Domain-significant operations (auth decisions, state transitions, external system calls). Do not metric basic CRUD

### Tracing
- Use OpenTelemetry for distributed tracing
- Propagate W3C `traceparent` header across service boundaries

## Testing Rules

Write tests before or alongside implementation. Run verification gates before marking any task done.

**Verification gates:**
<!-- Replace: Add your test and verification commands here -->
```bash
# Example:
# npm run test
# npm run lint
# npm run typecheck
```

If any gate fails: fix it, re-run the full gate sequence, then mark done.

## MCP Tools

<!-- Replace: Add your MCP tool references here -->

## Agent Teams

**Source code changes MUST go through a team pipeline** (TheATeam or TheFixer) for QA, code review, traceability, and test coverage. Solo sessions may edit `Specifications/`, `Plans/`, `Teams/`, `docs/`, and `tools/` freely. If a solo session must touch `Source/` (e.g., urgent hotfix), it MUST run all verification gates, confirm zero new failures, and update any broken tests before committing.

**Team leader orchestration-only rule** -- Team leaders are STRICTLY orchestrators. They spawn agents via the Agent tool and route results between stages. They MUST NOT edit Source/ files, run tests, or perform any work that belongs to a pipeline role (planner, coder, fixer, QA, security). Every pipeline stage MUST be a separate Agent tool invocation. If a team leader cannot spawn subagents, it MUST stop and report the limitation -- never fall back to doing the work itself.

**Team leader dispatch pattern** -- Team leaders produce plans but cannot dispatch subagents when spawned as subagents themselves. The parent session dispatches implementation agents based on the leader's plan.

**Module ownership** -- agents MUST stay within their assigned module. Cross-module changes require coordination.

| Module | Owner | Notes |
|--------|-------|-------|
| `Source/Backend/` | backend-coder | Routes, services, database, tests |
| `Source/Frontend/` | frontend-coder | Components, hooks, pages, tests |
| `Source/Shared/` | api-contract | Shared types |
| `Specifications/` | requirements-reviewer | Domain truth documents |

<!-- Replace: Add additional module ownership rows as needed -->

**Team rules** (when running as part of any agent team):
1. **Read `CLAUDE.md` in full** before starting any task
2. **Stay in your module** -- do not edit files outside your assigned scope
3. **Run verification gates** before reporting completion -- all gates must pass with zero new failures
4. **Share findings** via `agent.md` when you discover something that affects other agents
5. **Do not suppress test output** or use `--passWithNoTests` or equivalent flags
6. **Do not skip verification** -- even if you're confident the code is correct
7. If you change a source file, you own updating its tests -- never commit source changes that break existing tests

**Self-learning**: Agents maintain persistent learnings at `Teams/{team}/learnings/{role}.md` -- read at start, write new discoveries at end.

**Dashboard reporting**: Agents report progress to `tools/pipeline-state-{team}.json` via `tools/pipeline-update.sh` (see `tools/README.md`).

## Session Hygiene

- `/clear` between unrelated tasks
- At 70% context, compact or start fresh
- Corrected twice on same mistake? `/clear` and restart
