# Phase 1 — SOC Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time event streaming, alarm management, and a Security Operations Center view to the Axon demo. Make it feel alive with a probability-based event simulator that references real entities, an alarm engine that auto-creates alarms from critical events, and a full Monitor command center page.

**Architecture:** The event simulator runs on a `setInterval` timer controlled by `simulationSpeed` (0/1/10). It pulls real users, doors, zones, sites from the store and generates `SecurityEvent` objects using weighted probability tables. The alarm engine watches incoming events and auto-creates `Alarm` objects when trigger conditions match. Both engines are pure functions tested independently; a React hook (`useSimulation`) wires them to the store. The Monitor page is a new route with SeverityBar + EventFeed + AlarmQueue layout. Dashboard and header get incremental integrations.

**Tech Stack:** React 19, TypeScript 6 strict, Zustand 5 (with `persist` partialize for ephemeral data), Tailwind v4, uuid v13, lucide-react, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-13-abac-comprehensive-expansion-design.md` (Phase 1, lines 13-160)

---

## File Map

```
abac-reimagined/src/
├── types/
│   └── index.ts                         MODIFY — add SecurityEvent, Alarm, EventSeverity, EventCategory, AlarmState, ThreatLevel
├── store/
│   └── store.ts                         MODIFY — add events[], alarms[], simulationSpeed + 7 new actions; partialize excludes events/alarms
├── engine/
│   ├── eventSimulator.ts                CREATE — probability-based event generation using real entities
│   ├── eventSimulator.test.ts           CREATE — unit tests for event generation
│   ├── alarmEngine.ts                   CREATE — event→alarm mapping, severity classification
│   └── alarmEngine.test.ts              CREATE — unit tests for alarm creation
├── hooks/
│   └── useSimulation.ts                 CREATE — setInterval hook that drives eventSimulator + alarmEngine
├── components/
│   ├── EventFeed.tsx                    CREATE — scrolling event list (reusable, compact mode for Dashboard)
│   ├── AlarmCard.tsx                    CREATE — alarm card with ACK/Escalate/Clear actions
│   ├── SeverityBar.tsx                  CREATE — top summary bar (Critical/Warning/Info/Sites OK)
│   ├── SimulationToggle.tsx             CREATE — play/pause + speed selector for header
│   └── Layout.tsx                       MODIFY — add Monitor nav item, alarm badge, SimulationToggle in header
├── pages/
│   ├── Monitor.tsx                      CREATE — SOC Command Center page
│   ├── ScenarioPanel.tsx                CREATE — slide-out drawer for preset scenarios + custom event trigger
│   └── Dashboard.tsx                    MODIFY — add live events section, active alarms section, pulsing alarm card
└── App.tsx                              MODIFY — add /monitor route
```

---

## Task Summary

| Task | Description | New Files | Modified Files | Tests |
|------|-------------|-----------|---------------|-------|
| 1 | New types (SecurityEvent, Alarm, EventSeverity, etc.) | — | types/index.ts | tsc |
| 2 | Store additions (events, alarms, simulationSpeed + 7 actions) | — | store/store.ts | tsc |
| 3 | Event simulator engine (probability model, schedule-aware) | eventSimulator.ts, .test.ts | — | vitest |
| 4 | Alarm engine (event→alarm mapping, repeated denial detection) | alarmEngine.ts, .test.ts | — | vitest |
| 5 | Simulation hook (setInterval driver for sim + alarm engines) | hooks/useSimulation.ts | — | tsc |
| 6 | UI components (SeverityBar, EventFeed, AlarmCard, SimulationToggle) | 4 components | — | tsc |
| 7 | Monitor page + ScenarioPanel (command center + preset scenarios) | Monitor.tsx, ScenarioPanel.tsx | — | tsc |
| 8 | Integration (routing, Layout sidebar/header, Dashboard live feeds) | — | App.tsx, Layout.tsx, Dashboard.tsx | full smoke |

**Total: 10 new files, 4 modified files. Complete code in the agent output above.**

---

## Key Implementation Details

### Event Simulator (Task 3)
- Weighted probability tables per condition (business/afterhours/lockdown)
- Events reference real users, doors, zones from the store
- Exported functions: `generateEvent()`, `pickWeightedEventType()`, `getCondition()`

### Alarm Engine (Task 4)
- Auto-creates alarms from: door_forced, sensor_trip, panic_button, controller_offline, door_held
- Repeated denial detection: 3+ access_denied at same door within 60s → warning alarm
- Exported functions: `shouldCreateAlarm()`, `createAlarm()`, `checkRepeatedDenials()`, `processEventForAlarm()`

### Simulation Hook (Task 5)
- Speed 0: paused. Speed 1: 2-5s interval. Speed 10: 200-500ms interval.
- Reads store via `useStore.getState()` (no React re-render dependency)
- Each tick: generate event → add to store → check for alarm → add alarm if triggered

### Monitor Page (Task 7)
- Layout: SeverityBar (top) → 2/3 EventFeed + 1/3 AlarmQueue (main)
- Floating action button opens ScenarioPanel drawer
- 3 preset scenarios: After-Hours Breach, Normal Business Day, Full Lockdown
- Custom event trigger: pick site, door, event type, severity

### Layout Integration (Task 8)
- Monitor nav item: MonitorIcon, color #ef4444, red dot badge for unacknowledged alarms
- SimulationToggle in header: play/pause + speed cycle + LIVE indicator
- Dashboard: live EventFeed replaces intrusion timeline, active AlarmCards shown
