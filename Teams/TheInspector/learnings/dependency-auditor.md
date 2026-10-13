# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-13

### Key Findings

1. **Jest Ecosystem at Risk** - 33 HIGH severity CVEs across @jest/* packages in Source/Backend
   - jest@29.7.0 is significantly outdated
   - jest-message-util is the root cause, cascades to all dependent @jest/* packages
   - Recommend: Upgrade to jest@30.5.2+ (requires major version bump and test compatibility review)

2. **Vitest Has Critical Vulnerabilities** - Both RCE and arbitrary file read
   - tinypool prototype pollution RCE (<2.1.2)
   - vitest UI server file read (<3.2.6)
   - @vitest/mocker path traversal (<=4.1.10)
   - Recommend: Vitest upgrade to >=5.0.4 (major bump)

3. **Handlebars JavaScript Injection** - Via Jest snapshot testing
   - Affects Source/Backend indirectly through jest-snapshot dependency
   - CVSS 9.8 - arbitrary code execution risk
   - Fixed by jest upgrade

4. **IP Spoofing in proxy-addr** - CRITICAL in Source/Backend
   - express 4.18.2 uses proxy-addr ~2.0.7 (vulnerable to IPv4-mapped IPv6)
   - CVSS 9.1 - access control bypass
   - Fix: Upgrade express to 4.22.3+ (minor update, not breaking)

5. **protobufjs RCE in orchestrator** - CRITICAL if untrusted schemas processed
   - platform/orchestrator uses protobufjs <=7.6.4
   - Arbitrary code execution (CVSS 9.8)
   - Multiple follow-up vulnerabilities in same package
   - Recommend: Review if orchestrator actually uses protobuf, or upgrade to >=7.7.0

6. **React Router Open Redirect** - Source/Frontend
   - @remix-run/router 1.3.0-1.23.2 has same-origin open redirect
   - react-router-dom@6.26.0 is vulnerable
   - Fix: Upgrade to 6.27.0+

### Watch List (Recurring Issues)

- **jest** - Major testing framework with fragmented ecosystem; needs version discipline
- **vitest** - Newer but has had multiple critical issues; keep updated
- **React Router** - Regular open redirect / security issues; monitor closely
- **protobufjs** - Exceptionally large CVE surface; 15+ related issues

### Tools Available in This Environment

- ✅ npm audit (JSON output)
- ✅ npm outdated (JSON output)
- ❌ license-checker (not installed; recommend: `npm install -g license-checker`)
- ❌ govulncheck (Go not detected in repo)
- ❌ pip-audit (Python not detected in repo)

### Audit Commands Used

```bash
# CVE scanning
cd {package-dir} && npm audit --json

# Outdated packages
npm outdated --json

# License compliance (not run — tool not available)
npx license-checker --json
```

### Recommendations for Future Audits

1. Install license-checker globally to flag GPL/AGPL dependencies
2. Create a pre-commit hook to prevent adding vulnerable dependencies
3. Schedule quarterly audits (dependency velocity is high in Node.js ecosystem)
4. Consider npm audit automation in CI/CD (currently not detected)
5. Evaluate testing framework migration: Jest (many issues) -> vitest (fewer but needs upgrades)

### License Compliance Status

Not audited this run (license-checker not available). Recommend installing and re-running.

### Prior Known Issues

- (none on record from prior runs)
