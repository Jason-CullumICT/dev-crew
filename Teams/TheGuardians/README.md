# TheGuardians

A specialized security team dedicated to penetration testing, static code analysis (SAST), and security compliance auditing. Designed to be run on new builds, release candidates, and routine security checks.

This team ensures that the application not only defends against active adversarial attacks but also adheres to industry compliance standards (e.g., SOC2, GDPR, ISO27001) and secure coding best practices.

## Agents (5)

| Agent | Model | Role | Mode |
|-------|-------|------|------|
| **`team-leader`** | **sonnet** | Pipeline orchestrator — scopes the security audit, dispatches the security specialists in phases, synthesizes the final executive security and compliance report. | Orchestration only |
| `pen-tester` | sonnet | Exhaustive vulnerability discovery. Performs white-box static analysis to map the entire attack surface and identify potential vulnerabilities (e.g., OWASP Top 10, auth bypasses). Feeds findings to the Red Teamer. | Always static |
| `red-teamer` | sonnet | Objective-based adversarial exploitation. Takes the Pen Tester's static findings and attempts to chain them together to breach specific business objectives (e.g., "exfiltrate tenant data") in the running environment. | Always dynamic |
| `compliance-auditor` | sonnet | Verifies adherence to security compliance frameworks. Audits access controls, data privacy measures, audit logging, and cryptographic standards. | Always static |
| `static-analyzer` | haiku/sonnet | Deep static code analysis (SAST) for CWEs, hardcoded secrets, and insecure API usage. Runs early in the pipeline. | Always static |

## Pipeline

```text
Stage 1: Scoping & Static Analysis (team-leader dispatch)
          ┌─────────────────────┬───────────────────┬──────────────┐
          v                     v                   v              
   static-analyzer      compliance-auditor    pen-tester    
   [secrets, CWEs]      [framework checks]    [vuln discovery]
          └─────────────────────┴───────────────────┴──────────────┘
          |
Stage 2: Adversarial Exploitation
          The Red Teamer reviews the Pen Tester's discovered vulnerabilities
          and attempts to chain them into targeted, objective-based attacks
          against the live environment.
          |
          v
      red-teamer
      [dynamic exploits]
          |
Stage 3: Synthesis (team-leader)
          Consolidates SAST findings, Compliance gaps, and successful Red Team exploits.
          Generates an HTML Security Report and a structured JSON backlog.
```

## How It Works

The Guardians operate best when integrated into a CI/CD pipeline right before a major release or on a nightly schedule. 

- **Penetration Testing:** White-box static analysis maps the full attack surface. The red-teamer then chains those findings into active exploits against the live environment — always dynamic, no static fallback.
- **Compliance Auditing:** Maps codebase realities (e.g., how passwords are hashed, how PII is stored) against strict compliance requirements.
- **Static Analysis:** Scans first-party source code for CWEs, hardcoded secrets, and insecure API patterns. Third-party CVEs are handled by TheInspector's dependency-auditor.

## How to Invoke

Provide the team leader with the current build context, the target environment URLs, and the compliance frameworks to audit against.

> **REQUIRED:** The red-teamer executes active exploit chains. Always confirm the target is an **ephemeral, isolated environment** (e.g., a Docker Compose stack spun up for this run) — never shared dev, staging, or production. The team-leader will gate on this before dispatching Phase 2.

```text
Read the role file at Teams/TheGuardians/team-leader.md and follow it exactly.

Task context:
Audit: Security and Compliance Review
Target: Ephemeral isolated environment (confirm before red-teamer dispatch)

Team folder: Teams/TheGuardians
Config: Teams/TheGuardians/security.config.yml
```