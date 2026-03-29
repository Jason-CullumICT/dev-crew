# Specifications

Add your domain specifications here. Each spec should be technology-agnostic and describe WHAT the system does, not HOW.

## How to Use

1. **Add domain specs here** before writing any code. Every feature, entity, and business rule should be documented in a specification file.
2. **Name files descriptively**: e.g., `user-management.md`, `billing-engine.md`, `notification-system.md`.
3. **Keep specs technology-agnostic**: describe *what* the system does, not *how* it's implemented.
4. **Use functional requirement IDs** (e.g., FR-XXX-001) for traceability from code back to specs.

## Specification Template

```markdown
# Feature: [Name]

## Overview
Brief description of the domain area.

## Functional Requirements

### FR-XXX-001 [layer] [size]
**Title**
- Description of the requirement
- AC: Acceptance criteria 1
- AC: Acceptance criteria 2

## Non-Functional Requirements
- Performance: ...
- Security: ...

## Domain Rules
- Rule 1: ...
- Rule 2: ...
```

## Layer Tags
- `[backend]` -- Server-side logic, API endpoints, database
- `[frontend]` -- Client-side UI, components, pages
- `[shared]` -- Types and contracts used across layers
- `[infra]` -- Infrastructure, deployment, CI/CD

## Size Tags
- `[S]` -- Small, 1-2 hours estimated effort
- `[M]` -- Medium, 2-4 hours
- `[L]` -- Large, 4-8 hours
- `[XL]` -- Extra large, 8+ hours, consider splitting
