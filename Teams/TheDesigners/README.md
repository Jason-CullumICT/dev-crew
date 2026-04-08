# TheDesigners

A pre-implementation design pipeline that converts specs into approved, screenshot-backed design artifacts. **TheDesigners runs before TheATeam** and produces the design spec that TheATeam's `design-critic` validates against after implementation.

## Agents

| Agent | Model | Role | Scalable |
|-------|-------|------|----------|
| **`team-leader`** | **sonnet** | **Pipeline orchestrator — spawns all agents, manages hard approval gate** | **No (1)** |
| `ux-researcher` | sonnet | Reads spec + existing UI pages. Produces UX brief: personas, flows, pain points, constraints | No (1) |
| `visual-designer` | sonnet | Renders mockups in browser. Captures screenshots. Produces 2–3 options with trade-offs | No (1) |
| `design-systems` | haiku | Validates mockups against existing Tailwind tokens, component conventions, spacing grid | No (1) |
| `accessibility-auditor` | haiku | WCAG 2.1 AA review of proposed designs before implementation | No (1) |

## Pipeline

```
Stage 1: ux-researcher            (sequential — reads spec + existing UI)
              |
Stage 2: visual-designer          (sequential — browser automation, screenshot capture)
              |
Stage 3 (parallel):
    design-systems
    accessibility-auditor
              |
         !! HARD GATE !!
    User approves design
              |
    Design spec committed to:
    docs/designs/YYYY-MM-DD-<feature>.md
    Teams/TheDesigners/artifacts/<feature>/
              |
    TheATeam picks up implementation
    (design-critic validates against committed spec)
```

## Key Design Decisions

### 1. Screenshots Are the Artifact
The visual-designer MUST produce actual browser screenshots — not descriptions, not ASCII wireframes. These screenshots are the reference the `design-critic` in TheATeam uses post-implementation.

### 2. User Approval Is a Hard Gate
The team-leader stops after Stage 3 and presents options to the user. No design spec is committed until the user approves. This is intentional — AI designs without human review produce implementation waste.

### 3. Design-Systems and Accessibility Run Pre-Implementation
Catching consistency violations and WCAG failures in mockups is cheaper than catching them in code. TheATeam's coders receive a pre-validated design spec.

### 4. No Code Is Written
TheDesigners is design-only. The boundary is strict: if a design decision requires a code spike to validate feasibility, the team-leader flags it and the human decides whether to run a quick TheATeam spike first.

### 5. Output Feeds TheATeam
The committed design spec MUST include:
- Screenshot paths for each approved screen/state
- Component list with Tailwind class requirements
- Accessibility requirements per component
- Any deviation notes for coders

### 6. Self-Learning
Every agent maintains `Teams/TheDesigners/learnings/{role}.md`. Read at start, write at end. Accumulates knowledge about project conventions, what the visual-designer can render effectively, WCAG patterns that repeatedly surface.

### 7. Dashboard Reporting
All agents report to `tools/pipeline-state-TheDesigners.json` via `tools/pipeline-update.sh --team TheDesigners`.

## Where Artifacts Go

| Artifact | Path |
|---|---|
| UX brief | `Teams/TheDesigners/artifacts/<feature>/ux-brief.md` |
| Mockup screenshots | `Teams/TheDesigners/artifacts/<feature>/screens/` |
| Design options comparison | `Teams/TheDesigners/artifacts/<feature>/options.md` |
| Final committed design spec | `docs/designs/YYYY-MM-DD-<feature>.md` |

## Relationship to TheATeam

TheATeam's `design-critic` (in `Teams/Shared/design-critic.md`) reads the committed design spec from `docs/designs/` and validates the implemented UI against it. The handoff is the design spec file — TheDesigners writes it, design-critic reads it.

| Phase | Team | Key Output |
|---|---|---|
| Design | **TheDesigners** | `docs/designs/<feature>.md` + screenshots |
| Implementation | TheATeam | Working code |
| Visual validation | TheATeam/design-critic | Pass/Fail verdict against design spec |

## When to Use

| Scenario | Use TheDesigners? |
|---|---|
| New page or major UI surface | **Yes** |
| Small bug fix or text change | No — go straight to TheATeam |
| Redesign of existing page | **Yes** |
| New component with complex states | **Yes** |
| Backend-only feature | No |
| Adding a field to an existing form | No — TheATeam direct |
