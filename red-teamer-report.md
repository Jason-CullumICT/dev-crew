---

## Red Team Summary

**All 4 pentest objectives achieved. Security grade: F.**

### Confirmed Breaches (8 total)

| ID | Severity | Finding | Objective |
|---|---|---|---|
| **RED-001** | Critical | Entire portal API accessible with zero authentication | Root enabler |
| **RED-002** | Critical | PATCH `/status:voting` + force-approve → approved with 0 AI votes | ✅ State machine bypass |
| **RED-003** | High | Hard-delete blocker leaves zombie dependency — dependent permanently frozen | ✅ Soft-deleted item reference |
| **RED-004** | High | No SQL LIMIT on list endpoints — entire dataset extracted in one request | ✅ Pagination bypass |
| **RED-005** | Medium | `/metrics` publicly accessible — leaks operation patterns | Intelligence |
| **RED-006** | High | `<script>` and `<img onerror>` stored verbatim in title/description fields | XSS |
| **RED-007** | Critical | `force-approve` callable by anyone with no auth, overrides any vote outcome | ✅ Malformed assessment bypass |
| **RED-008** | Critical | `DELETE /api/feature-requests/:id` with no auth destroys records permanently | Data integrity |

### Key Discovery
⚠️ **Target discrepancy:** The pen-tester's attack surface map was written against `Source/Backend` (`/api/work-items`), but `docker-compose.test.yml` runs `portal/Backend` (`/api/feature-requests`, `/api/bugs`). All findings above are confirmed against the **live portal/Backend instance**. The structural vulnerabilities (no auth, state machine bypass, ghost blocker, no pagination) are present in both codebases.

### What Held
- Bug PATCH status transitions enforce the state machine (400 for invalid jumps)
- CORS properly rejects cross-origin browser requests from non-whitelisted origins
- Orchestrator proxy unavailable in test environment (no SSRF surface)

Full findings appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`.
