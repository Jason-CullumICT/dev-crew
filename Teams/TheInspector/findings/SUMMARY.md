# TheInspector Dependency Audit Summary — 2026-05-24

## Quick Status

| Metric | Value | Status |
|--------|-------|--------|
| **Overall Grade** | **C** | ⚠️ Actionable issues |
| **Critical CVEs** | 3 | 🔴 Require immediate fix |
| **High CVEs** | 5 | 🟠 Fix within 1 week |
| **Moderate CVEs** | 35+ | 🟡 Fix in 2-4 weeks |
| **Total Vulnerabilities** | 43+ | Action required |

---

## Critical Issues (Must Fix Now)

### 1. Handlebars JavaScript Injection (Source/Backend)
- **CVE:** Multiple (GHSA-2qvq-rjwj-gvw9, GHSA-2w6w-674q-4c4q, and 6 others)
- **CVSS:** 8.1-9.8
- **Impact:** JavaScript injection via template manipulation
- **Fix:** `npm update handlebars` → ≥4.7.9
- **Timeline:** 24-48 hours

### 2. Protobufjs Arbitrary Code Execution (Orchestrator + Portal Backend)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CVSS:** 9.8 (Network, no auth)
- **Impact:** Remote code execution
- **Status:** ⚠️ Unconfirmed if actually used (transitive)
- **Action:** 
  1. Verify with `npm ls protobufjs`
  2. If used, update to ≥7.5.5 immediately
  3. If not used, remove from lock file
- **Timeline:** 24 hours to verify, immediate if confirmed

---

## High-Priority Issues (Fix This Week)

### 3. OpenTelemetry SDK Prometheus Exporter DoS (Portal Backend)
- **CVE:** GHSA-q7rr-3cgh-j5r3
- **CVSS:** 7.5
- **Impact:** Crash via malformed HTTP request
- **Fix:** `npm update @opentelemetry/sdk-node` → ≥0.217.0
- **Timeline:** 1 week; coordinate with observability team

### 4. Path-to-Regexp ReDoS (Orchestrator + Portal Backend)
- **CVE:** GHSA-37ch-88jc-xwx2
- **CVSS:** 7.5
- **Impact:** CPU exhaustion via crafted URLs
- **Fix:** `npm update express path-to-regexp`
- **Timeline:** 1 week; include ReDoS fuzzing tests

---

## Medium-Priority Issues (Fix in 2-4 Weeks)

- **Express / qs**: Parameter parsing vulnerabilities (moderate)
- **Brace-expansion**: DoS via malformed patterns (moderate, low likelihood)
- **Vite / Vitest / esbuild**: Build-time path traversal (dev-time only)
- **PostCSS**: XSS in CSS output (dev-time, unlikely)
- **WebSocket**: Memory leak (minor)

**Bundle Update Command:**
```bash
npm update
```

---

## Detailed Findings

See [`DEP-AUDIT-20260524.md`](./DEP-AUDIT-20260524.md) for complete findings with:
- Full CVE descriptions and links
- Risk assessments per project
- Root cause analysis
- Detailed remediation steps
- Cross-team escalation notes

---

## Projects Audited

| Project | Status | Issues |
|---------|--------|--------|
| Source/Backend | ⚠️ Needs Fix | 1 critical, 5 moderate |
| Source/Frontend | 🟡 Minor | 7 moderate (dev-time) |
| Source/E2E | ✅ Clean | 0 |
| platform/orchestrator | 🔴 Needs Fix | 1 critical, 1 high, 6 moderate |
| portal/Backend | 🔴 Needs Fix | 1 critical, 3 high, 11 moderate |
| portal/Frontend | 🟡 Minor | 1 high, 6 moderate (dev-time) |

---

## Remediation Checklist

### Immediate (24-48 hours)
- [ ] Backend: Update handlebars
- [ ] Verify protobufjs usage (orchestrator + portal/backend)
- [ ] If protobufjs confirmed: Update to ≥7.5.5

### This Week
- [ ] Portal/Backend: Update @opentelemetry/sdk-node
- [ ] All projects: Update express + path-to-regexp
- [ ] Test ReDoS resistant after express update

### Next 2-4 Weeks
- [ ] Update remaining moderate CVEs
- [ ] Run full test suite after all updates
- [ ] Consider dependency reduction in portal/Backend (120 transitive deps)

---

## Files Generated

- `DEP-AUDIT-20260524.md` — Full detailed audit report
- `dep-audit-20260524.json` — Machine-readable metrics
- `Teams/TheInspector/learnings/dependency-auditor.md` — Persistent findings history

---

## Notes

- **No GPL/AGPL violations** — all dependencies are MIT/Apache 2.0/BSD compatible
- **No abandoned packages** — all flagged packages are actively maintained
- **Supply chain risk elevated** — portal/Backend has 120 transitive dependencies (>100 threshold)

---

**Audit Date:** 2026-05-24  
**Next Scheduled Audit:** 2026-06-24  
**Agent:** dependency_auditor (Haiku model)
