# TheInspector — System Health Audit Report

<!-- Section 1: Header -->
## 🟡 Grade: C — System Health Audit

| | |
|---|---|
| **Grade** | 🟡 **C** (Critical CVEs in dependency tree) |
| **Branch** | main |
| **Audit Date** | 2026-10-14 |
| **Scope** | Full codebase — static mode (services offline) |
| **Specialists Run** | quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⚠️ (absent — static fallback not run) · chaos-monkey ⚠️ (absent — static fallback not run) |
| **P1 Findings** | 2 |
| **P2 Findings** | 7 |
| **P3 Findings** | 5 |
| **P4 Findings** | 1 |
| **Escalations → TheGuardians** | 5 |

---

<!-- Section 2: Scorecards -->
## 2. Scorecards

| Specialist | P1 | P2 | P3 | P4 | Spec Coverage | Mode | Status |
|---|---|---|---|---|---|---|---|
| quality-oracle | 0 | 3 | 2 | 1 | 26% nominal / 94% active | static | ✅ Complete |
| dependency-auditor | 2 | 5 | 3 | 0 | N/A | static | ✅ Complete |
| performance-profiler | — | — | — | — | — | — | ⚠️ Not run |
| chaos-monkey | — | — | — | — | — | — | ⚠️ Not run |
| **TOTAL** | **2** | **7** | **5** | **1** | — | — | — |

**FIXED since prior audit:** N/A — First audit (no baseline)

---

<!-- Section 3: Executive Summary -->
## 3. Executive Summary

Five things an operator must know before the next release:

1. **🔴 Authentication-bypass CVE in production path** — `proxy-addr` (CVSS 9.1) is vulnerable to IPv4-mapped IPv6 IP spoofing in both the Backend and Orchestrator. Any IP-based access control can be circumvented by a network-adjacent attacker. **Block deployment until patched.** → `[ESCALATE → TheGuardians]`

2. **🔴 Remote Code Execution in Orchestrator gRPC** — `protobufjs` (CVSS 9.8) allows arbitrary code execution on the machine running the Orchestrator when processing crafted protobuf messages. The Orchestrator is the pipeline runtime. **Block deployment until patched.** → `[ESCALATE → TheGuardians]`

3. **🟠 Search endpoint silently broken** — `GET /api/search` is tested, spec'd (`FR-dependency-search`), and called by the `DependencyPicker` frontend component, but is **not wired into `app.ts`**. The typeahead feature silently returns nothing in production. A three-line fix unblocks it.

4. **🟠 Dependency dispatch state machine gap** — `pending_dependencies` status is required by spec (`FR-dependency-dispatch-gating`) but absent from the `WorkItemStatus` enum and `VALID_STATUS_TRANSITIONS`. The backend returns a `400` error instead of a status transition, violating the spec contract. Frontend `BlockedBadge` also lacks the amber state.

5. **🟡 796 transitive dependencies, 6 critical CVEs, 42 HIGH** — The dependency tree is deeply outdated. Vitest (CVSS 9.8 arbitrary file read) and @grpc/grpc-js (certificate validation bypass) add CI/CD and TLS risk. An emergency patch sprint is required.

---

<!-- Section 4: Scope & Environment -->
## 4. Scope & Environment

| Item | Value |
|---|---|
| **Audit mode** | Full codebase, static analysis |
| **Services checked** | backend (http://localhost:3001) — offline; frontend (http://localhost:5173) — offline |
| **Performance profiler** | Static fallback not triggered — no perf report available |
| **Chaos monkey** | Static fallback not triggered — no chaos report available |
| **Specs scanned** | `Specifications/` (109 total FRs across 3 spec files) |
| **Active specs** | FR-WF-001–013 (workflow engine) + FR-dependency-* (16 FRs) = 29 active FRs |
| **Roadmap specs** | FR-001–069 (dev-workflow-platform.md) + FR-TMP-001–010 — identified as separate portal system, not yet in `Source/` |
| **Package manifests scanned** | Source/Backend/package.json, Source/Frontend/package.json, platform/orchestrator/package.json |
| **Audit duration** | quality-oracle ~15 min, dependency-auditor ~20 min |
| **Test data** | In-memory store (no persistent data) |

**Data caveats:**
- Spec coverage of 26% includes 80 unimplemented roadmap FRs for a separate portal system. Active spec coverage is ~94%.
- No dynamic tests run; latency baselines and error-handling paths unverified until services are healthy.

---

<!-- Section 5: Trend -->
## 5. Trend

> **First audit — no baseline available.**
>
> This is the inaugural TheInspector run for this project. All findings are marked **NEW**. Next audit should be scheduled for **2026-11-14** (30-day cadence).

---

<!-- Section 6: Specialist Reports -->
## 6. Specialist Reports

### 🔵 quality-oracle — Grade: B (code quality)

| | |
|---|---|
| **Mode** | Static |
| **Verdict** | B — 0 P1s, 3 P2s, 2 P3s, 1 P4 |
| **Spec coverage** | 26% nominal / 94% on active in-flight work |
| **Architecture violations** | 0 (all 9 rules pass) |
| **Key finding** | GET /api/search endpoint tested and spec'd but not wired in app.ts |
| **Escalations** | 3 findings → TheFixer |

### 🔴 dependency-auditor — Grade: C (vulnerability density)

| | |
|---|---|
| **Mode** | Static (npm audit + package analysis) |
| **Verdict** | C — 6 Critical CVEs, 42 HIGH CVEs across 3 package manifests |
| **Total CVEs** | 68 (Critical: 6, High: 42, Moderate: 16, Low: 4) |
| **Outdated majors** | 13 packages |
| **License violations** | 0 ✅ |
| **Key finding** | proxy-addr auth bypass + protobufjs RCE in production paths |
| **Escalations** | 4 findings → TheGuardians |

### ⚠️ performance-profiler — Not run

Services were offline at audit time. Static performance checks (identified via quality-oracle) show the unbounded list endpoint and missing input validation. Recommend re-running when backend is healthy.

### ⚠️ chaos-monkey — Not run

All services offline at audit time. Static chaos scenarios (concurrent state transitions, malformed request body) flagged for next dynamic run. No dynamic fault injection was performed.

---

<!-- Section 7: Re-Verification Summary -->
## 7. Re-Verification Summary

| Finding ID | Status | Notes |
|---|---|---|
| All findings | **NEW** | First audit — no prior baseline to compare against |

---

<!-- Section 8: Cross-Reference Map -->
## 8. Cross-Reference Map

Root causes spanning multiple findings:

| Root Cause | Affected Findings | Single Fix Impact |
|---|---|---|
| **Dependency tree staleness** (796 transitive deps, no scheduled update policy) | DEP-001, DEP-003, DEP-004, DEP-005, DEP-006, DEP-007, DEP-008, DEP-009 | Implementing a monthly `npm audit fix` + major-version update sprint resolves all 8 at once |
| **Dependency feature incomplete** (FR-dependency-* implemented ~94% but missing last mile) | QO-001 (search endpoint), QO-002 (status enum), QO-003 (metrics histogram) | One sprint completing the dependency feature backlog resolves all 3 quality-oracle P2s |
| **Traceability enforcer scope gap** (enforcer only covers FR-WF-*, not all specs) | QO-005 (enforcer gap) + inflated 26% coverage metric | Expanding enforcer to scan full `Specifications/` dir resolves both the gap and the misleading metric |

---

<!-- Section 9: P1 Findings -->
## 9. P1 Findings — Block Deployment

### 🔴 DEP-001 — proxy-addr IPv4-mapped IPv6 IP Spoofing `[ESCALATE → TheGuardians]`

| | |
|---|---|
| **ID** | DEP-001 |
| **Severity** | P1 — CRITICAL |
| **CVSS** | 9.1 |
| **CVE** | GHSA-jqcg-44mw-7w3h |
| **Package** | proxy-addr 1.1.0–2.0.7 |
| **Affected dirs** | `Source/Backend/`, `platform/orchestrator/` |
| **Status** | NEW |

**Exploit scenario:** An attacker on the local network sends an HTTP request with a crafted IPv4-mapped IPv6 address (`::ffff:127.0.0.1`). The `proxy-addr` library incorrectly classifies this as a loopback address, bypassing any IP-allowlist middleware. In the orchestrator, this could allow unauthorized pipeline triggering. In the backend, it could bypass any future IP-based rate limiting or access controls.

**Impact:** Authentication/access control bypass. Severity elevated because the Orchestrator runs agent pipelines — unauthorized invocation could trigger destructive actions.

**Recommendation:**
```bash
cd Source/Backend && npm install proxy-addr@2.0.8
cd platform/orchestrator && npm install proxy-addr@2.0.8
```

Verify trust proxy configuration after update. Route to TheGuardians for penetration verification.

---

### 🔴 DEP-005 — protobufjs Arbitrary Code Execution `[ESCALATE → TheGuardians]`

| | |
|---|---|
| **ID** | DEP-005 |
| **Severity** | P1 — CRITICAL |
| **CVSS** | 9.8 |
| **CVE** | GHSA-xq3m-2v4x-88gg |
| **Package** | protobufjs < 7.5.5 |
| **Affected dirs** | `platform/orchestrator/` |
| **Status** | NEW |

**Exploit scenario:** An attacker who can control the content of protobuf messages consumed by the Orchestrator (e.g., a compromised agent reporting back via gRPC) can craft a message that triggers arbitrary code execution on the Orchestrator host machine. Since the Orchestrator runs Docker containers and manages pipeline state, RCE here constitutes full infrastructure compromise.

**Impact:** Full RCE on the Orchestrator host. Pipeline hijacking, data exfiltration, lateral movement to all containers the Orchestrator manages.

**Recommendation:**
```bash
cd platform/orchestrator && npm install protobufjs@7.5.5
```

Immediately audit protobuf message sources — ensure all gRPC inputs are validated before deserialization. Route to TheGuardians for trust-boundary analysis.

---

<!-- Section 10: Risk Matrix -->
## 10. Risk Matrix

```
Severity  │ Zero-precondition │ Authenticated │ Privileged │ Admin │ Physical
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P1        │ DEP-001           │ DEP-005       │            │       │
P2        │ DEP-007           │ DEP-003       │ DEP-009    │       │
          │                   │ QO-001        │            │       │
          │                   │ QO-002        │            │       │
          │                   │ QO-003        │            │       │
          │                   │ DEP-006       │            │       │
P3        │ DEP-008           │ DEP-002       │ QO-004     │       │
          │                   │ DEP-004       │ QO-005     │       │
P4        │                   │ QO-006        │            │       │
```

**Exploitability scale:**
- **Zero-precondition:** Any user on the network (no auth needed) — DEP-001 (IP spoofing), DEP-007 (open redirect), DEP-008 (DoS)
- **Authenticated:** Requires valid credentials or network access — DEP-005 (crafted gRPC), QO-001/002/003 (known API caller)
- **Privileged:** Requires specific access — DEP-009 (TLS MITM requires network position), DEP-003 (CI access)

---

<!-- Section 11: Spec Coverage -->
## 11. Spec Coverage

| Spec File | Total FRs | Implemented | Coverage |
|---|---|---|---|
| FR-WF-001–013 (workflow engine — enforcer-tracked) | 13 | 13 | **100%** ✅ |
| FR-dependency-* (dependency tracking feature) | 16 | 15 | **94%** ✅ |
| FR-001–069 (dev-workflow-platform.md — roadmap) | 70 | 0 | **0%** ⚠️ (roadmap) |
| FR-TMP-001–010 (tiered-merge-pipeline.md — roadmap) | 10 | 0 | **0%** ⚠️ (roadmap) |
| **TOTAL (nominal)** | **109** | **28** | **26%** |
| **TOTAL (active in-flight work only)** | **29** | **28** | **97%** |

**Top 10 uncovered requirements (active work):**
1. `FR-dependency-search` — Search endpoint not wired (`GET /api/search`) — **P2 QO-001**
2. `FR-dependency-dispatch-gating` — `pending_dependencies` status missing — **P2 QO-002**
3. `FR-dependency-metrics` — `dependencyCheckDuration` histogram absent — **P2 QO-003**
4. `FR-dependency-seed` — No seed data at startup — **P3 QO-004**
5. FR-001 through FR-069 — Entire dev-workflow-platform portal (roadmap — not yet started)
6. FR-TMP-001 through FR-TMP-010 — Tiered merge pipeline (roadmap — not yet started)

**Enforcer scope gap (P3 QO-005):** `tools/traceability-enforcer.py` scans only `Plans/self-judging-workflow/requirements.md` (13 FRs). The enforcer reports 100% coverage — technically accurate for its scope, but creates a false sense of completeness. Recommend expanding enforcer to scan all `Specifications/` files.

---

<!-- Section 12: Latency Baselines -->
## 12. Latency Baselines

> **Services were offline at audit time. No dynamic latency measurements available.**

Static analysis findings (identified by quality-oracle):

| Concern | File | Risk |
|---|---|---|
| Unbounded Map iteration on `GET /api/work-items` | `Source/Backend/src/routes/work-items.ts` | O(n) with no limit; will degrade at scale |
| Large payload serialization on list endpoint | `Source/Backend/src/routes/work-items.ts` | All work items serialized per request |
| Missing input validation on request body fields | `Source/Backend/src/routes/` | Malformed requests may cause unhandled exceptions |

**Budget thresholds (from config):**
- `GET /api/work-items`: p95 ≤ 100ms
- `GET /api/dashboard`: p95 ≤ 150ms
- All other routes: p95 ≤ 200ms, p99 ≤ 500ms

Run performance-profiler in dynamic mode when services are healthy to establish baselines.

---

<!-- Section 13: P2 Findings -->
## 13. P2 Findings

| ID | Category | Title | Location | Escalation | Status |
|---|---|---|---|---|---|
| DEP-003 | security/dep | Vitest UI Server Arbitrary File Read (CVSS 9.8) | Source/Frontend | TheGuardians | NEW |
| DEP-007 | security/dep | React Router Open Redirect via Protocol-Relative URL | Source/Frontend | TheGuardians | NEW |
| DEP-009 | security/dep | @grpc/grpc-js Crash & Certificate Validation Bypass | platform/orchestrator | TheGuardians | NEW |
| DEP-006 | dep-hygiene | Jest 33 HIGH CVEs cascade (29.7.0 → 30.5.2) | Source/Backend | TheFixer | NEW |
| QO-001 | spec-drift | GET /api/search not wired in app.ts (FR-dependency-search) | Source/Backend/src/app.ts | TheFixer | NEW |
| QO-002 | spec-drift | `pending_dependencies` status missing from type system + 400 vs transition | Source/Shared/types/workflow.ts | TheFixer | NEW |
| QO-003 | spec-drift | `dependencyCheckDuration` Histogram missing (FR-dependency-metrics) | Source/Backend/src/metrics.ts | TheFixer | NEW |

**DEP-003 detail:** Vitest UI server (if `--ui` flag used in CI) exposes arbitrary file read including `.env` files. CVSS 9.8. Fix: `npm install vitest@3.2.6` (minor bump from 2.0.5).

**DEP-007 detail:** `@remix-run/router` 1.3.0–1.23.2 allows open redirect when `to` prop contains a protocol-relative URL (`//evil.com/path`). User-facing phishing risk. Fix: upgrade `react-router-dom` to v7.x.

**DEP-009 detail:** `@grpc/grpc-js` 1.14.0–1.14.4 has certificate validation bypass — TLS connection may accept unauthorized certificates. Fix: `npm install @grpc/grpc-js@1.14.5`.

---

<!-- Section 14: Fixed Findings -->
## 14. Fixed Findings

> **First audit — no fixed findings (no prior baseline).**
>
> This section will populate on the next audit run (target: 2026-11-14) once current findings are remediated.

---

<!-- Section 15: Recommendations -->
## 15. Recommendations

### 🚫 Block Deployment (Before any release)

| Action | Finding(s) | Owner |
|---|---|---|
| Patch `proxy-addr@2.0.8+` in Backend + Orchestrator | DEP-001 | TheFixer → TheGuardians verify |
| Patch `protobufjs@7.5.5+` in Orchestrator | DEP-005 | TheFixer → TheGuardians verify |
| TheGuardians security audit of proxy-addr + protobufjs trust boundaries | DEP-001, DEP-005 | TheGuardians |

### 🏃 This Sprint

| Action | Finding(s) | Owner |
|---|---|---|
| Patch `vitest@3.2.6+` (or `@latest`) in Frontend | DEP-003 | TheFixer |
| Patch `@grpc/grpc-js@1.14.5+` in Orchestrator | DEP-009 | TheFixer |
| Patch `react-router-dom@7.x` in Frontend | DEP-007 | TheFixer |
| Wire `GET /api/search` router in `app.ts` | QO-001 | TheFixer |
| Add `PendingDependencies` to `WorkItemStatus`, implement status transition | QO-002 | TheFixer |
| Add `dependencyCheckDurationHistogram` to `metrics.ts` | QO-003 | TheFixer |

### 📅 Next Sprint

| Action | Finding(s) | Owner |
|---|---|---|
| Update Jest to v30.5.2+ (resolves 33 HIGH CVEs) | DEP-006 | TheFixer |
| Add `seedStore()` function with FR-dependency-seed data | QO-004 | TheFixer |
| Patch `handlebars` and `tinypool` (update jest/vitest) | DEP-002, DEP-004 | TheFixer |
| Patch `browserslist@4.28.7+` | DEP-008 | TheFixer |

### 📋 Backlog

| Action | Finding(s) | Owner |
|---|---|---|
| Expand traceability-enforcer to scan all `Specifications/` | QO-005 | solo-session |
| Remove `eslint-disable` suppressions in DependencyPicker + useWorkItems | QO-006 | TheFixer |
| Schedule React v19 migration | DEP-* | TheFixer (Q1 2027) |
| Implement monthly automated `npm audit` in CI pipeline | all DEP-* | solo-session |
| Decide: implement FR-001–069 portal or mark as out-of-scope in config | QO-005 | requirements-reviewer |

---

<!-- Section 16: P3/P4 Summary -->
## 16. P3/P4 Summary

| ID | Priority | Category | Title | Location | Status |
|---|---|---|---|---|---|
| DEP-002 | P3 | security/dep | Handlebars Code Injection (dev-only, CVSS 9.8) | Source/Backend | NEW |
| DEP-004 | P3 | security/dep | Tinypool Prototype Pollution RCE (dev-only, transitive) | Source/Frontend | NEW |
| DEP-008 | P3 | dep-hygiene | Browserslist DoS + Prototype Pollution (CVSS 7.5) | Source/Frontend | NEW |
| QO-004 | P3 | spec-drift | No seed data implemented (FR-dependency-seed) | Source/Backend | NEW |
| QO-005 | P3 | pattern-violation | Traceability enforcer does not scan all Specifications/ | tools/traceability-enforcer.py | NEW |
| QO-006 | P4 | pattern-violation | eslint-disable suppressions in 2 production files | Source/Frontend | NEW |

---

## Bug Backlog JSON

```json
{
  "audit_id": "inspector-2026-10-14",
  "audit_date": "2026-10-14",
  "overall_grade": "C",
  "grade_rationale": "2 P1 security CVEs (proxy-addr CVSS 9.1, protobufjs CVSS 9.8) push below B threshold (max_p1: 0). 7 P2 findings within C limit (max_p2: 15). Spec coverage 97% on active in-flight work (26% nominal including roadmap specs).",
  "specialists_run": ["quality-oracle", "dependency-auditor"],
  "specialists_absent": ["performance-profiler", "chaos-monkey"],
  "summary": {
    "p1_total": 2,
    "p2_total": 7,
    "p3_total": 5,
    "p4_total": 1,
    "total_findings": 15,
    "escalations_to_guardians": 5,
    "escalations_to_fixer": 7
  },
  "escalations": [
    {
      "id": "DEP-001",
      "priority": "P1",
      "severity": "CRITICAL",
      "cvss": 9.1,
      "cve": "GHSA-jqcg-44mw-7w3h",
      "title": "proxy-addr IPv4-mapped IPv6 IP Spoofing — Authentication Bypass",
      "package": "proxy-addr",
      "affected_versions": "1.1.0 - 2.0.7",
      "fix_version": "2.0.8+",
      "files": ["Source/Backend/package.json", "platform/orchestrator/package.json"],
      "exploit_scenario": "Network-adjacent attacker sends IPv4-mapped IPv6 address to bypass IP-based access controls",
      "route_to": "TheGuardians",
      "action": "Block deployment until patched"
    },
    {
      "id": "DEP-005",
      "priority": "P1",
      "severity": "CRITICAL",
      "cvss": 9.8,
      "cve": "GHSA-xq3m-2v4x-88gg",
      "title": "protobufjs Arbitrary Code Execution — Orchestrator RCE",
      "package": "protobufjs",
      "affected_versions": "< 7.5.5",
      "fix_version": "7.5.5+",
      "files": ["platform/orchestrator/package.json"],
      "exploit_scenario": "Crafted protobuf message from compromised gRPC client triggers RCE on Orchestrator host",
      "route_to": "TheGuardians",
      "action": "Block deployment until patched"
    },
    {
      "id": "DEP-003",
      "priority": "P2",
      "severity": "CRITICAL",
      "cvss": 9.8,
      "cve": "GHSA-5xrq-8626-4rwp",
      "title": "Vitest UI Server Arbitrary File Read — CI/CD Security",
      "package": "vitest",
      "current_version": "2.0.5",
      "fix_version": "3.2.6+",
      "files": ["Source/Frontend/package.json"],
      "exploit_scenario": "Vitest UI server in CI allows attacker to read .env files and secrets if --ui flag used",
      "route_to": "TheGuardians",
      "action": "This sprint"
    },
    {
      "id": "DEP-007",
      "priority": "P2",
      "severity": "HIGH",
      "cve": "GHSA-2j2x-hqr9-3h42",
      "title": "React Router Open Redirect via Protocol-Relative URL",
      "package": "@remix-run/router",
      "affected_versions": "1.3.0 - 1.23.2",
      "fix_version": "react-router-dom v7.x",
      "files": ["Source/Frontend/package.json"],
      "exploit_scenario": "Attacker crafts a link with protocol-relative URL that redirects users to malicious site",
      "route_to": "TheGuardians",
      "action": "This sprint"
    },
    {
      "id": "DEP-009",
      "priority": "P2",
      "severity": "HIGH",
      "cve": "GHSA-5375-pq7m-f5r2",
      "title": "@grpc/grpc-js Certificate Validation Bypass + Crash",
      "package": "@grpc/grpc-js",
      "affected_versions": "1.14.0 - 1.14.4",
      "fix_version": "1.14.5+",
      "files": ["platform/orchestrator/package.json"],
      "exploit_scenario": "MITM attacker presents unauthorized TLS certificate accepted by grpc-js; can also trigger crash",
      "route_to": "TheGuardians",
      "action": "This sprint"
    }
  ],
  "backlog": [
    {
      "id": "DEP-006",
      "priority": "P2",
      "category": "dep-hygiene",
      "title": "Jest 33 HIGH CVEs cascade — upgrade to 30.5.2",
      "package": "jest",
      "current_version": "29.7.0",
      "fix_version": "30.5.2+",
      "files": ["Source/Backend/package.json"],
      "route_to": "TheFixer",
      "action": "Next sprint"
    },
    {
      "id": "QO-001",
      "priority": "P2",
      "category": "spec-drift",
      "title": "GET /api/search not wired in app.ts — DependencyPicker silently broken",
      "spec": "FR-dependency-search",
      "file": "Source/Backend/src/app.ts",
      "recommendation": "Add searchRouter and register app.use('/api/search', searchRouter) in app.ts",
      "route_to": "TheFixer",
      "action": "This sprint"
    },
    {
      "id": "QO-002",
      "priority": "P2",
      "category": "spec-drift",
      "title": "pending_dependencies status missing from WorkItemStatus enum and state machine",
      "spec": "FR-dependency-dispatch-gating",
      "files": ["Source/Shared/types/workflow.ts", "Source/Backend/src/routes/workflow.ts", "Source/Frontend/src/components/BlockedBadge.tsx"],
      "recommendation": "Add PendingDependencies to enum and VALID_STATUS_TRANSITIONS; implement auto-transition in dispatch route; update BlockedBadge with amber state",
      "route_to": "TheFixer",
      "action": "This sprint"
    },
    {
      "id": "QO-003",
      "priority": "P2",
      "category": "spec-drift",
      "title": "dependencyCheckDuration Histogram missing from metrics.ts",
      "spec": "FR-dependency-metrics",
      "file": "Source/Backend/src/metrics.ts",
      "recommendation": "Add dependencyCheckDurationHistogram Histogram and instrument computeHasUnresolvedBlockers / isReady call paths",
      "route_to": "TheFixer",
      "action": "This sprint"
    },
    {
      "id": "DEP-002",
      "priority": "P3",
      "category": "security/dep",
      "title": "Handlebars Code Injection — dev dependency (CVSS 9.8)",
      "package": "handlebars",
      "current_version": "4.x",
      "fix_version": "4.7.10+",
      "files": ["Source/Backend/package.json"],
      "note": "Dev-only transitive dependency; auto-fixed by jest update",
      "route_to": "TheFixer",
      "action": "Next sprint (resolved by jest upgrade)"
    },
    {
      "id": "DEP-004",
      "priority": "P3",
      "category": "security/dep",
      "title": "Tinypool Prototype Pollution RCE — dev dependency",
      "package": "tinypool",
      "affected_versions": "<= 2.1.1",
      "fix_version": "2.1.2+",
      "files": ["Source/Frontend/package.json"],
      "note": "Transitive via vitest; dev-only; auto-fixed by vitest update",
      "route_to": "TheFixer",
      "action": "Next sprint (resolved by vitest upgrade)"
    },
    {
      "id": "DEP-008",
      "priority": "P3",
      "category": "dep-hygiene",
      "title": "Browserslist DoS + Prototype Pollution (CVSS 7.5)",
      "package": "browserslist",
      "affected_versions": "<= 4.28.6",
      "fix_version": "4.28.7+",
      "files": ["Source/Frontend/package.json"],
      "route_to": "TheFixer",
      "action": "Next sprint"
    },
    {
      "id": "QO-004",
      "priority": "P3",
      "category": "spec-drift",
      "title": "No seed data implemented — store starts empty on every restart",
      "spec": "FR-dependency-seed",
      "file": "Source/Backend/src/ (no seed file)",
      "recommendation": "Add idempotent seedStore() function called at server startup with spec-defined work items and dependency links",
      "route_to": "TheFixer",
      "action": "Next sprint"
    },
    {
      "id": "QO-005",
      "priority": "P3",
      "category": "pattern-violation",
      "title": "Traceability enforcer only covers 13 of 109 FRs — 80 roadmap FRs invisible",
      "file": "tools/traceability-enforcer.py",
      "recommendation": "Expand enforcer to scan full Specifications/ directory; add roadmap exclusion list for unimplemented portal specs",
      "route_to": "solo-session",
      "action": "Backlog"
    },
    {
      "id": "QO-006",
      "priority": "P4",
      "category": "pattern-violation",
      "title": "eslint-disable suppressions in 2 production files risk stale-closure bugs",
      "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63"],
      "recommendation": "Refactor to use useCallback/useRef or correct dependency arrays",
      "route_to": "TheFixer",
      "action": "Backlog"
    }
  ],
  "next_audit": "2026-11-14"
}
```

---

*Report generated by TheInspector team-leader · Audit ID: inspector-2026-10-14 · 2026-10-14*
