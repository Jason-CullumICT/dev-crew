import { useState, useMemo } from 'react'
import { UserCheck, ChevronDown, ChevronRight, AlertTriangle, Users } from 'lucide-react'
import { useStore } from '../store/store'

export default function Muster() {
  const zones         = useStore(s => s.zones)
  const sites         = useStore(s => s.sites)
  const users         = useStore(s => s.users)
  const zoneOccupancy = useStore(s => s.zoneOccupancy)
  const musterActive  = useStore(s => s.musterActive)
  const setMusterActive     = useStore(s => s.setMusterActive)
  const updateZoneOccupancy = useStore(s => s.updateZoneOccupancy)

  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())

  // Build occupancy map zoneId → userIds
  const occupancyMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const occ of zoneOccupancy) {
      map.set(occ.zoneId, occ.userIds)
    }
    return map
  }, [zoneOccupancy])

  // Group zones by site
  const zonesBySite = useMemo(() => {
    const bySite = new Map<string, typeof zones>()
    for (const zone of zones) {
      const existing = bySite.get(zone.siteId) ?? []
      existing.push(zone)
      bySite.set(zone.siteId, existing)
    }
    return bySite
  }, [zones])

  function toggleExpand(zoneId: string) {
    setExpandedZones(prev => {
      const next = new Set(prev)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return next
    })
  }

  function handleStartMuster() {
    // Seed zone occupancy from a random sample of users for demo purposes.
    // In a real system this would be derived from the live event log.
    const activeUsers = users.filter(u => u.status === 'active')
    zones.forEach((zone, i) => {
      // Place 0-4 users in each zone deterministically using zone index
      const count = (i * 3 + 7) % 5 // yields 0-4
      const sample = activeUsers
        .slice((i * 7) % Math.max(1, activeUsers.length - count), (i * 7) % Math.max(1, activeUsers.length - count) + count)
        .map(u => u.id)
      if (sample.length > 0) {
        updateZoneOccupancy(zone.id, sample)
      }
    })
    setMusterActive(true)
  }

  function handleEndMuster() {
    setMusterActive(false)
    // Clear all zone occupancy
    zones.forEach(zone => updateZoneOccupancy(zone.id, []))
  }

  const totalInside = Array.from(occupancyMap.values()).reduce((s, ids) => s + ids.length, 0)
  const zonesWithPeople = Array.from(occupancyMap.values()).filter(ids => ids.length > 0).length

  return (
    <div className="p-6 flex flex-col h-full overflow-y-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <UserCheck size={20} className="text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">Muster Report</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Zone occupancy tracking and evacuation accountability</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {musterActive ? (
            <button
              onClick={handleEndMuster}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-[11px] font-semibold hover:bg-slate-600 transition-colors border border-slate-500"
            >
              End Muster
            </button>
          ) : (
            <button
              onClick={handleStartMuster}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-600 transition-colors"
            >
              Start Muster
            </button>
          )}
        </div>
      </div>

      {/* Muster active banner */}
      {musterActive && (
        <div className="shrink-0 flex items-center gap-3 bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <div>
            <div className="text-[12px] font-semibold text-amber-300">Muster Mode Active</div>
            <div className="text-[10px] text-amber-500 mt-0.5">
              {totalInside} person{totalInside !== 1 ? 's' : ''} unaccounted across {zonesWithPeople} zone{zonesWithPeople !== 1 ? 's' : ''}. Ensure all personnel check out at their muster point.
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Total Zones</div>
          <div className="text-2xl font-bold text-slate-200">{zones.length}</div>
        </div>
        <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Occupied Zones</div>
          <div className={`text-2xl font-bold ${zonesWithPeople > 0 && musterActive ? 'text-amber-400' : 'text-slate-200'}`}>
            {zonesWithPeople}
          </div>
        </div>
        <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">People Inside</div>
          <div className={`text-2xl font-bold ${totalInside > 0 && musterActive ? 'text-red-400' : 'text-slate-200'}`}>
            {totalInside}
          </div>
        </div>
      </div>

      {/* Zone grid by site */}
      <div className="flex-1 space-y-6 min-h-0 overflow-y-auto">
        {sites.map(site => {
          const siteZones = zonesBySite.get(site.id) ?? []
          if (siteZones.length === 0) return null

          return (
            <div key={site.id}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                {site.name}
              </div>
              <div className="grid gap-2">
                {siteZones.map(zone => {
                  const insideIds = occupancyMap.get(zone.id) ?? []
                  const count     = insideIds.length
                  const expanded  = expandedZones.has(zone.id)
                  const isAlert   = musterActive && count > 0

                  return (
                    <div
                      key={zone.id}
                      className={`bg-[#0a0d14] border rounded-lg overflow-hidden transition-colors ${
                        isAlert ? 'border-amber-700/50' : 'border-[#1e293b]'
                      }`}
                    >
                      {/* Zone header row */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                        onClick={() => count > 0 && toggleExpand(zone.id)}
                        disabled={count === 0}
                      >
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                          zone.type === 'Restricted' || zone.type === 'Secure'
                            ? 'text-red-300 border-red-800/50 bg-red-900/20'
                            : zone.type === 'Perimeter'
                              ? 'text-blue-300 border-blue-800/50 bg-blue-900/20'
                              : 'text-slate-400 border-slate-700/50 bg-slate-800/20'
                        }`}>
                          {zone.type}
                        </span>

                        <span className={`flex-1 text-[12px] font-medium ${isAlert ? 'text-amber-200' : 'text-slate-200'}`}>
                          {zone.name}
                        </span>

                        <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                          isAlert ? 'text-amber-400' : count > 0 ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          <Users size={12} />
                          {count} inside
                        </span>

                        {count > 0 && (
                          <span className="text-slate-600 ml-1">
                            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                        )}
                      </button>

                      {/* Expanded people list */}
                      {expanded && count > 0 && (
                        <div className="border-t border-[#1e293b] px-4 py-2 bg-[#07090f]">
                          <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-2">
                            People inside zone
                          </div>
                          <div className="space-y-1">
                            {insideIds.map(uid => {
                              const u = users.find(x => x.id === uid)
                              if (!u) return null
                              return (
                                <div key={uid} className="flex items-center gap-2 text-[11px]">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isAlert ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                  <span className="text-slate-300 font-medium">{u.name}</span>
                                  <span className="text-slate-600">{u.department} · {u.role}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
