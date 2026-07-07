# Dependency Remediation Action Plan
**Date**: 2026-07-07  
**Owner**: TheInspector / Dependency Auditor  
**Status**: 🔴 CRITICAL — Immediate action required

---

## Phase 1: Emergency Fixes (Today — 30–60 minutes)

### Step 1: Update Vitest (CRITICAL)
**Priority**: 🔴 CRITICAL  
**Effort**: 15 minutes  
**Risk**: LOW (development/test dependency)

```bash
# Fix arbitrary file read/execution vulnerability
cd Source/Frontend
npm update vitest
npm audit --json | jq '.metadata.vulnerabilities'

cd ../..
cd portal/Backend
npm update vitest
npm audit --json | jq '.metadata.vulnerabilities'
```

**Verify**:
- ✅ No vitest CRITICAL CVEs remaining
- ✅ Tests still pass after update

---

### Step 2: Update gRPC & Protobufjs (CRITICAL)
**Priority**: 🔴 CRITICAL  
**Effort**: 30 minutes  
**Risk**: MEDIUM (protobuf parsing changes)

```bash
# Fix protobufjs RCE exploits
cd platform/orchestrator
npm update @grpc/grpc-js
npm audit --json | jq '.metadata.vulnerabilities'

cd ../..
cd portal/Backend
npm update @grpc/grpc-js
npm audit --json | jq '.metadata.vulnerabilities'
```

**Verify**:
- ✅ `npm ls protobufjs` shows version >=7.6.3
- ✅ gRPC communication tests pass
- ✅ No protobufjs CVEs in npm audit output

**Test Cases**:
```bash
# If orchestrator has gRPC server tests
npm test -- --testPathPattern="grpc|protobuf"
```

---

### Step 3: Update Vite (HIGH)
**Priority**: 🟡 HIGH  
**Effort**: 20 minutes  
**Risk**: MEDIUM (major version changes)

```bash
# Fix path traversal and FS security bypass
cd Source/Frontend
npm update vite
npm ls vite  # Should show version >=6.4.3 or latest

cd ../..
cd portal/Frontend
npm update vite
npm ls vite

# Verify build still works
npm run build 2>&1 | head -50
```

**Verify**:
- ✅ No vite path traversal CVEs
- ✅ Development server starts without errors
- ✅ Build completes successfully

---

### Step 4: Update UUID (HIGH CVE)
**Priority**: 🟡 HIGH  
**Effort**: 15 minutes  
**Risk**: LOW (library upgrade, no API changes)

```bash
# Fix UUID ID generation vulnerability
cd Source/Backend
npm update uuid
npm ls uuid  # Should show version >=10 or latest

cd ../..
cd platform/orchestrator
npm update uuid
npm ls uuid
```

**Verify**:
- ✅ No uuid CVEs in npm audit
- ✅ IDs are still generated correctly (spot-check a few)

---

### Step 5: Update OpenTelemetry (HIGH)
**Priority**: 🟡 HIGH  
**Effort**: 15 minutes  
**Risk**: MEDIUM (telemetry instrumentation)

```bash
# Fix Prometheus DoS vulnerability
cd portal/Backend
npm update @opentelemetry/auto-instrumentations-node
npm ls @opentelemetry/auto-instrumentations-node  # >=0.75.0

npm audit --json | jq '.metadata.vulnerabilities'
```

**Verify**:
- ✅ No @opentelemetry DoS CVEs
- ✅ Prometheus `/metrics` endpoint responds to normal requests
- ✅ Telemetry data still flows correctly

**Test DoS Fix** (after deployment):
```bash
# Should NOT crash with malformed request
curl -X POST http://localhost:3001/metrics -d "GARBAGE"
echo $?  # Should NOT be 0 (connection error expected, not crash)
```

---

### Step 6: Trace and Fix Handlebars (CRITICAL)
**Priority**: 🔴 CRITICAL  
**Effort**: 45 minutes (includes tracing)  
**Risk**: MEDIUM (may affect rendering)

```bash
# Identify direct dependency requiring handlebars
cd Source/Backend
npm ls handlebars 2>&1 | head -20

# Output will show something like:
# Source/Backend@1.0.0 -> npm list handlebars
# └── <direct-dependency>@x.x.x
#     └── handlebars@4.7.8
```

**Example** (if `express-handlebars` is the direct dependency):
```bash
npm update express-handlebars
npm ls handlebars  # Should now show >=4.7.9

npm audit --json | jq '.metadata.vulnerabilities | select(.handlebars)'
```

**Verify**:
- ✅ Direct dependency identified and updated
- ✅ No handlebars CVEs in npm audit
- ✅ Template rendering still works (if backend renders templates)

---

### ✅ Phase 1 Verification Checklist

Run this after all Phase 1 updates:

```bash
# From repo root
echo "=== Checking all manifests for CRITICAL/HIGH CVEs ==="

for dir in Source/Backend Source/Frontend Source/E2E platform/orchestrator portal/Backend portal/Frontend; do
  if [ -f "$dir/package.json" ]; then
    echo ""
    echo "--- $dir ---"
    cd "$dir"
    CRITICAL=$(npm audit 2>/dev/null | grep -c "CRITICAL" || echo "0")
    HIGH=$(npm audit 2>/dev/null | grep -c "HIGH" || echo "0")
    echo "CRITICAL: $CRITICAL, HIGH: $HIGH"
    cd - > /dev/null
  fi
done

echo ""
echo "Expected: All manifests show CRITICAL: 0, HIGH: 0 or very low numbers"
```

**Success Criteria**:
- ✅ No CRITICAL vulnerabilities remain
- ✅ HIGH vulnerabilities reduced from 16 to <5
- ✅ All tests pass
- ✅ No new test failures introduced

---

## Phase 2: Follow-up Security Updates (Within 1 Week)

### Remaining @opentelemetry Packages (portal/Backend)
```bash
cd portal/Backend
npm outdated | grep "@opentelemetry"
# Update any OTHER @opentelemetry packages >1 major version behind
npm update @opentelemetry/*
```

### Testing After Phase 1 & 2
```bash
# Run full test suite
npm test --workspaces --if-present

# Verify traceability
python3 tools/traceability-enforcer.py
```

---

## Phase 3: Major Version Planning (Sprint)

### React Ecosystem (Source/Frontend, portal/Frontend)
**Effort**: 3–4 days  
**Risk**: HIGH (breaking changes)

```bash
# Create feature branch for React upgrade
git checkout -b upgrade/react-18-to-19

cd Source/Frontend
npm update react react-dom react-router-dom

# May need:
# - Component lifecycle changes
# - Hook dependency updates
# - Router API migration

npm run build
npm test  # Must pass
```

### Express (Source/Backend, platform/orchestrator, portal/Backend)
**Effort**: 2–3 days  
**Risk**: HIGH (breaking changes)

```bash
git checkout -b upgrade/express-4-to-5

cd Source/Backend
npm update express

# Likely changes:
# - res.json() behavior
# - Middleware API
# - Error handling patterns
```

### Pino Logging (Source/Backend)
**Effort**: 1–2 days  
**Risk**: MEDIUM

```bash
git checkout -b upgrade/pino-8-to-10

cd Source/Backend
npm update pino

# Changes:
# - Logger configuration
# - Serializer API
```

---

## Communication Plan

### Notify Teams
1. **Backend Team**: UUID, handlebars, express, pino updates
2. **Frontend Team**: Vitest, vite, react updates
3. **DevOps/Infra**: gRPC, orchestrator changes
4. **QA**: Test plan for dependency updates

### Document Changes
- Update CHANGELOG with all dependency versions
- Add migration notes for major versions
- Link to breaking change guides

---

## Automation & Prevention

### Add Pre-commit Hook
```bash
# In .git/hooks/pre-commit
npm audit --audit-level=moderate
```

### Enable Dependabot (GitHub)
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "all"
    reviewers:
      - "dependency-reviewers"
```

### Add to CI/CD
```bash
# In GitHub Actions workflow
- name: Security Audit
  run: |
    npm audit --audit-level=moderate --workspaces
    python3 tools/traceability-enforcer.py
```

---

## Risk Mitigation

### Rollback Plan (if Phase 1 breaks things)
```bash
git checkout Source/Backend/package-lock.json
git checkout Source/Frontend/package-lock.json
# etc... for all manifests

npm ci --workspaces

# Revert the problematic update
npm update <package>@<previous-version>
```

### Staging/Testing Before Production
1. Apply Phase 1 updates to `dev` branch
2. Run full test suite + integration tests
3. Deploy to staging environment
4. Smoke test critical paths (work-item CRUD, gRPC communication)
5. Monitor for 24 hours
6. Merge to main and deploy to production

---

## Timeline

| Phase | Duration | Start Date | End Date | Owner |
|-------|----------|-----------|---------|-------|
| Phase 1 (Emergency) | 1 hour | TODAY | TODAY | Backend + Frontend Teams |
| Phase 2 (Security Updates) | 4–8 hours | TOMORROW | Fri 2026-07-11 | Backend + Infrastructure |
| Phase 3 (Major Versions) | 2–4 days | Mon 2026-07-14 | Thu 2026-07-17 | Entire Team |

---

## Success Metrics

- ✅ Zero CRITICAL CVEs in production
- ✅ All tests pass with new dependency versions
- ✅ No regressions in functionality
- ✅ Traceability check passes
- ✅ Performance metrics stable or improved
- ✅ All teams sign off on major version changes

---

## Questions & Escalation

**If Phase 1 breaks something:**
- Revert the specific package update
- Check npm audit advisories for context
- Escalate to [TheGuardians] for security review
- Escalate to [TheFixer] for breaking change fixes

**If major version upgrade is too risky:**
- Consider staying on current version longer
- Evaluate alternative packages if current is abandoned
- Plan phased migration approach

---

## Next Steps

1. **TODAY**: Execute Phase 1 steps (30–60 min)
2. **VERIFY**: Run Phase 1 Verification Checklist
3. **NOTIFY**: Inform teams of changes
4. **TEST**: Run full test suite
5. **COMMIT**: Create PR with Phase 1 updates
6. **PLAN**: Schedule Phase 2 for tomorrow, Phase 3 for next sprint

---

**Document Owner**: TheInspector / Dependency Auditor  
**Last Updated**: 2026-07-07  
**Next Review**: 2026-07-14 (post-Phase 1 & 2)
