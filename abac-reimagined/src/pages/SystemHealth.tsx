import { useMemo, useEffect, useState } from 'react'
import { HeartPulse, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useStore } from '../store/store'
import type { DeviceStatus } from '../types'

const MAX_EVENTS = 500

// ── Controller status grid ────────────────────────────────────────────────────

function ControllerGrid() {
  const controllers = useStore(s => s.controllers)
  const sites       = useStore(s => s.sites)
  const events      = useStore(s => s.events)

  // Simulate last heartbeat based on recent events touching a controller
  const heartbeats = useMemo(() => {
    const map: Record<string, string> = {}
    events.forEach(e => {
      if (e.metadata['controllerId'] && !map[e.metadata['controllerId']]) {
        map[e.metadata['controllerId']] = e.timestamp
      }
    })
    return map
  }, [events])

  // Simulate controller status: offline if a controller_offline event exists for it recently
  const offlineControllerIds = useMemo(() => {
    const ids = new Set<string>()
    events.slice(0, 50).forEach(e => {
      if (e.eventType === 'controller_offline' && e.metadata['controllerId']) {
        ids.add(e.metadata['controllerId'])
      }
    })
    return ids
  }, [events])

  return (
    <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#1e293b] text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
        Controller Status
      </div>
      <div className="p-4 grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
        {controllers.map(c => {
          const site = sites.find(s => s.id === c.siteId)
          const isOffline = offlineControllerIds.has(c.id)
          const lastBeat  = heartbeats[c.id]
          return (
            <div
              key={c.id}
              className={`flex items-start gap-2 p-2 rounded-lg border ${
                isOffline
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/10'
              }`}
            >
              {isOffline
                ? <WifiOff size={12} className="text-red-400 shrink-0 mt-0.5" />
                : <Wifi    size={12} className="text-emerald-400 shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <div className={`text-[10px] font-semibold truncate ${isOffline ? 'text-red-300' : 'text-slate-300'}`}>
                  {c.name}
                </div>
                <div className="text-[9px] text-slate-600 truncate">{site?.name ?? c.siteId}</div>
                {lastBeat && (
                  <div className="text-[8px] text-slate-700 mt-0.5">
                    Last seen: {new Date(lastBeat).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {controllers.length === 0 && (
          <p className="col-span-2 text-center text-[11px] text-slate-600 py-4">No controllers configured.</p>
        )}
      </div>
    </div>
  )
}

// ── Device health per site ────────────────────────────────────────────────────

function DeviceHealthGrid() {
  const inputDevices  = useStore(s => s.inputDevices)
  const outputDevices = useStore(s => s.outputDevices)
  const sites         = useStore(s => s.sites)
  const doors         = useStore(s => s.doors)

  type SiteHealth = {
    siteId: string
    siteName: string
    online: number
    offline: number
    tamper: number
    fault: number
  }

  const healthBySite = useMemo((): SiteHealth[] => {
    const allDevices = [
      ...inputDevices.map(d => ({ status: d.status, doorId: d.doorId })),
      ...outputDevices.map(d => ({ status: d.status, doorId: d.doorId ?? '' })),
    ]
    const map: Record<string, SiteHealth> = {}
    allDevices.forEach(dev => {
      const door = doors.find(d => d.id === dev.doorId)
      if (!door) return
      const site = sites.find(s => s.id === door.siteId)
      if (!site) return
      if (!map[site.id]) {
        map[site.id] = { siteId: site.id, siteName: site.name, online: 0, offline: 0, tamper: 0, fault: 0 }
      }
      const s = dev.status as DeviceStatus
      if (s === 'online')  map[site.id].online++
      if (s === 'offline') map[site.id].offline++
      if (s === 'tamper')  map[site.id].tamper++
      if (s === 'fault')   map[site.id].fault++
    })
    return Object.values(map).sort((a, b) =>
      (b.offline + b.tamper + b.fault) - (a.offline + a.tamper + a.fault)
    )
  }, [inputDevices, outputDevices, sites, doors])

  return (
    <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#1e293b] text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
        Device Health by Site
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-[#080b14] border-b border-[#1e293b]">
            <tr>
              <th className="text-left px-3 py-2 text-slate-500 font-semibold">Site</th>
              <th className="text-left px-3 py-2 text-emerald-400 font-semibold">Online</th>
              <th className="text-left px-3 py-2 text-red-400 font-semibold">Offline</th>
              <th className="text-left px-3 py-2 text-amber-400 font-semibold">Tamper</th>
              <th className="text-left px-3 py-2 text-orange-400 font-semibold">Fault</th>
            </tr>
          </thead>
          <tbody>
            {healthBySite.map(row => (
              <tr key={row.siteId} className="border-b border-[#0d1220]">
                <td className="px-3 py-1.5 text-slate-300">{row.siteName}</td>
                <td className="px-3 py-1.5 text-emerald-400">{row.online}</td>
                <td className="px-3 py-1.5 text-red-400">{row.offline > 0 ? row.offline : <span className="text-slate-700">0</span>}</td>
                <td className="px-3 py-1.5 text-amber-400">{row.tamper > 0 ? row.tamper : <span className="text-slate-700">0</span>}</td>
                <td className="px-3 py-1.5 text-orange-400">{row.fault  > 0 ? row.fault  : <span className="text-slate-700">0</span>}</td>
              </tr>
            ))}
            {healthBySite.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-600">No devices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Event throughput counter ──────────────────────────────────────────────────

function EventThroughput() {
  const events = useStore(s => s.events)
  const [, tick] = useState(0)

  // Re-render every 10s to keep the count fresh
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const eventsLastMinute = useMemo(() => {
    const cutoff = Date.now() - 60_000
    return events.filter(e => new Date(e.timestamp).getTime() > cutoff).length
  }, [events, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const bufferPct = Math.round((events.length / MAX_EVENTS) * 100)

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Event throughput */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
        <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Events / Last Minute</div>
        <div className="text-3xl font-bold text-indigo-400">{eventsLastMinute}</div>
        <div className="text-[9px] text-slate-600 mt-1">events received in last 60s</div>
      </div>

      {/* Buffer usage */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
        <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Event Buffer</div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-slate-100">{events.length}</span>
          <span className="text-[10px] text-slate-600 mb-1">/ {MAX_EVENTS}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              bufferPct > 80 ? 'bg-red-500' : bufferPct > 50 ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${bufferPct}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-600 mt-1">{bufferPct}% full — oldest events dropped when full</div>
      </div>
    </div>
  )
}

// ── Alarm summary ─────────────────────────────────────────────────────────────

function AlarmSummary() {
  const alarms = useStore(s => s.alarms)

  const active       = alarms.filter(a => a.state === 'active').length
  const acknowledged = alarms.filter(a => a.state === 'acknowledged').length
  const escalated    = alarms.filter(a => a.state === 'escalated').length
  const cleared      = alarms.filter(a => a.state === 'cleared').length

  return (
    <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
      <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Alarm States</div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active',       count: active,       color: 'text-red-400',   bg: 'bg-red-500/10'    },
          { label: 'Acknowledged', count: acknowledged, color: 'text-amber-400', bg: 'bg-amber-500/10'  },
          { label: 'Escalated',    count: escalated,    color: 'text-orange-400',bg: 'bg-orange-500/10' },
          { label: 'Cleared',      count: cleared,      color: 'text-slate-400', bg: 'bg-slate-500/10'  },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-lg p-3 text-center`}>
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-[9px] text-slate-600 mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main SystemHealth page ────────────────────────────────────────────────────

export default function SystemHealth() {
  const inputDevices  = useStore(s => s.inputDevices)
  const outputDevices = useStore(s => s.outputDevices)

  const totalOnline  = [...inputDevices, ...outputDevices].filter(d => d.status === 'online').length
  const totalOffline = [...inputDevices, ...outputDevices].filter(d => d.status === 'offline').length
  const totalTamper  = [...inputDevices, ...outputDevices].filter(d => d.status === 'tamper').length
  const totalFault   = [...inputDevices, ...outputDevices].filter(d => d.status === 'fault').length

  const hasCritical = totalOffline + totalTamper + totalFault > 0

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <HeartPulse size={18} className={hasCritical ? 'text-red-400' : 'text-emerald-400'} />
          <h1 className="text-xl font-bold text-slate-100">System Health</h1>
        </div>
        {hasCritical && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
            <AlertTriangle size={11} />
            {totalOffline + totalTamper + totalFault} issues detected
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: 'Online Devices',  count: totalOnline,  color: 'text-emerald-400' },
          { label: 'Offline Devices', count: totalOffline, color: totalOffline > 0 ? 'text-red-400' : 'text-slate-600' },
          { label: 'Tamper Alerts',   count: totalTamper,  color: totalTamper  > 0 ? 'text-amber-400' : 'text-slate-600' },
          { label: 'Fault Alerts',    count: totalFault,   color: totalFault   > 0 ? 'text-orange-400' : 'text-slate-600' },
        ].map(item => (
          <div key={item.label} className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
            <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
          </div>
        ))}
      </div>

      <EventThroughput />
      <AlarmSummary />
      <DeviceHealthGrid />
      <ControllerGrid />
    </div>
  )
}
