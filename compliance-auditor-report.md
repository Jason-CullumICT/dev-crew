The pipeline-state JSON didn't have a pre-registered run ID for this session (no parent orchestrator started one), so the dashboard call was a no-op — all findings are captured above and in the learnings file.

---

## Summary

The audit covered **23 controls** across **OWASP-ASVS L2**, **SOC2-Type2 (CC6.1–CC8.1)**, **GDPR Art. 17/32**, and touched ISO 27001 equivalents.

### Results at a Glance

| | Count |
|-|-------|
| ✅ Pass | 3 |
| ⚠️ Partial | 4 |
| ❌ Fail | 16 |
| **Pass Rate** | **23%** |
| **Grade** | **D** |

### The Three Root Causes Driving Most Failures

1. **No authentication** (`COMP-001`) — cascades into CC6.1, CC6.2, V2.1, V4.x, V3.3. Fix this first.
2. **No security headers** (`COMP-004`) — a single `npm install helmet cors` + 2 lines in `app.ts` resolves V14.4, V14.5, and the CORS gap.
3. **Audit event gap** (`COMP-003`) — `login_attempt`, `permission_denied`, and `data_export` events cannot exist until auth/authz exist. `state_transition` needs an `event` field added to structured log calls.

**Quick wins** (< 1 day each): COMP-004 (helmet+cors), COMP-005 (rate-limit + pagination cap), COMP-007 (protect `/metrics`), COMP-008 (sanitise 500 error messages). These alone improve the grade from D toward C.
