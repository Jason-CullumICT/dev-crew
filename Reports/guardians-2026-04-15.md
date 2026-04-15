# TheGuardians Security Report — 2026-04-15

**Run ID:** `run-20260415-021848`  
**Grade: D**  
**Target:** dev-crew Source App (Workflow Engine Backend + Frontend)

---

## Summary

| | Count |
|---|---|
| 🔴 Critical (confirmed breach) | 0 |
| 🟠 High (theoretical exploit chain) | 9 |
| 🟡 Medium (SAST / compliance gap) | 10 |
| 🟢 Low (best-practice issue) | 3 |
| **Total findings** | **22** |
| Confirmed breaches | 0 |
| Theoretical findings | 22 |
| OWASP-ASVS L2 compliance pass rate | 10.5% (2 / 19) |
| SOC2-Type2 compliance pass rate | 0% full, 40% partial |
| Red-team objectives achieved | 0 / 4 (Phase 2 not executed) |

---

## Grading Rationale

```
Grade A: 0 Critical, ≤ 2 High, ≥ 90% compliance  → ❌ (9 High, 8.3% compliance)
Grade B: 0 Critical, ≤ 6 High, ≥ 75% compliance  → ❌ (9 High, 8.3% compliance)
Grade C: ≤ 1 Critical, ≤ 12 High, ≥ 60% compliance → ❌ (8.3% compliance)
Grade D: ≤ 2 Critical                              → ✅ (0 confirmed Criticals)
Grade F: confirmed red-team breach                 → Not applicable (Phase 2 aborted)
```

**Result: Grade D.** No Critical findings exist (Critical requires RED-ID confirmed breach; Phase 2 produced no RED-ID findings). 9 High theoretical findings. Compliance pass rate (8.3%) is far below every minimum threshold through Grade C.

> **Important:** All 9 High findings have trivially exploitable paths per pen-tester analysis. The grade would be **F** on a re-run once the red-teamer is correctly sequenced after the pen-tester — PEN-002 and PEN-003 provide one-call state-machine bypasses with 100% theoretical success rate.

---

## Phase 2 — Red Team Status

**Phase 2: Not executed — red-teamer aborted pre-flight (sequencing issue).**

The red-teamer ran before the pen-tester had written `Teams/TheGuardians/artifacts/attack-surface-map.md`. Its pre-flight gate correctly rejected the run. The pen-tester subsequently wrote the map with 14 PEN-ID findings.

**For next run:** Ensure pen-tester (Phase 1) completes and confirms the attack surface map exists before dispatching the red-teamer (Phase 2).

**Additional finding from red-teamer pre-flight:** The running container serves the **dev-crew feature portal** (a different application) rather than the workflow engine analyzed statically. `security.config.yml` `critical_entry_points` and `objectives` need to be updated to the actual live routes before the next red-team run. The `/api/orchestrator/*` reverse proxy is a potential SSRF pivot point.

---

## Top Findings (High Severity)

| ID | Title | Specialist(s) |
|----|-------|--------------|
| MERGED-001 | **Zero Authentication on All API Endpoints** | pen-tester, static-analyzer, compliance-auditor |
| PEN-002 | **Fast-Track Route Override Bypasses Entire Assessment Pod** | pen-tester |
| PEN-003 | **Manual Approve Endpoint Bypasses Assessment Pod — No Auth** | pen-tester |
| MERGED-002 | **Intake Webhooks: No HMAC Verification + Unvalidated Enums** | pen-tester, static-analyzer, compliance-auditor |
| MERGED-003 | **Unbounded Pagination Enables Full Dataset Enumeration** | pen-tester, static-analyzer, compliance-auditor |
| PEN-007 | **Cascade Auto-Dispatch Bypasses Team Validation** | pen-tester |
| COMP-002 | **No TLS — All Traffic Transmitted in Cleartext** | compliance-auditor |
| COMP-006 | **3 of 4 Required Audit Events Missing** | compliance-auditor |
| COMP-009 | **No GDPR-Compliant Hard-Delete (Right to Erasure)** | compliance-auditor |

---

## Key Clean Areas

- No hardcoded secrets in first-party code ✅
- No SQL/NoSQL injection surface (in-memory store) ✅
- No `eval` / dynamic code execution ✅
- No `dangerouslySetInnerHTML` / XSS sinks in React ✅
- UUID v4 generation via cryptographically safe library ✅
- State machine enforces valid transitions ✅
- Change history audit trail on all state transitions ✅
- Structured JSON logging with no PII leakage ✅

---

## Artifacts

| Artifact | Path |
|----------|------|
| Full HTML report | `Teams/TheGuardians/findings/security-report-2026-04-15-D.html` |
| Findings backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-04-15.json` |
| Attack surface map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

## Recommended Next Steps

1. **Immediate (before any exposure):** Implement authentication middleware (MERGED-001). This single fix neutralizes the exploit precondition for all 9 High findings.
2. **Critical business logic:** Fix PEN-002 (fast-track override privilege check) and PEN-003 (manual approve role restriction).
3. **Infrastructure:** Enable TLS termination (COMP-002).
4. **Re-run Phase 2:** After MERGED-001 is fixed, re-dispatch the red-teamer in correct sequence (pen-tester first) against an ephemeral environment. Update `security.config.yml` to reflect the actual running application.

> Route unconfirmed theoretical findings to **TheFixer** backlog via `Teams/TheFixer/team-leader.md`.
