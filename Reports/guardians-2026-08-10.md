# TheGuardians Security & Compliance Report — 2026-08-10

## Grade: F 🔴

> **Automatic F** — All four pentest objectives achieved by the red-team with zero credentials. Two Critical breaches confirmed live (including a net-new file exfiltration not predicted by the pen-tester). **Operator decision required before any merge or deployment.**

---

## Summary

| Metric | Result |
|--------|--------|
| **Grade** | **F** |
| Critical findings | 2 (both confirmed live) |
| High findings | 9 (3 confirmed, 6 theoretical) |
| Medium findings | 7 (1 confirmed, 6 theoretical) |
| Low findings | 5 (all theoretical) |
| **Confirmed breaches** | **6** |
| Theoretical findings | 17 |
| Compliance pass rate | **13%** (2/17 controls) |
| Pentest objectives achieved | **4/4** |

---

## Top 3 Risks

### 1. No Authentication — AI Assessment Pipeline Completely Bypassed (Confirmed Critical)
**IDs:** SAST-001 · PEN-001 · COMP-001 · RED-001

Zero authentication or authorization middleware exists anywhere in the application. The red-team confirmed a three-request exploit chain that moves any item from `potential → voting → approved` with no credentials, bypassing the entire AI voting pipeline.

**Live exploit:**
```
POST /api/feature-requests               → create item
PATCH /:id {"status":"voting"}           → move to voting
POST  /:id/force-approve                 → approved — zero agent votes, zero auth
```

**Fix:** Add JWT/API-key auth middleware in `app.ts` before all route registrations. Define roles and enforce role checks on all state-mutation endpoints.

---

### 2. Arbitrary File Upload + Public Exfiltration — `/etc/passwd` Live (Confirmed Critical)
**IDs:** RED-002 (net new — not predicted by pen-tester)

The `multer` handler trusts the attacker-controlled `Content-Type` header, not actual file magic bytes. Any file can be uploaded and is immediately served publicly at a predictable URL.

**Live exploit:**
```
Upload /etc/passwd with Content-Type: image/jpeg → HTTP 200
GET http://localhost:3001/uploads/6939ae6b…jpg   → /etc/passwd contents live
Upload <?php system($_GET["cmd"]); ?>            → PHP shell at public URL
```

**Fix:** Validate magic bytes (not MIME header) via `file-type` package. Store uploads outside web root. Gate `/uploads/` behind authentication.

---

### 3. Webhook Spoofing — No Signature Verification + No Enum Validation (Theoretical High)
**IDs:** SAST-002 · PEN-003 · PEN-004 · COMP-008

`/api/intake/zendesk` and `/api/intake/automated` accept any POST without proving origin. Arbitrary `type`/`priority` strings can be injected into the work-item store.

**Fix:** Validate `X-Zendesk-Webhook-Signature` via `crypto.timingSafeEqual(HMAC-SHA256(...))`. Validate enums. Require bearer token on automated endpoint.

---

## All Confirmed Breaches (Red Team)

| ID | Title | Severity | Objective |
|----|-------|----------|-----------|
| RED-001 | Unauthenticated Force-Approve — AI pipeline skipped | Critical | Objectives 1 & 3 |
| RED-002 | Arbitrary file upload + `/etc/passwd` exfiltration | Critical | Net new |
| RED-003 | Ghost dependency permanent DoS | High | Objective 2 |
| RED-004 | Unauthenticated deny sabotage — terminal state | High | Related to objective 1 |
| RED-005 | Full dataset enumeration via `?limit=999999` | High | Objective 4 |
| RED-006 | Unauthenticated Prometheus `/metrics` | Medium | — |

---

## Consolidated Findings by Severity

### Critical (2 — both confirmed)

| Merged ID | Title | Source IDs | Status |
|-----------|-------|------------|--------|
| MERGED-C01 | No Authentication — AI Pipeline Bypass | SAST-001, PEN-001, COMP-001, RED-001 | Confirmed (Live Exploit) |
| RED-002 | Arbitrary File Upload + Public Exfiltration | RED-002 | Confirmed (Live Exploit) |

### High (9 — 3 confirmed, 6 theoretical)

| Merged ID | Title | Source IDs | Status |
|-----------|-------|------------|--------|
| MERGED-H01 | No Pagination Limit — Full Dataset Dump | SAST-004, PEN-005, COMP-004, RED-005 | Confirmed |
| MERGED-H02 | Ghost Dependency Permanent DoS | PEN-009, RED-003 | Confirmed |
| MERGED-H03 | Unauthenticated Deny/Approve Sabotage | PEN-007, RED-004 | Confirmed |
| PEN-002 | Fast-Track Override Bypasses Assessment Pod | PEN-002 | Theoretical |
| MERGED-H05 | Webhook Spoofing + No Enum Validation | SAST-002, PEN-003, PEN-004, COMP-008 | Theoretical |
| PEN-006 | Cascade Auto-Dispatch Logic Manipulation | PEN-006 | Theoretical |
| COMP-002 | No TLS/HTTPS Enforcement | COMP-002 | Theoretical |
| COMP-005 | Required Audit Events Not Emitted | COMP-005 | Theoretical |
| COMP-004 | No Rate Limiting on Any Endpoint | COMP-004 | Theoretical |

### Medium (7 — 1 confirmed, 6 theoretical)

| ID | Title | Status |
|----|-------|--------|
| MERGED-M01 | Unauthenticated Prometheus `/metrics` | Confirmed |
| MERGED-M02 | Internal Error Messages in HTTP 500 Responses | Theoretical |
| MERGED-M03 | Missing HTTP Security Headers (CSP, HSTS, CORS, X-Frame-Options) | Theoretical |
| SAST-006 | Unsandboxed `<iframe>` in DebugPortalPage | Theoretical |
| COMP-009 | Audit Logs Lack Caller Identity + Request IDs | Theoretical |
| COMP-010 | Audit Logs Not Durably Persisted | Theoretical |

### Low (5 — all theoretical)

| ID | Title |
|----|-------|
| SAST-008 | Unused `pino` production dependency |
| COMP-011 | Soft-Delete Only — No GDPR Hard-Delete |
| PEN-011 | Negative pagination parameters |
| PEN-012 | No length limits on free-text fields |
| PEN-013 | Missing `/api/search` endpoint referenced by frontend |

---

## Compliance Matrix Summary

| Framework | Controls Assessed | Pass | Fail | Partial |
|-----------|------------------|------|------|---------|
| SOC2-Type2 | CC6.1, CC6.2, CC6.3, CC7.1, CC8.1 | 0 | 4 | 1 (CC8.1) |
| OWASP-ASVS L2 | 12 controls | 1 (N/A) | 9 | 1 (ASVS 7.4.1) |

**Pass rate: 13%** (minimum for Grade C: 60%)

Notable failures:
- **CC6.1/6.2/6.3** — No access controls, no user management, no RBAC (MERGED-C01)
- **CC7.1** — No durable audit log, no structured audit events (COMP-005, COMP-009, COMP-010)
- **ASVS 9.1.1** — No TLS (COMP-002)
- **ASVS 14.4.1** — No security headers (MERGED-M03)

---

## Grading Rationale

| Criterion | Threshold | Actual | Meets? |
|-----------|-----------|--------|--------|
| Grade A | 0 Critical, ≤2 High, ≥90% compliance | 2 Critical, 9 High, 13% | No |
| Grade B | 0 Critical, ≤6 High, ≥75% compliance | 2 Critical, 9 High, 13% | No |
| Grade C | ≤1 Critical, ≤12 High, ≥60% compliance | 2 Critical, 9 High, 13% | No |
| Grade D | ≤2 Critical | 2 Critical but 13% compliance | No |
| **Grade F** | Any confirmed red-team breach of a critical objective | **4/4 objectives breached** | Automatic |

---

## Priority Remediation Roadmap

| Priority | Action | Findings Resolved |
|----------|--------|-------------------|
| **P0 — Blocks prod** | Implement authentication middleware + RBAC in `app.ts` | MERGED-C01, MERGED-H03, PEN-002, PEN-006, COMP-005 (partial) |
| **P0 — Blocks prod** | Fix file upload MIME validation (magic bytes); gate `/uploads/` behind auth | RED-002 |
| **Sprint 1** | Add `helmet` + `cors`; enforce max pagination limit (100); add rate limiting | MERGED-M03, MERGED-H01, COMP-004 |
| **Sprint 1** | Add TLS termination at reverse proxy; set HSTS header | COMP-002 |
| **Sprint 2** | Webhook HMAC verification + enum validation; gate `/metrics`; fix soft-delete orphan | MERGED-H05, MERGED-M01, MERGED-H02 |
| **Sprint 2** | Add requestId correlation to all logs; guard cascade auto-dispatch | COMP-009, PEN-006 |
| **Sprint 3** | Structured audit events; durable log forwarding | COMP-005, COMP-010 |
| **Backlog** | Hard-delete API; field length limits; remove pino; iframe sandbox; generic error responses | COMP-011, PEN-012, SAST-008, SAST-006, MERGED-M02 |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Full HTML report | `Teams/TheGuardians/findings/security-report-2026-08-10-F.html` |
| Security backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-08-10.json` |
| Attack surface map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*TheGuardians · 2026-08-10 · Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer*
