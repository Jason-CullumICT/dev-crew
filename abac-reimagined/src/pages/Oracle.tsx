import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useStore } from '../store/store'
import { evaluateAccess } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import type { User, Door, ActionType, AccessResult } from '../types'

type QueryMode = 'who-can-access' | 'what-can-person-access'

interface ResultRow {
  user: User
  door: Door
  result: AccessResult
}

interface QueryCache {
  userId: string
  doorId: string
  action: ActionType
  mode: QueryMode
  useNow: boolean
  overrideHour: number
  simulateHoliday: boolean
  storeVersion: number
  rows: ResultRow[]
}

export default function Oracle() {
  const users     = useStore(s => s.users)
  const doors     = useStore(s => s.doors)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const policies  = useStore(s => s.policies)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)
  const controllers = useStore(s => s.controllers)

  const [mode, setMode] = useState<QueryMode>('who-can-access')
  const [selectedDoorId, setSelectedDoorId] = useState(doors[0]?.id ?? '')
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '')
  const [selectedAction, setSelectedAction] = useState<ActionType>('unlock')
  const [useNow, setUseNow] = useState(true)
  const [overrideHour, setOverrideHour] = useState(10)
  const [simulateHoliday, setSimulateHoliday] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [evaluatingLabel, setEvaluatingLabel] = useState('')

  // Store version — increments whenever any store data changes so cache is invalidated
  const storeVersionRef = useRef(0)
  const prevStoreKeyRef = useRef('')

  const storeKey = useMemo(
    () => [users.length, doors.length, groups.length, grants.length,
           schedules.length, policies.length, zones.length, sites.length,
           controllers.length].join('-'),
    [users, doors, groups, grants, schedules, policies, zones, sites, controllers]
  )

  useEffect(() => {
    if (prevStoreKeyRef.current !== '' && prevStoreKeyRef.current !== storeKey) {
      storeVersionRef.current += 1
    }
    prevStoreKeyRef.current = storeKey
  }, [storeKey])

  // Query result cache
  const cacheRef = useRef<QueryCache | null>(null)

  const navigate = useNavigate()

  const store = useMemo(() => ({
    allUsers: users, allGroups: groups, allGrants: grants,
    allSchedules: schedules, allPolicies: policies, allDoors: doors,
    allZones: zones, allSites: sites, allControllers: controllers,
  }), [users, groups, grants, schedules, policies, doors, zones, sites, controllers])

  function buildNow() {
    const base = buildNowContext()
    if (useNow && !simulateHoliday) return base
    const hour = useNow ? base.hour : overrideHour
    const holidayOverride = simulateHoliday ? { month: 12, day: 25, date: `${base.date.slice(0, 4)}-12-25` } : {}
    return { ...base, hour, ...holidayOverride }
  }

  function currentCacheKey(): Omit<QueryCache, 'rows'> {
    return {
      userId: selectedUserId,
      doorId: selectedDoorId,
      action: selectedAction,
      mode,
      useNow,
      overrideHour,
      simulateHoliday,
      storeVersion: storeVersionRef.current,
    }
  }

  function isCacheHit(key: Omit<QueryCache, 'rows'>): ResultRow[] | null {
    const c = cacheRef.current
    if (!c) return null
    if (
      c.userId === key.userId &&
      c.doorId === key.doorId &&
      c.action === key.action &&
      c.mode === key.mode &&
      c.useNow === key.useNow &&
      c.overrideHour === key.overrideHour &&
      c.simulateHoliday === key.simulateHoliday &&
      c.storeVersion === key.storeVersion
    ) {
      return c.rows
    }
    return null
  }

  function runQuery() {
    const key = currentCacheKey()
    const cached = isCacheHit(key)

    if (cached) {
      setResults(cached)
      setHasRun(true)
      return
    }

    setLoading(true)
    setHasRun(true)
    setProgress(0)

    const total = mode === 'who-can-access' ? users.length : doors.length
    const label = mode === 'who-can-access'
      ? `Evaluating ${total} users...`
      : `Evaluating ${total} doors...`
    setEvaluatingLabel(label)

    // Animate progress bar during evaluation
    let current = 0
    const intervalMs = Math.max(8, Math.floor(400 / total))
    const progressInterval = setInterval(() => {
      current += 1
      setProgress(Math.round((current / total) * 90))
      if (current >= total) clearInterval(progressInterval)
    }, intervalMs)

    setTimeout(() => {
      clearInterval(progressInterval)

      const now = buildNow()
      let rows: ResultRow[] = []

      if (mode === 'who-can-access') {
        const door = doors.find(d => d.id === selectedDoorId)
        if (!door) { setLoading(false); return }
        rows = users.map(user => ({
          user,
          door,
          result: evaluateAccess(user, door, store, now, selectedAction),
        }))
      } else {
        const user = users.find(u => u.id === selectedUserId)
        if (!user) { setLoading(false); return }
        rows = doors.map(door => ({
          user,
          door,
          result: evaluateAccess(user, door, store, now, selectedAction),
        }))
      }

      rows.sort((a, b) => (b.result.overallGranted ? 1 : 0) - (a.result.overallGranted ? 1 : 0))

      // Store in cache
      cacheRef.current = { ...key, rows }

      // Flash to 100% briefly before showing results
      setProgress(100)
      setEvaluatingLabel(`Done — ${rows.filter(r => r.result.overallGranted).length} granted`)

      setTimeout(() => {
        setResults(rows)
        setLoading(false)
        setProgress(0)
      }, 350)
    }, 0)
  }

  const granted  = results?.filter(r => r.result.overallGranted) ?? []
  const denied   = results?.filter(r => !r.result.overallGranted) ?? []

  function reasonSummary(row: ResultRow): string {
    const { result } = row
    if (!result.permissionGranted) {
      return 'No grant covers this door'
    }
    if (!result.abacPassed) {
      const failedRule = result.policyResults.flatMap(p => p.ruleResults).find(r => !r.passed)
      return failedRule
        ? `Policy: ${failedRule.leftSide} ${failedRule.operator} ${Array.isArray(failedRule.rightSide) ? failedRule.rightSide.join(',') : failedRule.rightSide} \u2192 ${failedRule.leftResolved}`
        : 'Policy check failed'
    }
    const chain = result.groupChain.join(' \u2192 ')
    const grantNames = result.matchedGrants.join(', ')
    return chain ? `${chain} \u2192 ${grantNames}` : grantNames
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0b0e18]">
      {/* Query type tabs */}
      <div className="flex border-b border-[#141828] shrink-0">
        {(['who-can-access', 'what-can-person-access'] as QueryMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults(null); setHasRun(false) }}
            className={`px-5 py-3 text-[11px] font-semibold border-b-2 transition-colors ${
              mode === m
                ? 'text-violet-300 border-violet-500 bg-violet-500/[0.04]'
                : 'text-[#374151] border-transparent hover:text-slate-400'
            }`}
          >
            {m === 'who-can-access' ? 'Who can access?' : 'What can a person access?'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Query form */}
        <div className="w-80 border-r border-[#141828] flex flex-col p-4 gap-4 shrink-0 overflow-y-auto">
          {mode === 'who-can-access' ? (
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Door</label>
              <select
                value={selectedDoorId}
                onChange={e => setSelectedDoorId(e.target.value)}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
              >
                {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Person</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Action</label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as ActionType)}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
            >
              {(['unlock','arm','disarm','lockdown','view_logs','override'] as ActionType[]).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Time</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useNow} onChange={e => setUseNow(e.target.checked)} className="accent-violet-500" />
              <span className="text-[11px] text-slate-400">Use current time</span>
            </label>
            {!useNow && (
              <input
                type="number"
                min={0} max={23}
                value={overrideHour}
                onChange={e => setOverrideHour(Number(e.target.value))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
                placeholder="Hour (0-23)"
              />
            )}
          </div>

          <div
            className="flex items-center justify-between bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 cursor-pointer"
            onClick={() => setSimulateHoliday(s => !s)}
          >
            <div>
              <div className="text-[11px] text-slate-400">Simulate holiday</div>
              <div className="text-[9px] text-[#374151]">Tests Christmas Day rules</div>
            </div>
            <div style={{ width: 32, height: 18 }}
              className={`rounded-full transition-colors relative ${simulateHoliday ? 'bg-violet-600' : 'bg-[#1e293b]'}`}>
              <div style={{ width: 14, height: 14 }}
                className={`absolute top-0.5 rounded-full bg-white transition-all ${simulateHoliday ? 'left-[14px]' : 'left-0.5'}`} />
            </div>
          </div>

          <button
            onClick={runQuery}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[12px] font-bold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-[0_4px_16px_rgba(99,102,241,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Evaluating...' : 'Run Query'}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Progress bar overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0b0e18]/90 gap-4">
              <div className="text-[11px] text-slate-400 font-mono tracking-wide">
                {evaluatingLabel}
              </div>
              <div className="w-64 h-1 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[9px] text-[#374151]">{progress}%</div>
            </div>
          )}

          {!hasRun ? (
            <div className="flex-1 flex items-center justify-center text-[#374151] text-[12px]">
              Configure a query and click Run
            </div>
          ) : (
            <>
              {/* Results header */}
              <div className="px-4 py-3 border-b border-[#141828] flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-semibold text-slate-200">
                  {results?.length ?? 0} evaluated
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20 font-semibold">
                  {granted.length} granted
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-red-500/[0.08] text-red-400 border-red-500/20 font-semibold">
                  {denied.length} denied
                </span>
                {simulateHoliday && (
                  <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 px-2 py-0.5 rounded">
                    Christmas Day rules in effect
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Granted */}
                {granted.map(row => (
                  <div key={`${row.user.id}-${row.door.id}`}
                    className="bg-[#0f1320] border-l-2 border-emerald-500 border border-[#1e293b] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-[#374151] transition-colors cursor-pointer"
                    onClick={() => navigate('/reasoner', { state: { userId: row.user.id, doorId: row.door.id } })}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0f2d1a] flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      {row.user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-100">
                        {mode === 'who-can-access' ? row.user.name : row.door.name}
                      </div>
                      <div className="text-[9px] text-[#374151] truncate">{reasonSummary(row)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GRANTED</span>
                      <span className="text-[9px] text-[#374151] flex items-center gap-1 hover:text-cyan-400">
                        <Activity size={9} /> Trace
                      </span>
                    </div>
                  </div>
                ))}

                {denied.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-[#141828]" />
                    <span className="text-[9px] text-[#374151]">{denied.length} denied</span>
                    <div className="flex-1 h-px bg-[#141828]" />
                  </div>
                )}

                {/* Denied */}
                {denied.map(row => (
                  <div key={`${row.user.id}-${row.door.id}`}
                    className="bg-[#0f1320] border-l-2 border-red-900 border border-[#1e293b] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-[#374151] transition-colors cursor-pointer"
                    onClick={() => navigate('/reasoner', { state: { userId: row.user.id, doorId: row.door.id } })}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1a0a0a] flex items-center justify-center text-[10px] font-bold text-red-400/50 shrink-0">
                      {row.user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-400">
                        {mode === 'who-can-access' ? row.user.name : row.door.name}
                      </div>
                      <div className="text-[9px] text-red-900 truncate">{reasonSummary(row)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/[0.08] text-red-400">DENIED</span>
                      <span className="text-[9px] text-[#374151] flex items-center gap-1 hover:text-cyan-400">
                        <Activity size={9} /> Trace
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
