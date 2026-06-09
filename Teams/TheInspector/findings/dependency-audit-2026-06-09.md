# Dependency Auditor Findings
**Date:** 2026-06-09  
**Grade:** C (Critical + High CVE present)

---

## Summary

| Metric | Backend | Frontend | E2E | Total |
|--------|---------|----------|-----|-------|
| Direct Dependencies | 4 | 3 | 1 | 8 |
| Total Transitive | 102 | 9 | 4 | 115+ |
| Critical CVEs | 1 | 1 | 0 | **2** |
| High CVEs | 0 | 0 | 0 | **0** |
| Moderate CVEs | 5 | 8 | 0 | **13** |
| Outdated (1+ major) | 3 | 2 | 0 | **5** |

---

## Critical Findings

### DEP-001: Handlebars JavaScript Injection Vulnerability (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Affected Packages:** `handlebars` v4.0.0 - v4.7.8 (transitive via `express`)
- **Module:** Source/Backend
- **CVEs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) — JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1) — JavaScript Injection via @partial-block tampering
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7) — Prototype Pollution → XSS
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8) — Missing __lookupSetter__ blocklist
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1) — JavaScript Injection via dynamic partial objects
  - GHSA-9cx6-37pm-9jff (CVSS 7.5) — DoS via Malformed Decorator Syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2) — JavaScript Injection in CLI Precompiler
  - GHSA-442j-39wm-28r2 (CVSS 3.7) — Property Access Validation Bypass

**Detail:**  
Handlebars template engine has **8 separate vulnerabilities** spanning code injection (RCE), prototype pollution, DoS, and access control bypasses. The most critical issue (CVSS 9.8) allows arbitrary code execution through AST type confusion.

**Why This Matters:**  
While Backend code does NOT directly use Handlebars, it's a transitive dependency from Express. If Express ever renders templates using Handlebars, or if a dev tool in the pipeline does, this creates an RCE surface.

**Dependency Path:**  
```
express@4.18.2 → ... → handlebars@4.x
```

**Fix:**  
- Upgrade `express` to **4.22.2** (latest stable in v4 line)
- **OR** upgrade to `express@5.2.1` if breaking changes are acceptable
- Currently: `express@4.18.2` → Wanted: `4.22.2` → Latest: `5.2.1`

---

### DEP-002: Vitest UI Server Arbitrary File Read/Execute (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE
- **Affected Package:** `vitest` v0-v3.2.5
- **Module:** Source/Frontend
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Range:** `<3.2.6`

**Detail:**  
When Vitest UI server listens (dev/test environment), **any file on the system can be read and executed**. This is a network-accessible RCE vulnerability during development.

**Why This Matters:**  
Frontend developers run `npm test` and the UI server (http://localhost:5173 or similar) becomes a public gadget. An attacker on the network or via compromise of localhost could:
- Read `.env` files, secrets, SSH keys
- Execute arbitrary code via the test harness

**Current Version:** `vitest@2.0.5` → Fix: `≥3.2.6`

**Fix:**  
```bash
cd Source/Frontend
npm update vitest
```

---

## High-Severity Findings

### DEP-003: UUID Buffer Bounds Check Missing (MODERATE → BORDERLINE HIGH)
- **Severity:** P2 (Moderate, but impacts both Backend and Dev)
- **Category:** CVE
- **Affected Package:** `uuid` v1-v11.0.0 (currently at 9.0.0)
- **Module:** Source/Backend
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Range:** `<11.1.1`

**Detail:**  
Missing buffer bounds check when `buf` parameter is provided to v3/v5/v6 UUID generation. An attacker providing a small buffer could cause a buffer overflow, leading to **data corruption or information disclosure**.

**Why This Matters:**  
Backend uses `uuid@9.0.0` directly (production). If the application ever calls v3, v5, or v6 generation with user-controlled `buf`, this is exploitable.

**Current:** `uuid@9.0.0` → Wanted: `9.0.1` → Latest: `14.0.0`

**Fix (Conservative):**  
```bash
cd Source/Backend
npm update uuid  # 9.0.0 → 9.0.1
```

**Fix (Aggressive):**  
```bash
npm install uuid@14.0.0  # Major version bump required
```

---

## Moderate Vulnerabilities Summary

### Backend (5 moderate CVEs)

| Package | CVE | Issue | Fix |
|---------|-----|-------|-----|
| qs | GHSA-q8mj-m7cp-5q26 | DoS: qs.stringify crashes on null/undefined in arrays | `npm update qs` |
| body-parser | (via qs) | Transitive from qs | Update qs upstream |
| express | (via qs) | Transitive from qs | Update qs in express |
| brace-expansion | GHSA-f886-m6hf-6m8v | Zero-step sequence hangs process | `npm update brace-expansion` (if direct) |

**Note:** `brace-expansion` is a CLI tool dependency and rarely used in production Express.

### Frontend (8 moderate CVEs)

| Package | CVE | Issue | Fixable |
|---------|-----|-------|---------|
| react-router-dom | GHSA-2j2x-hqr9-3h42 | Same-origin redirect open redirect | ✓ Yes, `npm update` |
| vite | GHSA-4w7w-66w2-5vf9 | Path traversal in `.map` handling | ✗ Requires v8.0+ (major) |
| esbuild | GHSA-67mh-4wv8-2f99 | Dev server CORS bypass | ✗ Requires vite v8+ |
| postcss | GHSA-qx2v-qp2m-jg93 | XSS via unescaped `</style>` | ✓ Yes, `npm update` |
| ws | GHSA-58qx-3vcg-4xpx | Uninitialized memory disclosure | ✓ Yes, `npm update` |
| vitest | (6 transitive) | All require vitest major upgrade | ✗ Needs v4.1.8+ |

---

## Outdated Major Versions

### Backend

| Package | Current | Wanted | Latest | Behind | Risk |
|---------|---------|--------|--------|--------|------|
| pino | 8.17.0 | 8.21.0 | 10.3.1 | 2 major | P3 - May have security patches |
| express | 4.18.2 | 4.22.2 | 5.2.1 | 1 major | P3 - Security patches in 4.22.2 |
| uuid | 9.0.0 | 9.0.1 | 14.0.0 | 5 major | P2 - **CVE-vulnerable (see DEP-003)** |

### Frontend

| Package | Current | Wanted | Latest | Behind | Risk |
|---------|---------|--------|--------|--------|------|
| react | 18.3.1 | 18.3.1 | 19.2.7 | 1 major | P4 - v18 still supported |
| react-dom | 18.3.1 | 18.3.1 | 19.2.7 | 1 major | P4 - v18 still supported |
| react-router-dom | 6.26.0 | 6.30.4 | 7.17.0 | 1 major | P3 - Has CVE in current version |

**Recommendation:**
- **UUID (Backend):** Urgent. Security vulnerability. Update to ≥11.1.1 or ≥9.0.1 minimum.
- **Express (Backend):** High. Upgrade to 4.22.2 (patch) or 5.2.1 (major).
- **Pino (Backend):** Medium. 2 major versions behind. Check changelog for security patches.
- **React-Router-DOM (Frontend):** Medium. Has CVE (open redirect). Upgrade to 6.30.4+.
- **React/React-DOM (Frontend):** Low. v18 still actively supported. No urgent security drivers.

---

## Supply Chain & Dependency Complexity

### Dependency Tree Size
| Project | Direct | Transitive | Total | Assessment |
|---------|--------|------------|-------|------------|
| Backend | 4 | 102 | 106 | ✓ Healthy (small dependency footprint) |
| Frontend | 3 | 9 | 12 | ✓ Very clean (mostly React + Router) |
| E2E | 1 | 4 | 5 | ✓ Minimal |

**No red flags:** Total transitive dependency count is well under 500 (supply chain risk threshold).

### Post-Install Scripts
Backend `package.json` has **no** `scripts.postinstall` — ✓ Good.  
Frontend `package.json` has **no** `scripts.postinstall` — ✓ Good.

### Package Ownership & Maintenance

All flagged packages are **widely maintained, non-abandoned libraries**:
- `express` — Pillar of Node.js ecosystem
- `uuid` — Core utility, actively maintained
- `react` — Industry standard, backed by Meta
- `vitest` — Active Vite ecosystem, regular updates

**No abandoned dependency warnings.**

---

## License Compliance

**Backend Direct Dependencies:**
- `express` — MIT ✓
- `prom-client` — Apache 2.0 ✓
- `uuid` — MIT ✓
- `pino` — MIT ✓

**Frontend Direct Dependencies:**
- `react` — MIT ✓
- `react-dom` — MIT ✓
- `react-router-dom` — MIT ✓

**Assessment:** ✓ **No license risks.** All MIT or Apache 2.0 (permissive).

---

## Cross-References

- **[CROSS-REF: red-teamer]** — Handlebars RCE (DEP-001) and Vitest file read (DEP-002) are exploitable if an attacker gains localhost/network access
- **[CROSS-REF: security-review]** — Both P1 CVEs should be escalated to TheGuardians for exploitation risk assessment

---

## Remediation Priority

### 🔴 P1 — Do This Now (Before Any Release)
1. **DEP-002 (Vitest):** `cd Source/Frontend && npm update vitest` → `≥3.2.6`
2. **DEP-003 (UUID):** `cd Source/Backend && npm update uuid` → `≥11.1.1`

### 🟠 P2 — Do This This Sprint
3. **DEP-001 (Handlebars):** `cd Source/Backend && npm update express` → `4.22.2`

### 🟡 P3 — Do This Next Sprint
4. **Frontend CVEs:** `npm update react-router-dom postcss ws`
5. **Backend outdated:** `npm update pino` (check changelog for security)

---

## Command Summary

```bash
# Backend fixes (in Source/Backend/)
npm update uuid prom-client express pino

# Frontend fixes (in Source/Frontend/)
npm update vitest react-router-dom postcss ws

# Verify audit passes
npm audit
```

---

## Audit Tool Output

**Backend audit metadata:**
- Tool: `npm audit` v10.x
- Critical: 1 (Handlebars)
- High: 0
- Moderate: 5 (qs, brace-expansion, uuid, body-parser via qs)
- Low: 0
- Total: 6 vulnerabilities

**Frontend audit metadata:**
- Tool: `npm audit` v10.x
- Critical: 1 (Vitest UI server)
- High: 0
- Moderate: 8 (vite, esbuild, vitest transitive, postcss, react-router, ws, @vitest/mocker, vite-node)
- Low: 0
- Total: 9 vulnerabilities

**E2E:** Clean (Playwright has no known CVEs)

---

## Grade Justification

**Grade: C** (Max P1: 0, Max P2: 8 per config, actual: 2 P1s)
- 2 Critical/High CVEs present → Grade drops to C
- All fixable through `npm update` or minor version bumps
- No GPL/AGPL license risks
- No abandoned dependencies
- Supply chain complexity within limits

**Path to Grade B:**
- Fix both P1 CVEs (Handlebars → express@4.22.2, Vitest → ≥3.2.6)
- Resolve remaining P2 (UUID → ≥11.1.1)
- Grade will improve to B once security audit passes

---

## Self-Learning Notes

**For next audit run:**
- UUID v9.0.0 is a known "CVE vector" — always flag this series as needing ≥9.0.1
- Handlebars is a transitive dependency via Express; always check Express transitive tree
- Vitest major versions have historically had security gaps; upgrade frequently
- All vulnerabilities in this audit are npm-fixable; no source code patches needed
