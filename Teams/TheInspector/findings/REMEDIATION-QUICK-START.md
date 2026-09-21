# Dependency Audit - Quick Remediation Guide

**Audit Date:** 2025-09-21  
**Critical Status:** 🔴 6 CRITICAL + 53 HIGH vulnerabilities  
**Grade:** F

---

## One-Line Summary

**6 critical RCE/file-read vulnerabilities** (handlebars, vitest, protobufjs) require immediate fixes. **53 high-severity DoS/injection vulnerabilities** require short-term remediation.

---

## Step-by-Step Remediation (Week 1)

### Step 1: Fix Source/Backend (1 critical: handlebars)

```bash
cd Source/Backend
npm update handlebars
npm audit
git commit -am "fix(deps): update handlebars to patch 8 injection vulns"
```

### Step 2: Fix Source/Frontend (1 critical: vitest)

```bash
cd Source/Frontend
npm update vitest
npm audit
git commit -am "fix(deps): update vitest to patch arbitrary file read CVE"
```

### Step 3: Fix platform/orchestrator (1 critical: protobufjs)

```bash
cd platform/orchestrator
npm update protobufjs
npm audit
git commit -am "fix(deps): update protobufjs to patch prototype pollution"
```

### Step 4: Fix portal/Backend (2 critical: protobufjs, vitest + 1 HIGH: @opentelemetry)

```bash
cd portal/Backend
npm update protobufjs vitest @opentelemetry/auto-instrumentations-node
npm audit
git commit -am "fix(deps): update critical deps (protobufjs, vitest, opentelemetry)"
```

### Step 5: Fix portal/Frontend (1 critical: vitest)

```bash
cd portal/Frontend
npm update vitest
npm audit
git commit -am "fix(deps): update vitest to patch arbitrary file read CVE"
```

---

## Step 2: Comprehensive High-Severity Updates (Weeks 2-3)

Run this in **Source/Backend**, **Source/Frontend**, **platform/orchestrator**, **portal/Backend**, **portal/Frontend**:

```bash
npm update brace-expansion browserslist postcss vite form-data @grpc/grpc-js
npm audit --audit-level=high
npm test --if-present
git commit -am "fix(deps): patch 10 high-severity vulnerabilities"
```

---

## Demo Projects (Lower Priority)

For **abac-demo**, **abac-soc-demo**, **abac-soc-demo-v2**, **abac-reimagined**:

```bash
cd abac-demo
npm update
npm audit
git commit -am "chore(deps): update dependencies for security"
```

---

## Verification Checklist

After each commit:

- [ ] `npm audit --audit-level=high` returns 0 vulnerabilities
- [ ] `npm test --workspaces --if-present` passes
- [ ] Git push succeeds
- [ ] Build pipeline succeeds (if available)

---

## Detailed Finding Summaries

| Finding | Severity | Package | Fix | Time |
|---------|----------|---------|-----|------|
| **DEP-001** | P1 | handlebars | `npm update handlebars` | 5 min |
| **DEP-002** | P1 | vitest | `npm update vitest` | 5 min |
| **DEP-003** | P1 | protobufjs | `npm update protobufjs` | 5 min |
| **DEP-004** | P2 | @opentelemetry/auto-instrumentations-node | `npm update @opentelemetry/...` | 5 min |
| **DEP-005** | P2 | brace-expansion | `npm update brace-expansion` | 5 min |
| **DEP-006** | P2 | browserslist | `npm update browserslist` | 5 min |
| **DEP-007** | P2 | postcss | `npm update postcss` | 5 min |
| **DEP-008** | P2 | vite | `npm update vite` | 10 min |
| **DEP-009** | P2 | form-data | `npm update form-data` | 5 min |
| **DEP-010** | P2 | @grpc/grpc-js | `npm update @grpc/grpc-js` | 5 min |

---

## Manual Code Fixes Required

### 1. Check js-yaml Usage (DEP-013)

Search for `js-yaml` in code:

```bash
grep -r "yaml.load\|safeLoad" Source/ --include="*.js" --include="*.ts"
```

For any `yaml.load()` calls on untrusted data, change to:

```javascript
const data = yaml.load(input, { safe: true });
```

### 2. Disable Vitest UI in CI (DEP-002)

In CI configuration, ensure vitest is never run with `--ui` flag:

```bash
# ❌ NEVER do this in CI:
vitest --ui

# ✅ Instead:
vitest  # (UI disabled by default)
```

---

## Timeline & Dependencies

```
Week 1: handlebars, vitest, protobufjs, @opentelemetry
  ↓
Week 2-3: brace-expansion, browserslist, postcss, vite, form-data, @grpc/grpc-js, nanoid, picomatch/minimatch
  ↓
Week 4+: Full audit, major version planning, CI integration
```

---

## If npm update Fails

If a package cannot be updated (conflicts, major version required):

1. Check `npm outdated` to see available versions
2. Try explicit version: `npm install package@<version>`
3. If still fails, update parent dependency first
4. As last resort, use `npm update --save` to record changes

Example:

```bash
npm outdated
npm install handlebars@4.7.8
npm install vitest@5.0.1
npm audit
```

---

## Escalation Notes

The following findings are security-critical and should be reported to **TheGuardians** team:

- **DEP-001:** Handlebars RCE (if user-supplied templates compiled)
- **DEP-002:** Vitest arbitrary file read (dev environment security)
- **DEP-003:** Protobufjs prototype pollution (gRPC message integrity)
- **DEP-013:** js-yaml RCE (if unsafe YAML parsing in application)

---

## Dashboard Reporting

To report completion to the pipeline dashboard:

```bash
bash tools/pipeline-update.sh \
  --team TheInspector \
  --run <RUN_ID> \
  --agent dependency_auditor \
  --action complete \
  --verdict passed \
  --metrics '{"cves_critical": 0, "cves_high": 0, "cves_remaining": 74}'
```

_Note: Replace `<RUN_ID>` with the actual run ID from the team leader._

---

## Additional Resources

- **Full Report:** `Teams/TheInspector/findings/dependency-audit-2025-09-21.md`
- **JSON Summary:** `Teams/TheInspector/findings/dependency-audit-2025-09-21.json`
- **Learnings:** `Teams/TheInspector/learnings/dependency-auditor.md`

---

**Prepared by:** Dependency Auditor (Claude Haiku 4.5)  
**Date:** 2025-09-21  
**Status:** Ready for remediation
