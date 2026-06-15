Learnings updated. Here is the complete static analysis summary for the team leader:

---

## Static Analyzer Results — Final Summary

### Tools Run
| Tool | Status | Findings |
|------|--------|----------|
| `gitleaks` | [TOOL UNAVAILABLE] | LLM fallback performed |
| `semgrep` | [TOOL UNAVAILABLE] | LLM fallback performed |
| Hardcoded secrets (LLM) | Complete | **0 secrets found** |
| Dangerous APIs (LLM) | Complete | **0 found** (no eval/exec/child_process/shell injection) |
| Insecure crypto (LLM) | Complete | **0 found** (uuid v4 used correctly) |

### Findings by Severity

**High (2)**
- **SAST-001** — CWE-306: Zero authentication on all 15+ API endpoints. Any caller can approve, reject, dispatch, and create work items. [HANDOFF → pen-tester]
- **SAST-002** — CWE-250: Docker socket (`/var/run/docker.sock`) mounted into orchestrator container — full host escape vector.

**Medium (7)**
- **SAST-003** — CWE-693: No HTTP security headers (CSP, X-Frame-Options, HSTS, etc.)
- **SAST-004** — CWE-942: No CORS policy configured on any route
- **SAST-005** — CWE-20: `parseInt()` without NaN guard or upper-bound cap on pagination `limit` (DoS via `?limit=999999`)
- **SAST-006** — CWE-20: Intake webhook routes (`/zendesk`, `/automated`) skip enum validation for `type` and `priority` — arbitrary strings stored in system state
- **SAST-007** — CWE-200: Prometheus `/metrics` endpoint unauthenticated, leaking runtime internals and workflow telemetry
- **SAST-008** — CWE-250: Both `Dockerfile.worker` and `portal/Dockerfile` run as root (no USER directive)
- **SAST-009** — CWE-16: Vite dev server bound to `0.0.0.0` in the portal Docker image, exposing source maps and HMR on all interfaces

**Low (3)**
- **SAST-010** — CWE-209: Raw exception messages returned to API clients in `workflow.ts` catch blocks
- **SAST-011** — CWE-770: No rate limiting on any endpoint
- **SAST-012** — CWE-1021: Debug portal `<iframe>` missing `sandbox` attribute

**Totals: High: 2 | Medium: 7 | Low: 3 | Total: 12**  
**Grade impact (per grading config):** 2 High findings → Grade **B** ceiling (max 6 High for B). No Critical findings.
