// src/hooks/useSimulation.ts
// React hook that drives the SOC simulation timer loop.
// Uses non-reactive getState() reads inside the timer to avoid stale closures
// and to prevent re-renders from firing on every event.

import { useEffect } from 'react'
import { useStore } from '../store/store'
import { generateEvent } from '../engine/eventSimulator'
import { processEventForAlarm } from '../engine/alarmEngine'
import { evaluateRules, executeAction } from '../engine/responseEngine'

/**
 * Registers and manages the simulation timer based on simulationSpeed.
 * Mount this hook once at the application root (e.g. App.tsx).
 *
 * Speed mapping:
 *   0  → paused, no events
 *   1  → 2–5 s random interval (realistic)
 *   10 → 200–500 ms random interval (fast-forward demo)
 */
export function useSimulation(): void {
  const simulationSpeed = useStore(s => s.simulationSpeed)

  useEffect(() => {
    if (simulationSpeed === 0) return

    let timeoutId: ReturnType<typeof setTimeout>

    function tick(): void {
      const state = useStore.getState()

      const event = generateEvent({
        users:         state.users,
        doors:         state.doors,
        zones:         state.zones,
        sites:         state.sites,
        controllers:   state.controllers,
        inputDevices:  state.inputDevices,
        outputDevices: state.outputDevices,
      })

      state.addEvent(event)

      const freshState = useStore.getState()
      const alarm = processEventForAlarm(event, freshState.events, freshState.alarms)
      if (alarm !== null) {
        freshState.addAlarm(alarm)
      }

      // Phase 3: Evaluate response rules and execute matching actions
      const actions = evaluateRules(event, freshState.responseRules, {
        zones:         freshState.zones,
        sites:         freshState.sites,
        threatLevel:   freshState.threatLevel,
        responseRules: freshState.responseRules,
      })
      for (const action of actions) {
        executeAction(action, event, { getState: () => useStore.getState() })
      }

      // Schedule the next tick
      const delay = simulationSpeed === 10
        ? 200 + Math.random() * 300   // 200–500 ms
        : 2000 + Math.random() * 3000 // 2000–5000 ms

      timeoutId = setTimeout(tick, delay)
    }

    // Start the first tick after an initial random delay so multiple instances
    // don't fire simultaneously.
    const initialDelay = simulationSpeed === 10
      ? 200 + Math.random() * 300
      : 2000 + Math.random() * 3000

    timeoutId = setTimeout(tick, initialDelay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [simulationSpeed])
}
