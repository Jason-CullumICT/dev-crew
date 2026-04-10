import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
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

// Valid transitions: from current status → set of reachable statuses
const VALID_TRANSITIONS: Record<SiteStatus, Set<SiteStatus>> = {
  Disarmed:   new Set(['Armed', 'PartialArm', 'Lockdown']),
  Armed:      new Set(['Disarmed', 'Lockdown']),
  PartialArm: new Set(['Armed', 'Disarmed', 'Lockdown']),
  Alarm:      new Set(['Disarmed', 'Lockdown']),
  Lockdown:   new Set(['Disarmed']),
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
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSiteDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedSite = sites.find(s => s.id === selectedSiteId) ?? null
  const siteZones    = zones.filter(z => z.siteId === selectedSiteId)
  const now          = buildNowContext()

  // M3: Memoize authorized users — only recompute when dependencies change
  const authorizedUsers = useMemo(() =>
    users.filter(u =>
      u.status === 'active' &&
      hasPermission(u, groups, grants, 'arm', now, schedules, selectedSiteId)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, groups, grants, schedules, selectedSiteId]
  )

  // C2: Acting user is the first authorized user only — no fallback to any active user
  const actingUser = authorizedUsers[0] ?? null

  // C2: Check if acting user has permission for a specific action
  function canAct(action: Parameters<typeof hasPermission>[3]): boolean {
    if (!actingUser || !selectedSite) return false
    return hasPermission(actingUser, groups, grants, action, now, schedules, selectedSiteId)
  }

  // C3: Check if a transition to targetStatus is valid from current site status
  function canTransitionTo(targetStatus: SiteStatus): boolean {
    if (!selectedSite) return false
    return VALID_TRANSITIONS[selectedSite.status].has(targetStatus)
  }

  // C3: Lockdown → Disarmed requires 'override' or 'lockdown' action permission
  function canDisarmFromLockdown(): boolean {
    if (!actingUser || !selectedSite) return false
    return (
      hasPermission(actingUser, groups, grants, 'override', now, schedules, selectedSiteId) ||
      hasPermission(actingUser, groups, grants, 'lockdown', now, schedules, selectedSiteId)
    )
  }

  function log(action: string, result: 'Success' | 'Denied') {
    // Log with acting user if available; for Denied entries use a fallback label
    const userName = actingUser?.name ?? 'Unknown'
    if (!selectedSite) return
    addArmingLog({
      id: uuidv4(), timestamp: new Date().toISOString(),
      userName, action, siteName: selectedSite.name, result,
    })
  }

  function arm() {
    if (!selectedSite) return
    // C2: check permission
    if (!canAct('arm')) { log('Armed', 'Denied'); return }
    // C3: check valid transition
    if (!canTransitionTo('Armed')) { log('Armed', 'Denied'); return }
    updateSite({ ...selectedSite, status: 'Armed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Armed', 'Success')
  }

  function disarm() {
    if (!selectedSite) return
    // C2: check permission
    if (!canAct('disarm')) { log('Disarmed', 'Denied'); return }
    // C3: Lockdown → Disarmed requires override or lockdown action
    if (selectedSite.status === 'Lockdown' && !canDisarmFromLockdown()) {
      log('Disarmed', 'Denied'); return
    }
    if (!canTransitionTo('Disarmed')) { log('Disarmed', 'Denied'); return }
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Disarmed', 'Success')
  }

  function partialArm() {
    if (!selectedSite) return
    if (!canAct('arm')) { log('Partial Arm', 'Denied'); return }
    if (!canTransitionTo('PartialArm')) { log('Partial Arm', 'Denied'); return }
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
    if (!canAct('lockdown')) { log('Lockdown', 'Denied'); return }
    if (!canTransitionTo('Lockdown')) { log('Lockdown', 'Denied'); return }
    updateSite({ ...selectedSite, status: 'Lockdown' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Lockdown', 'Success')
  }

  function clearAlarm() {
    if (!selectedSite) return
    if (!canAct('disarm')) { log('Clear Alarm', 'Denied'); return }
    // C3: clearAlarm only valid when status is Alarm (targets Disarmed)
    if (selectedSite.status !== 'Alarm') { log('Clear Alarm', 'Denied'); return }
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Clear Alarm', 'Success')
  }

  // C2+C3: Compute disabled state for each button
  const noAuth = authorizedUsers.length === 0
  const currentStatus = selectedSite?.status ?? 'Disarmed'

  const armDisabled     = noAuth || !selectedSite || !canTransitionTo('Armed')    || !canAct('arm')
  const disarmDisabled  = noAuth || !selectedSite || !canTransitionTo('Disarmed') || !canAct('disarm') ||
                          (currentStatus === 'Lockdown' && !canDisarmFromLockdown())
  const partialDisabled = noAuth || !selectedSite || !canTransitionTo('PartialArm') || !canAct('arm')
  const lockdownDisabled= noAuth || !selectedSite || !canTransitionTo('Lockdown') || !canAct('lockdown')
  const clearDisabled   = noAuth || !selectedSite || currentStatus !== 'Alarm'     || !canAct('disarm')

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h1 className="text-xl font-bold text-slate-100">Intrusion Control</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: site + zones + authorized users */}
        <div className="lg:col-span-2 space-y-4">
          {/* Site selector */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <label className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Site</label>
            <div ref={dropdownRef} className="relative">
              {/* Trigger */}
              <button
                onClick={() => setSiteDropdownOpen(o => !o)}
                className="w-full bg-[#111827] border border-[#1e293b] hover:border-slate-600 rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500 flex items-center gap-2 transition-colors"
              >
                {selectedSite && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${SITE_STATUS_BADGE[selectedSite.status]}`}>
                    {selectedSite.status}
                  </span>
                )}
                <span className="flex-1 text-left truncate">{selectedSite?.name ?? 'Select site…'}</span>
                <ChevronDown size={12} className={`text-slate-500 transition-transform shrink-0 ${siteDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown list */}
              {siteDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-[#111827] border border-[#1e293b] rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                  {sites.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSiteId(s.id); setSiteDropdownOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors ${s.id === selectedSiteId ? 'bg-white/[0.03]' : ''}`}
                    >
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${SITE_STATUS_BADGE[s.status]}`}>
                        {s.status}
                      </span>
                      <span className="text-[12px] text-slate-200 flex-1 truncate">{s.name}</span>
                      <span className="text-[9px] text-slate-600 truncate hidden sm:block">{s.address.split(',').slice(-2).join(',').trim()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSite && (
              <div className="text-[10px] text-slate-500">{selectedSite.address}</div>
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
              { label: 'Arm Site',         fn: arm,       cls: 'bg-red-700 hover:bg-red-600',         disabled: armDisabled },
              { label: 'Disarm Site',      fn: disarm,    cls: 'bg-emerald-700 hover:bg-emerald-600',  disabled: disarmDisabled },
              { label: 'Partial Arm',      fn: partialArm,cls: 'bg-amber-600 hover:bg-amber-500',      disabled: partialDisabled },
              { label: 'Trigger Lockdown', fn: lockdown,  cls: 'bg-purple-700 hover:bg-purple-600',    disabled: lockdownDisabled },
              { label: 'Clear Alarm',      fn: clearAlarm,cls: 'bg-blue-700 hover:bg-blue-600',        disabled: clearDisabled },
            ].map(({ label, fn, cls, disabled }) => (
              <button
                key={label}
                onClick={fn}
                disabled={disabled}
                className={`w-full py-2.5 rounded-lg text-white text-[12px] font-semibold transition-colors disabled:bg-[#1e293b] disabled:text-slate-600 disabled:cursor-not-allowed ${cls}`}
              >
                {label}
              </button>
            ))}
            {actingUser
              ? <p className="text-[9px] text-slate-600 pt-1">Acting as: {actingUser.name}</p>
              : <p className="text-[9px] text-red-700 pt-1">No authorized user</p>
            }
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
