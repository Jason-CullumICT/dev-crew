Learnings file updated. Here is the complete scan summary:

---

## Static Analyzer Results

### Tools Run
- **gitleaks:** `[TOOL UNAVAILABLE]` — LLM pattern scan substituted
- **semgrep:** `[TOOL UNAVAILABLE]` — LLM pattern scan substituted
- **Hardcoded secrets:** ✅ None found — all credentials use env vars correctly

---

### Findings: 9 total — 0 Critical · 2 High · 5 Medium · 2 Low

| ID | Title | Severity | CWE | File |
|----|-------|----------|-----|------|
| **SAST-001** | No authentication on any API endpoint | **High** | CWE-306 | `app.ts:13–29` |
| **SAST-002** | Webhook intake lacks HMAC signature verification | **High** | CWE-345 | `intake.ts:12–32` |
| SAST-003 | No pagination limit ceiling (DoS/enumeration) | Medium | CWE-400 | `workItems.ts:70`, `dashboard.ts:18` |
| SAST-004 | `/metrics` endpoint publicly unauthenticated | Medium | CWE-200 | `app.ts:34` |
| SAST-005 | Missing HTTP security headers (no helmet) | Medium | CWE-16 | `app.ts` |
| SAST-006 | `<iframe>` missing `sandbox` attribute | Medium | CWE-1021 | `DebugPortalPage.tsx:10` |
| SAST-007 | No rate limiting on any endpoint | Medium | CWE-770 | `app.ts` |
| SAST-008 | Raw `err.message` returned in HTTP 500 responses | Low | CWE-209 | `workflow.ts` (multiple) |
| SAST-009 | No max-length validation on free-text fields | Low | CWE-400 | `workItems.ts:24`, `intake.ts:16` |

**Indicative Grade: B** (0 critical, 2 high — fits the `B` band in `security.config.yml`)

> ⚠️ **SAST-001 is a force-multiplier.** The absence of any authentication means every medium finding is effectively exploitable by any network-reachable caller. Pentest objectives around state machine bypass and work item enumeration are trivially achievable in the current state. `[HANDOFF → pen-tester]` on SAST-001 and SAST-002.
