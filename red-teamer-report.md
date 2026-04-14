The **Attack Surface Map guard check** has failed — the file is absent (contains zero `PEN-` findings).

---

## ⛔ Red Teamer Cannot Proceed

```
No theoretical attack surface provided by Pen Tester — skipping active exploitation phase.

Cause:  Teams/TheGuardians/artifacts/attack-surface-map.md is absent (file exists as empty placeholder).
        The guard check found 0 PEN-ID findings.

Action: Re-run the pen-tester agent first, then re-dispatch the red-teamer.
```

---

### Why this is a hard stop

The red teamer's role is **exploit chaining** — taking the pen-tester's mapped theoretical vulnerabilities and attempting to turn them into confirmed live breaches. Without the `attack-surface-map.md` containing `PEN-` tagged findings as its primary input, there is no exploit chain to construct. Deriving an independent attack surface here would duplicate the pen-tester's work, bypass the checks-and-balances pipeline, and produce untraceable findings.

### Correct pipeline order

```
pen-tester  →  [writes attack-surface-map.md with PEN-ID findings]
                     ↓
red-teamer  →  [reads PEN-IDs, chains them into active exploits]
                     ↓
compliance-auditor  →  [reads both artifacts, grades the run]
```

**Next step:** Dispatch the `pen-tester` agent to map the attack surface against the running environment, then re-dispatch the `red-teamer` once `attack-surface-map.md` is populated with `PEN-` findings.
