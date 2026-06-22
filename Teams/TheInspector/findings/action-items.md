# Dependency Audit Action Items

**Generated:** 2026-06-22  
**Report:** dependency-audit-2026-06-22.md

---

## Critical Path (P1) — Action Required This Week

### 1. Frontend: Upgrade Vitest (LOCAL DEV + CI SECURITY)
- **Current:** vitest@2.0.5
- **Target:** vitest@4.1.9 (or minimum 3.2.6)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Risk:** Arbitrary file read/execute when UI server running
- **File:** `Source/Frontend/package.json`
- **Steps:**
  ```bash
  cd Source/Frontend
  npm install vitest@latest
  npm test
  # Verify --ui flag removed from CI workflows
  ```
- **Verification:** Run full test suite, confirm Vitest UI not accessible in CI
- **Owner:** frontend-coder

### 2. Backend: Pin Handlebars (JEST TEST FRAMEWORK)
- **Current:** handlebars@4.7.8 (transitive via jest)
- **Target:** handlebars@4.7.9+ (patch, minimal disruption)
- **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8) + 7 others
- **Risk:** Template injection → RCE in test framework
- **File:** `Source/Backend/package-lock.json` (manage via package.json override)
- **Steps:**
  ```bash
  cd Source/Backend
  npm install handlebars@^4.7.9 --save-optional
  npm test
  ```
- **Verification:** Tests pass, no new failures
- **Owner:** backend-coder
- **Note:** Do NOT upgrade jest to v30 yet (major breaking change); pin handlebars first

### 3. Orchestrator: Upgrade Protobufjs (PROD CRITICAL)
- **Current:** protobufjs@<=7.6.2 (transitive via dockerode → grpc-js)
- **Target:** protobufjs@>=7.7.0
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8) + 10 others
- **Risk:** Arbitrary code execution in gRPC message parsing
- **File:** `platform/orchestrator/package.json` (dockerode dependency)
- **Steps:**
  ```bash
  cd platform/orchestrator
  npm update dockerode
  # OR force-pin: npm install protobufjs@^7.7.0
  npm test
  # Manual test: Restart orchestrator, verify Docker API communication works
  ```
- **Verification:** Orchestrator starts, connects to Docker, no failures
- **Owner:** (verify with team — platform is infrastructure)
- **Testing:** Critical — this is a production service

---

## High Priority (P2) — Action Within 2 Weeks

### 4. Backend: Update UUID
- **Current:** uuid@9.0.0
- **Target:** uuid@9.0.1+
- **CVE:** GHSA-6x94-qrvq-xwpf (buffer bounds check missing)
- **File:** `Source/Backend/package.json`
- **Steps:** `npm update uuid`
- **Owner:** backend-coder

### 5. Backend: Update Express
- **Current:** express@4.18.2
- **Target:** express@4.22.2+
- **CVE:** DoS via qs module (GHSA-gp4w-2v2m-p686)
- **File:** `Source/Backend/package.json`
- **Steps:** `npm update express`
- **Owner:** backend-coder

### 6. Frontend: Upgrade Vite (Windows Dev Machines)
- **Current:** vite@5.4.0
- **Target:** vite@6.4.3+
- **CVE:** GHSA-fx2h-pf6j-xcff (server.fs.deny bypass on Windows)
- **File:** `Source/Frontend/package.json`
- **Steps:**
  ```bash
  cd Source/Frontend
  npm install vite@latest
  npm run build
  npm run test
  ```
- **Verification:** Full dev workflow + build works
- **Owner:** frontend-coder
- **Note:** Major version bump; test carefully

### 7. Orchestrator: Update @grpc/grpc-js
- **Current:** @grpc/grpc-js@1.14.0–1.14.3
- **Target:** @grpc/grpc-js@>=1.14.4
- **CVE:** Server crash on malformed requests (GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq)
- **Steps:** Update via dockerode upgrade (above)
- **Owner:** (infrastructure team)

---

## Moderate Priority (P3) — Action Within 30 Days

- **@babel/core:** Arbitrary file read via sourcemap (dev-time only) — patch via jest update
- **JS-YAML:** DoS in merge keys — update jest
- **react-router-dom:** Upgrade to 6.30.4+ (minor fix)
- **Form-Data:** CRLF injection — force-pin >= 4.0.1 if testing with form uploads

---

## Cross-Team Escalations

### [→ TheGuardians] Security Review
1. **Vitest UI arbitrary file read** — Verify --ui flag not used in CI, verify dev machine isolation
2. **Protobufjs RCE in orchestrator** — Verify untrusted protobuf input doesn't reach parsing layer

### [→ Chaos Monkey]
1. Inject malformed protobuf messages to orchestrator; expect graceful handling
2. Test Vitest UI file read vulnerability in isolated sandbox

---

## Rollout Sequence (Recommended)

**Week 1:**
1. Pin handlebars@4.7.9+ (Backend) — low-risk
2. Upgrade vitest@4.1.9 (Frontend) — test thoroughly
3. Update uuid, express (Backend) — trivial, low-risk

**Week 2:**
1. Upgrade protobufjs/dockerode (Orchestrator) — requires functional testing
2. Upgrade vite@6+ (Frontend) — requires full test cycle

**Week 3:**
1. Update react-router-dom (Frontend) — nice-to-have
2. Quarterly audit schedule setup

---

## Verification Gates

After each change:
```bash
# Backend
cd Source/Backend
npm test --if-present
npm run typecheck

# Frontend
cd Source/Frontend
npm test
npm run build

# Orchestrator
cd platform/orchestrator
npm test --if-present
# Manual: ./orchestrator-test.sh (start server, verify Docker API works)
```

---

## Dashboard Tracking

All changes tracked in `tools/pipeline-state-TheInspector.json`. View with:
```bash
cat tools/pipeline-state-TheInspector.json | jq '.runs'
```
