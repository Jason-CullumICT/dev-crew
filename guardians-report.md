# TheGuardians Security & Compliance Report
**Run:** `run-20260608-083535` · **Date:** 2026-06-08 · **Branch:** `main`

---

## ⛔ GRADE: F — Automatic

**Trigger:** Red team confirmed **all 4 critical objectives** as live exploits against an ephemeral environment.

> Confirmed breaches require **operator decision** before any merge. Do NOT route to TheFixer — confirmed breaches require manual security review and architectural changes.

---

## Summary

| Metric | Value |
|--------|-------|
| Grade | **F** (automatic — confirmed breach of all critical objectives) |
| Critical | 2 |
| High | 10 |
| Medium | 10 |
| Low | 5 |
| Confirmed Live Exploits | **7** |
| Theoretical Findings | 21 |
| Compliance Pass Rate | **13%** (2/15 controls) |
| Red Team Objectives Achieved | **4 / 4** |

---

## Architecture Note

The pen-tester analyzed **`Source/Backend/`** (work-items API, `/api/work-items`). The red-teamer tested **`portal/`** (feature-request API, `/api/feature-requests`) via `docker-compose.test.yml`. These are **separate codebases** that independently exhibit the same vulnerability classes: no authentication, no rate limiting, no pagination enforcement, no CORS policy, no XSS sanitization, and identical dependency-management business-logic flaws.

---

## Top 3 Risks

### 1. SEC-001 — Complete Authentication & Authorization Bypass ⛔ CRITICAL · CONFIRMED
**IDs:** SAST-001 · PEN-001/002 · COMP-001/002 · RED-001

Zero authentication or authorization middleware on any endpoint in either codebase. Every state-changing operation (approve, reject, dispatch, force-approve) is accessible without credentials. The red-teamer confirmed write access on all operations anonymously. This single root vulnerability caused **all 4 red-team objectives** to be achieved.

**Confirmed exploit:** `POST /api/feature-requests/FR-0021/force-approve` with no credentials → HTTP 200, `status=approved`.

**Fix:** Add auth middleware (JWT/session) before all `/api/*` routes in both codebases. Apply RBAC to privileged operations. Single fix unblocks 7 compliance controls.

---

### 2. SEC-005 — Stored XSS ⛔ HIGH · CONFIRMED (new finding)
**IDs:** RED-006

`<script>`, `<img onerror>`, and `<svg onload>` payloads stored verbatim in the database. Any frontend rendering `title` or `description` as raw HTML executes the payload, enabling session hijacking and data exfiltration. Not predicted by the static analyzer — first surfaced by the red-teamer.

**Fix:** Server-side sanitization via DOMPurify on all text inputs. Add `Content-Security-Policy` headers as defense-in-depth.

---

### 3. SEC-002 — Docker Socket Mounted Into Orchestrator ⛔ CRITICAL · THEORETICAL
**IDs:** SAST-006

`/var/run/docker.sock` bind-mounted into the orchestrator container grants full Docker daemon access — equivalent to root on the host. Combined with SAST-005 (containers run as root) and SAST-007 (host credentials mounted), a compromised orchestrator can escape to the host and exfiltrate Anthropic API credentials.

**Fix:** Accept as architectural trade-off; add non-root USER to Dockerfiles, restrict network access, consider Docker socket proxy.

---

## All Confirmed Breaches

| ID | Title | Severity | Objective |
|----|-------|----------|-----------|
| RED-001 / SEC-001 | Complete Authentication Bypass | Critical | All 4 objectives root cause |
| RED-002 / SEC-003 | Phantom Blocker — Permanent Block via Hard Delete | High | Soft-delete access/modify |
| RED-003 / SEC-004 | 'denied' Not in RESOLVED_STATUSES — Cascade Failure | High | Malformed verdict bypass |
| RED-005 / SEC-014 | Pagination Not Enforced — Full Dataset Exposed | Medium | Enumerate without pagination |
| RED-006 / SEC-005 | Stored XSS | High | (new finding) |
| RED-004 / SEC-013 | Unauthenticated Prometheus Metrics | Medium | — |
| RED-007 / SEC-015 | CORS — Cross-Origin Mutations Committed | Medium | — |
| RED-008 / SEC-016 | No Rate Limiting | Medium | — |

---

## Compliance

**Pass rate: 13% (2/15)**. All failures cascade from the missing authentication layer.

| Framework | Control | Result |
|-----------|---------|--------|
| SOC2-Type2 | CC6.1 Logical access security | ❌ FAIL |
| SOC2-Type2 | CC6.2 New access authorization | ❌ FAIL |
| SOC2-Type2 | CC6.3 Access revocation | ❌ FAIL |
| SOC2-Type2 | CC7.1 Change detection / audit logging | ⚠ PARTIAL |
| SOC2-Type2 | CC8.1 Change management | ✅ PASS |
| OWASP-ASVS L2 | V2.1 Authentication fundamentals | ❌ FAIL |
| OWASP-ASVS L2 | V4.1.1 Server-side access control | ❌ FAIL |
| OWASP-ASVS L2 | V4.1.2 Server-controlled attributes | ❌ FAIL |
| OWASP-ASVS L2 | V4.1.3 Principle of least privilege | ❌ FAIL |
| OWASP-ASVS L2 | V4.2 Operation level access control | ❌ FAIL |
| OWASP-ASVS L2 | V5.1 Input validation | ⚠ PARTIAL |
| OWASP-ASVS L2 | V7.1 Log content (audit events) | ⚠ PARTIAL |
| OWASP-ASVS L2 | V8.1 General data protection | ✅ PASS |
| OWASP-ASVS L2 | V9.1 Communications security (TLS) | ❌ FAIL |
| OWASP-ASVS L2 | V14.4 HTTP security headers | ❌ FAIL |

**Fastest path to compliance uplift:**
1. Add auth middleware → unblocks 7 controls at once → reaches ~60% (Grade C floor)
2. `app.use(helmet())` → fixes all 5 header controls in one line
3. Add structured `event_type` to logger and emit 3 missing audit event types

---

## Priority Remediation Roadmap

| Priority | Action | Findings |
|----------|--------|----------|
| **P1 — Immediate** | Add authentication + RBAC to both codebases | SEC-001 |
| **P1 — Immediate** | Server-side XSS sanitization on all text inputs | SEC-005 |
| **P2 — This sprint** | Fix dependency FK cascade on delete; add 'denied'/'rejected' to RESOLVED_STATUSES | SEC-003, SEC-004 |
| **P2 — This sprint** | `app.use(helmet())` | SEC-019 |
| **P3 — Next sprint** | Rate limiting + SQL pagination enforcement | SEC-014, SEC-016 |
| **P3 — Next sprint** | Webhook HMAC signature verification | SEC-008 |
| **P3 — Next sprint** | Non-root USER in Dockerfiles; Docker secrets for credentials | SEC-009, SEC-010 |
| **P4 — Backlog** | TLS, audit events, hard delete, backup/recovery, CORS headers | SEC-011/12/15/26/27 |

---

## Full Report Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-06-08-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-06-08.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*Posted by TheGuardians · `run-20260608-083535`*
