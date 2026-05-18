The dashboard run ID isn't registered (expected for a standalone invocation — the orchestrator registers runs). The artifact is written. Here's a summary of what was produced:

---

## Attack Surface Map Complete

**File:** `Teams/TheGuardians/artifacts/attack-surface-map.md`
**Learnings updated:** `Teams/TheGuardians/learnings/pen-tester.md`

### Findings (13 total)

| ID | Severity | Title |
|----|----------|-------|
| PEN-001 | **Critical** | Entire API unauthenticated — no auth or authorization anywhere |
| PEN-002 | **Critical** | Unauthenticated fast-track override → state machine bypass direct to `Approved` |
| PEN-003 | **Critical** | Intake webhooks — no HMAC verification + unvalidated enum injection |
| PEN-004 | High | Cascade dispatch manipulation via unauthenticated blocker rejection |
| PEN-005 | High | Unbounded + negative pagination (`limit=-1` dumps all items; `limit=999999999` full dump) |
| PEN-006 | High | Soft-deleted blocker creates permanent dispatch DoS via stale link |
| PEN-007 | High | Prometheus `/metrics` endpoint exposed without auth (info disclosure) |
| PEN-008 | Medium | Assessment flaw — `NeedsClarification` verdict hard-rejects items instead of holding |
| PEN-009 | Medium | No input length validation on title/description/reason fields |
| PEN-010 | Medium | Missing CORS policy |
| PEN-011 | Medium | Sequential/predictable docIds (`WI-001`, `WI-002`…) — enumeration oracle |
| PEN-012 | Low | Audit reason field — no sanitization (stored XSS risk if ever rendered as HTML) |
| PEN-013 | Low | `/api/search` endpoint not implemented — future attack surface (ReDoS risk) |

### Key Red Team Attack Chains Documented

1. **Fast-track bypass chain** (2 API calls → item in-progress, full assessment pod skipped)
2. **Cascade dispatch manipulation** (5-step chain → force dispatch any approved dependent)
3. **Permanent dispatch DoS** (3-step chain → render any item permanently undispatchable via stale deleted-blocker reference)

Each finding includes exact HTTP payloads and step-by-step exploit paths ready for the `red-teamer` to execute dynamically.
