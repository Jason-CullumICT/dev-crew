# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-22 — First Full Combined Audit (run-20261022-074013)

**Grade calculation:** Grade C requires P1 count ≤ 2. One CRITICAL CVE from dependency-auditor (proxy-addr, CVSS 9.1) was enough to drop the combined grade from B (quality-oracle alone) to C. Always check dependency-auditor grade first — a single P1 CVE overrides a clean code quality result.

**Specialist report locations:** Specialist summary reports are written to the repo root (e.g., `quality-oracle-report.md`, `dependency-auditor-report.md`) AND to `Teams/TheInspector/findings/`. The root files are shorter summaries; the findings/ files are the full reports. Read both.

**Performance + chaos not run:** Both specialists require running services. In static/CI environments, they produce no reports. Synthesis should always note missing dynamic coverage and recommend re-running with services online.

**Cross-reference map value:** The express upgrade (single command) eliminated both DEP-001 (P1) and DEP-008 (P3). The tailwindcss upgrade eliminated 3 P2s. Always build the cross-ref map before writing recommendations — it dramatically reduces perceived work.

**Escalation triggers:** DEP-001 (auth bypass) and DEP-005 (auth bypass) both matched escalation triggers in config. Always check `config.escalation.security_triggers` list against finding descriptions. "auth bypass", "injection", "sensitive data exposed" are the key phrases.

**Deduplication note:** DEP-006 (jest-message-util) and DEP-007 (micromatch) are sub-findings of DEP-004 and DEP-002 respectively. Count them as merged when computing P2 totals for grade calculation, but keep them in the full finding list for the JSON backlog.

**No prior baseline:** First combined audit means all findings are NEW. Sections 7 (Re-Verification) and 14 (Fixed Findings) will be empty. This is expected — note it explicitly rather than leaving those sections blank without explanation.

**Spec coverage context:** `dev-workflow-platform` and `tiered-merge-pipeline` show 0% coverage but this is by design (platform layer, not Source/). Always add a caveat note explaining this to avoid false alarm interpretation.
