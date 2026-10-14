# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Findings Summary (2026-10-14)

### Critical Issues Identified
- **6 Critical CVEs** requiring immediate patching
- **42 High-Severity CVEs** mostly in test toolchain (jest, vitest)
- **13 Outdated Major Versions** with security patches unavailable in current version line

### Watch List (Recurring Vulnerability Patterns)

#### 1. Jest Ecosystem (HIGH RISK)
- **Pattern**: Cascading CVEs across @jest/* modules when jest is outdated
- **Current Status**: jest@29.7.0 has 33 HIGH CVEs; fixed in jest@30.5.2+
- **Root Cause**: Complex internal dependency tree; updates require major version bump
- **Recommendation**: Consider vitest migration for new projects; jest updates should be prioritized in quarterly reviews

#### 2. Handlebars (CRITICAL)
- **Pattern**: Multiple code injection variants (AST confusion, prototype pollution)
- **Versions Affected**: 3.0.0 - 4.7.9 (9 CVEs total)
- **Usage**: Transitive via jest → babel-jest; dev-time only
- **Recommendation**: Not recommended for user-generated template processing; if used, isolate in sandboxed environment

#### 3. Protobufjs (CRITICAL)
- **Pattern**: Code generation gadgets leading to arbitrary code execution
- **Versions Affected**: < 7.5.5 (11 CVEs total)
- **Usage**: Orchestrator infrastructure; gRPC communication
- **Recommendation**: Must keep current; affects external service trust boundary

#### 4. React Router / @remix-run/router (HIGH)
- **Pattern**: Protocol-relative redirect bypass (CWE-601)
- **Versions Affected**: 1.3.0 - 1.23.2
- **Impact**: User-facing open redirect; incident response required
- **Recommendation**: Security audit of redirect handling after update

### Package Manager Status
- **npm**: Fully functional; npm audit works across all directories
- **npm license-checker**: Not installed; manual inspection adequate for project size
- **npm outdated**: Functional; detects all major version gaps

### Audit Tool Availability
Environment has npm installed globally; node_modules present in all package directories.

### Prior Findings
Baseline audit (2026-10-14) — no prior findings to compare against.

### License Compliance
✅ **PASS** — No GPL/AGPL dependencies detected; all transitive licenses compatible with MIT-licensed project

### Supply Chain Risk Assessment
✅ No post-install scripts detected  
✅ No single-maintainer critical packages  
✅ All major packages have >1K weekly downloads  
⚠️ 796 transitive dependencies is high surface area; recommend dependency reduction strategy

### Next Audit Schedule
Recommended: 2026-11-14 (30 days)  
Focus on: Re-audit after critical patches; verify no regressions
