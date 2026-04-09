import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store/store'
import { hasPermission } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import type { SiteStatus, ZoneType, ZoneStatus } from '../types'

const SITE_STATUS_BADGE: Record<SiteStatus, string> = {
  Disarmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Armed:      'bg-red-500/10 text-red-400 border-red-500/20',
  PartialArm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Alarm:      'bg-red-600/20 text-red-300 border-red-600/30',
  Lockdown:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const ZONE_STATUS_BADGE: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
}

export default function Intrusion() {
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const users       = useStore(s => s.users)
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const schedules   = useStore(s => s.schedules)
  const armingLog   = useStore(s => s.armingLog)
  const updateSite  = useStore(s => s.updateSite)
  const updateZone  = useStore(s => s.updateZone)
  const addArmingLog = useStore(s => s.addArmingLog)

  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '')

  const selectedSite = sites.find(s => s.id === selectedSiteId) ?? null
  const siteZones    = zones.filter(z => z.siteId === selectedSiteId)
  const now          = buildNowContext()

  // Acting user = first active user with arm permission (for demo)
  const actingUser = users.find(u =>
    u.status === 'active' &&
    hasPermission(u, groups, grants, 'arm', now, schedules, selectedSiteId)
  ) ?? users.find(u => u.status === 'active') ?? users[0]

  const authorizedUsers = users.filter(u =>
    u.status === 'active' &&
    hasPermission(u, groups, grants, 'arm', now, schedules, selectedSiteId)
  )

  function log(action: string, result: 'Success' | 'Denied') {
    if (!actingUser || !selectedSite) return
    addArmingLog({
      id: uuidv4(), timestamp: new Date().toISOString(),
      userName: actingUser.name, action, siteName: selectedSite.name, result,
    })
  }

  function arm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Armed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Armed', 'Success')
  }

  function disarm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Disarmed', 'Success')
  }

  function partialArm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'PartialArm' })
    const perimeterTypes: ZoneType[] = ['Perimeter']
    const interiorTypes: ZoneType[]  = ['Interior', 'Public']
    siteZones.forEach(z => {
      if (perimeterTypes.includes(z.type)) updateZone({ ...z, status: 'Armed' })
      else if (interiorTypes.includes(z.type)) updateZone({ ...z, status: 'Disarmed' })
    })
    log('Partial Arm', 'Success')
  }

  function lockdown() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Lockdown' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Lockdown', 'Success')
  }

  function clearAlarm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Clear Alarm', 'Success')
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h1 className="text-xl font-bold text-slate-100">Intrusion Control</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: site + zones + authorized users */}
        <div className="lg:col-span-2 space-y-4">
          {/* Site selector */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <label className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Site</label>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSite && (
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${SITE_STATUS_BADGE[selectedSite.status]}`}>
                  {selectedSite.status}
                </span>
                <span className="text-[10px] text-slate-500">{selectedSite.address}</span>
              </div>
            )}
          </div>

          {/* Zone statuses */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Zone Statuses</div>
            {siteZones.length === 0
              ? <p className="text-[11px] text-slate-600">No zones found for this site.</p>
              : (
                <div className="divide-y divide-[#141828]">
                  {siteZones.map(zone => (
                    <div key={zone.id} className="py-2.5 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-[11px] font-medium text-slate-300">{zone.name}</div>
                        <div className="text-[9px] text-slate-600">{zone.type}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ZONE_STATUS_BADGE[zone.status]}`}>
                        {zone.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Authorized users */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3">
              Arm/Disarm Permission — {authorizedUsers.length} users
            </div>
            {authorizedUsers.length === 0
              ? <p className="text-[11px] text-slate-600">No users have arm permission for this site right now.</p>
              : (
                <div className="space-y-2">
                  {authorizedUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 text-[11px]">
                      <div className="w-6 h-6 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[9px] font-bold text-slate-400">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-slate-300">{u.name}</span>
                      <span className="text-slate-600 text-[9px]">{u.department}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Right: actions + log */}
        <div className="space-y-4">
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Actions</div>
            {[
              { label: 'Arm Site',         fn: arm,       cls: 'bg-red-700 hover:bg-red-600' },
              { label: 'Disarm Site',      fn: disarm,    cls: 'bg-emerald-700 hover:bg-emerald-600' },
              { label: 'Partial Arm',      fn: partialArm,cls: 'bg-amber-600 hover:bg-amber-500' },
              { label: 'Trigger Lockdown', fn: lockdown,  cls: 'bg-purple-700 hover:bg-purple-600' },
              { label: 'Clear Alarm',      fn: clearAlarm,cls: 'bg-blue-700 hover:bg-blue-600' },
            ].map(({ label, fn, cls }) => (
              <button
                key={label}
                onClick={fn}
                disabled={!selectedSite}
                className={`w-full py-2.5 rounded-lg text-white text-[12px] font-semibold transition-colors disabled:bg-[#1e293b] disabled:text-slate-600 disabled:cursor-not-allowed ${cls}`}
              >
                {label}
              </button>
            ))}
            {actingUser && (
              <p className="text-[9px] text-slate-600 pt-1">Acting as: {actingUser.name}</p>
            )}
          </div>

          {/* Arming log */}
          {armingLog.length > 0 && (
            <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Log</div>
              <div className="space-y-1.5">
                {armingLog.slice(0, 8).map(entry => (
                  <div key={entry.id} className="text-[9px] text-slate-600 font-mono">
                    <span className="text-slate-500">{entry.userName}</span>
                    {' '}→ <span className="text-slate-400">{entry.action}</span>
                    {' · '}{entry.siteName}
                    {' · '}<span className={entry.result === 'Success' ? 'text-emerald-600' : 'text-red-600'}>{entry.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
