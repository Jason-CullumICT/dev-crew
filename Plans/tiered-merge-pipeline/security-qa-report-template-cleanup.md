# Security QA Report — Template Cleanup (Task 4)

**Agent:** security-qa
**Team:** TheFixer
**Date:** 2026-03-28
**Task:** Clean up templates/ directory for use as a project scaffold
**Cycle:** run-1774659881613-80bc96c6

---

## RISK_LEVEL: low

**Rationale:** This is a documentation/scaffold cleanup task. No schema changes, no source code changes, no auth/security modifications. Affects only files under `templates/` which are inert scaffold content. < 10 files involved.

---

## Summary

The templates/ directory cleanup has been implemented correctly. All five task steps are verified complete:

1. **Learnings cleanup** — PASS. All `.md` files in `learnings/` subdirectories are removed. Only `.gitkeep` files remain. No `findings/` directories exist.
2. **templates/CLAUDE.md** — PASS. Contains all required sections (Read These First, Repository Layout, Architecture Rules, Agent Teams). Architecture rules include specs-as-truth, no direct DB calls, shared types, traceability, and no silent failures. Project-specific content replaced with `<!-- Replace -->` placeholders (11 total). No leaked credentials, URLs, or project names.
3. **templates/Specifications/README.md** — PASS. Contains instructions for adding domain specs with template and tag reference.
4. **templates/Plans/_template/README.md** — PASS. Contains plan template structure (prompt.md, design.md, plan.md, requirements.md).
5. **templates/tools/** — PASS. Contains all three required files: `pipeline-update.sh`, `traceability-enforcer.py`, `spec-drift-audit.py`.

---

## Findings

### MEDIUM: Hardcoded safety FR IDs in spec-drift-audit.py

**File:** `templates/tools/spec-drift-audit.py:176`
**Issue:** The `safety_frs` set contains project-specific FR IDs (`FR-EM-004`, `FR-EM-008`, `FR-EM-009`, `FR-DR-016`, `FR-AC-003`) that are from the dev-crew project. A new project using this template will not have these FR IDs, making the safety-critical check meaningless.
**Recommendation:** Replace the hardcoded set with a configurable approach — either load safety FRs from a config file, or add a `<!-- Replace -->` comment in the code indicating users should define their own safety-critical FRs. This is a MEDIUM because it's a functional gap, not a security vulnerability.

### LOW: pipeline-update.sh not marked executable

**File:** `templates/tools/pipeline-update.sh`
**Issue:** File permissions are `644` (not executable). When scaffolded to a new project, users would need to `chmod +x` manually or the Dockerfile `RUN chmod +x` line handles it.
**Recommendation:** Set executable permission (`chmod +x`) on the template file so it works out of the box.

### INFO: Template CLAUDE.md is well-sanitized

No project-specific URLs, credentials, repo names, or user identifiers were found in `templates/CLAUDE.md`. The 11 `<!-- Replace -->` placeholders are correctly placed in all project-specific sections (description, domain concepts, dev environment, build commands, verification gates, MCP tools, module ownership).

### INFO: No secrets or sensitive data in templates/

Scanned all files in `templates/` for patterns matching passwords, API keys, tokens, credentials, and email addresses. No sensitive data found. References to "secrets", "tokens", etc. in team role files (red-teamer.md, quality-oracle.md) are appropriate — they describe what to look for, not actual secrets.

### INFO: Tools contain no project-specific references

All three tool scripts (`pipeline-update.sh`, `traceability-enforcer.py`, `spec-drift-audit.py`) contain no references to project-specific names (Jason-Cullum, Work-backlog, dev-crew, container-test). They are generic and reusable.

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | PASS | Template CLAUDE.md includes this rule |
| No direct DB calls | PASS | Template CLAUDE.md includes this rule |
| Shared types single source | PASS | Template CLAUDE.md includes this rule |
| Traceability (FR tests) | PASS | Template CLAUDE.md includes this rule |
| No hardcoded secrets | PASS | No secrets found in templates/ |
| No silent failures | PASS | Template CLAUDE.md includes this rule |

---

## Verdict

**PASS** — The templates/ directory is clean and ready for use as a project scaffold. Two non-blocking findings noted (MEDIUM on hardcoded safety FRs, LOW on file permissions). No security vulnerabilities found.
