# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-14

### Tool Availability
- **gitleaks**: NOT INSTALLED — fell back to LLM-based secret scan
- **semgrep**: NOT INSTALLED — fell back to LLM-based pattern scan

### False Positives (Known Safe Patterns)
- `executeAction` in `WorkItemDetailPage.tsx` — NOT dynamic code execution; it's a React useCallback helper. Do not flag.
- `cycle detection` / `cycleDetection` in `metrics.ts` — NOT a vulnerability, it's a Prometheus metric name.
- Test files in `Source/Backend/tests/` and `Source/Frontend/tests/` — ignore `suggestedChanges: ['Add rate limiting']` in test fixtures; it's test data, not a real recommendation from existing code.

### Codebase Characteristics (2026-04-14 scan)
- **No hardcoded secrets found** in any first-party source file. The `.env.example` has empty placeholders only.
- **No cryptographic code** in the application layer — no custom crypto, no password hashing (no auth at all).
- **In-memory data store only** — no database, no SQL, no NoSQL; injection and deserialization risks are minimal.
- **No dynamic code execution** (`eval`, `Function()`, template injection) found in source.
- **No XSS vectors** (`dangerouslySetInnerHTML`, `innerHTML`) found in frontend React code.
- **No shell command construction** from request parameters found.

### Key Structural Patterns That Signal Real Issues in This Codebase
1. Missing `helmet` / `cors` imports in `app.ts` → confirmed absence of security headers and CORS config
2. No `authMiddleware` or `requireAuth` anywhere in routes → confirmed unauthenticated API
3. `res.status(500).json({ error: message })` in workflow.ts catch blocks → confirmed error leakage
4. `parseInt(req.query.X as string, 10)` without max-cap → pagination DoS vector
5. Portal `Dockerfile` has no `USER` directive → root container

### Files to Always Prioritise
- `Source/Backend/src/app.ts` — security middleware configuration point
- `Source/Backend/src/routes/*.ts` — request handling and input validation
- `portal/Dockerfile` — container security posture
- `platform/docker-compose.yml` — infrastructure-level security (read-only; report only, do not modify)
