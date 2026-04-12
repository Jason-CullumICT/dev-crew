import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store/store'
import { processEventForAlarm } from '../engine/alarmEngine'
import type { SecurityEvent, EventSeverity, SecurityEventType } from '../types'

interface Props {
  onClose: () => void
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function makeEvent(
  overrides: Partial<SecurityEvent> & Pick<SecurityEvent, 'eventType' | 'severity' | 'siteId' | 'message'>
): SecurityEvent {
  return {
    id:        makeId(),
    timestamp: new Date().toISOString(),
    category:  'intrusion',
    zoneId:    undefined,
    doorId:    undefined,
    userId:    undefined,
    metadata:  {},
    ...overrides,
  }
}

export default function ScenarioPanel({ onClose }: Props) {
  const addEvent    = useStore(s => s.addEvent)
  const addAlarm    = useStore(s => s.addAlarm)
  const sites       = useStore(s => s.sites)
  const doors       = useStore(s => s.doors)
  const zones       = useStore(s => s.zones)

  const [selectedSite, setSelectedSite] = useState(sites[0]?.id ?? '')
  const [selectedDoor, setSelectedDoor] = useState('')
  const [eventType,    setEventType]    = useState<SecurityEventType>('access_denied')
  const [severity,     setSeverity]     = useState<EventSeverity>('warning')
  const [running,      setRunning]      = useState<string | null>(null)

  const filteredDoors = doors.filter(d => d.siteId === selectedSite)

  function inject(event: SecurityEvent) {
    const state = useStore.getState()
    addEvent(event)
    const alarm = processEventForAlarm(event, state.events, state.alarms)
    if (alarm) addAlarm(alarm)
  }

  // ── Scenario: After-Hours Breach ────────────────────────────────────────────

  function runAfterHoursBreach() {
    if (running) return
    setRunning('breach')
    const site = sites[0]
    if (!site) { setRunning(null); return }
    const door = doors.find(d => d.siteId === site.id) ?? doors[0]
    const doorName = door?.name ?? 'Server Room'
    const doorId   = door?.id ?? 'door-1'

    const events: Array<[number, SecurityEvent]> = [
      [0,    makeEvent({ eventType: 'door_forced',      severity: 'critical', siteId: site.id, doorId, message: `Door Forced Open — ${doorName}`, category: 'intrusion' })],
      [2000, makeEvent({ eventType: 'sensor_trip',      severity: 'critical', siteId: site.id, message: 'Motion sensor tripped in restricted area', category: 'intrusion' })],
      [4000, makeEvent({ eventType: 'access_denied',    severity: 'warning',  siteId: site.id, doorId, message: `Access Denied — ${doorName}`, category: 'access' })],
      [6000, makeEvent({ eventType: 'access_denied',    severity: 'warning',  siteId: site.id, doorId, message: `Access Denied — ${doorName}`, category: 'access' })],
      [8000, makeEvent({ eventType: 'access_denied',    severity: 'warning',  siteId: site.id, doorId, message: `Access Denied — ${doorName}`, category: 'access' })],
      [10000,makeEvent({ eventType: 'access_denied',    severity: 'warning',  siteId: site.id, doorId, message: `Access Denied — ${doorName}`, category: 'access' })],
      [13000,makeEvent({ eventType: 'arm_state_change', severity: 'info',     siteId: site.id, message: 'Zone armed — automatic response', category: 'alarm' })],
      [16000,makeEvent({ eventType: 'controller_offline', severity: 'warning', siteId: site.id, message: 'Controller offline — possible tamper', category: 'system' })],
    ]

    events.forEach(([delay, event]) => {
      setTimeout(() => inject(event), delay)
    })
    setTimeout(() => setRunning(null), 17000)
  }

  // ── Scenario: Normal Business Day ────────────────────────────────────────────

  function runNormalDay() {
    if (running) return
    setRunning('normal')
    const site = sites[0]
    if (!site) { setRunning(null); return }
    const siteDoors = doors.filter(d => d.siteId === site.id)

    let delay = 0
    for (let i = 0; i < 30; i++) {
      const rand = Math.random()
      const isGranted = i < 27 && rand < 0.9
      const isDenied  = !isGranted && rand < 0.96
      const door      = siteDoors[i % siteDoors.length]

      let evType: SecurityEventType = 'access_granted'
      let evSev:  EventSeverity     = 'info'
      let msg = `Access Granted — ${door?.name ?? 'Main Entrance'}`

      if (!isGranted && isDenied) {
        evType = 'access_denied'
        evSev  = 'warning'
        msg    = `Access Denied — ${door?.name ?? 'Main Entrance'}`
      } else if (!isGranted) {
        evType = 'door_held'
        evSev  = 'warning'
        msg    = `Door Held Open — ${door?.name ?? 'Main Entrance'}`
      }

      const event = makeEvent({
        eventType: evType,
        severity:  evSev,
        siteId:    site.id,
        doorId:    door?.id,
        message:   msg,
        category:  'access',
      })

      setTimeout(() => inject(event), delay)
      delay += 2000
    }
    setTimeout(() => setRunning(null), delay + 1000)
  }

  // ── Scenario: Full Lockdown ──────────────────────────────────────────────────

  function runFullLockdown() {
    if (running) return
    setRunning('lockdown')
    const site = sites[0]
    if (!site) { setRunning(null); return }
    const siteZones = zones.filter(z => z.siteId === site.id)

    let delay = 0

    siteZones.slice(0, 4).forEach(zone => {
      const event = makeEvent({
        eventType: 'arm_state_change',
        severity:  'critical',
        siteId:    site.id,
        zoneId:    zone.id,
        message:   `LOCKDOWN — Zone armed: ${zone.name}`,
        category:  'alarm',
      })
      setTimeout(() => inject(event), delay)
      delay += 2000
    })

    for (let i = 0; i < 5; i++) {
      const door = doors.find(d => d.siteId === site.id)
      const event = makeEvent({
        eventType: 'access_denied',
        severity:  'warning',
        siteId:    site.id,
        doorId:    door?.id,
        message:   `Access Denied — Lockdown active: ${door?.name ?? 'Entry'}`,
        category:  'access',
      })
      setTimeout(() => inject(event), delay)
      delay += 2000
    }

    setTimeout(() => setRunning(null), delay + 1000)
  }

  // ── Custom event trigger ─────────────────────────────────────────────────────

  function triggerCustom() {
    const door = filteredDoors.find(d => d.id === selectedDoor) ?? filteredDoors[0]
    const site = sites.find(s => s.id === selectedSite)
    if (!site) return

    const event = makeEvent({
      eventType: eventType,
      severity,
      siteId: site.id,
      doorId: door?.id,
      message: `${eventType.replace(/_/g, ' ')} — ${door?.name ?? site.name}`,
      category:
        eventType === 'access_granted' || eventType === 'access_denied'
          ? 'access'
          : eventType === 'arm_state_change' || eventType === 'panic_button'
          ? 'alarm'
          : eventType === 'controller_offline'
          ? 'system'
          : 'intrusion',
    })
    inject(event)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[360px] bg-[#0b0e18] border-l border-[#1e293b] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] shrink-0">
          <span className="text-[12px] font-semibold text-slate-200">Scenario Panel</span>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Preset scenarios */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Preset Scenarios</div>

            <button
              onClick={runAfterHoursBreach}
              disabled={running !== null}
              className="w-full text-left bg-[#0f1320] border border-red-500/20 hover:border-red-500/40 rounded-xl p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l-4 border-l-red-500"
            >
              <div className="text-[11px] font-semibold text-red-400">🚨 After-Hours Breach</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Door forced → sensor trip → 4x denied → controller offline (~16s)</div>
            </button>

            <button
              onClick={runNormalDay}
              disabled={running !== null}
              className="w-full text-left bg-[#0f1320] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l-4 border-l-blue-500"
            >
              <div className="text-[11px] font-semibold text-emerald-400">📋 Normal Business Day</div>
              <div className="text-[11px] text-slate-600 mt-0.5">30 events over 60s — 90% granted, some denied, one door held</div>
            </button>

            <button
              onClick={runFullLockdown}
              disabled={running !== null}
              className="w-full text-left bg-[#0f1320] border border-violet-500/20 hover:border-violet-500/40 rounded-xl p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l-4 border-l-purple-500"
            >
              <div className="text-[11px] font-semibold text-violet-400">🔒 Full Lockdown</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Arm each zone + 5 denied events, spaced 2s apart</div>
            </button>

            {running && (
              <div className="text-[9px] text-indigo-400 text-center animate-pulse py-1">
                Scenario running...
              </div>
            )}
          </div>

          <div className="w-full h-px bg-[#1e293b]" />

          {/* Custom event */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Custom Event</div>

            {/* Site */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Site</label>
              <select
                value={selectedSite}
                onChange={e => { setSelectedSite(e.target.value); setSelectedDoor('') }}
                className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Door */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Door (optional)</label>
              <select
                value={selectedDoor}
                onChange={e => setSelectedDoor(e.target.value)}
                className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="">— any —</option>
                {filteredDoors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Event type */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Event Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as SecurityEventType)}
                className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="access_granted">access_granted</option>
                <option value="access_denied">access_denied</option>
                <option value="door_forced">door_forced</option>
                <option value="door_held">door_held</option>
                <option value="sensor_trip">sensor_trip</option>
                <option value="controller_offline">controller_offline</option>
                <option value="arm_state_change">arm_state_change</option>
                <option value="panic_button">panic_button</option>
              </select>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as EventSeverity)}
                className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <button
              onClick={triggerCustom}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
            >
              Trigger Event
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
