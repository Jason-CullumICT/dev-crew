import { useState, useMemo, useCallback } from 'react'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import { useStore } from '../store/store'
import { evaluateAccess } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import type { StoreSnapshot } from '../types'

// ── Tab type ──────────────────────────────────────────────────────────────────

type ReportTab = 'audit' | 'alarm_response' | 'policy_gaps' | 'access_matrix'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ts
  }
}

function diffSeconds(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]): void {
  const header = rows[0]
  const body = rows.slice(1)
  const csv = [header, ...body]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab: Access Audit Trail ───────────────────────────────────────────────────

interface AuditFilters {
  dateFrom: string
  dateTo: string
  userId: string
  doorId: string
  siteId: string
}

function AccessAuditTab() {
  const events  = useStore(s => s.events)
  const users   = useStore(s => s.users)
  const doors   = useStore(s => s.doors)
  const sites   = useStore(s => s.sites)

  const [filters, setFilters] = useState<AuditFilters>({
    dateFrom: '',
    dateTo:   '',
    userId:   '',
    doorId:   '',
    siteId:   '',
  })

  const auditEvents = useMemo(() => {
    return events.filter(e => e.category === 'access')
  }, [events])

  const filtered = useMemo(() => {
    return auditEvents.filter(e => {
      if (filters.siteId  && e.siteId  !== filters.siteId)  return false
      if (filters.doorId  && e.doorId  !== filters.doorId)  return false
      if (filters.userId  && e.userId  !== filters.userId)  return false
      if (filters.dateFrom) {
        const ts = new Date(e.timestamp)
        const from = new Date(filters.dateFrom)
        if (ts < from) return false
      }
      if (filters.dateTo) {
        const ts = new Date(e.timestamp)
        const to = new Date(filters.dateTo)
        to.setDate(to.getDate() + 1) // inclusive
        if (ts > to) return false
      }
      return true
    })
  }, [auditEvents, filters])

  function handleExport() {
    const rows: string[][] = [
      ['Timestamp', 'User', 'Door', 'Action', 'Result', 'Site'],
      ...filtered.map(e => {
        const user = users.find(u => u.id === e.userId)
        const door = doors.find(d => d.id === e.doorId)
        const site = sites.find(s => s.id === e.siteId)
        return [
          formatTs(e.timestamp),
          user?.name ?? e.userId ?? '',
          door?.name ?? e.doorId ?? '',
          e.eventType,
          e.eventType === 'access_granted' ? 'Granted' : 'Denied',
          site?.name ?? e.siteId,
        ]
      }),
    ]
    downloadCsv('access-audit-trail.csv', rows)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Filters</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">Site</label>
            <select
              value={filters.siteId}
              onChange={e => setFilters(f => ({ ...f, siteId: e.target.value, doorId: '' }))}
              className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">User</label>
            <select
              value={filters.userId}
              onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
              className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">Door</label>
            <select
              value={filters.doorId}
              onChange={e => setFilters(f => ({ ...f, doorId: e.target.value }))}
              className="w-full text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Doors</option>
              {(filters.siteId
                ? doors.filter(d => d.siteId === filters.siteId)
                : doors
              ).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">{filtered.length} events (of {auditEvents.length} access events)</span>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-600/30 transition-colors"
        >
          <Download size={11} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-[#080b14] border-b border-[#1e293b]">
              <tr>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">User</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">Door</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">Action</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">Result</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">Site</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(e => {
                const user = users.find(u => u.id === e.userId)
                const door = doors.find(d => d.id === e.doorId)
                const site = sites.find(s => s.id === e.siteId)
                const granted = e.eventType === 'access_granted'
                return (
                  <tr key={e.id} className="border-b border-[#0d1220] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                    <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{user?.name ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{door?.name ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{e.eventType.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${granted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {granted ? 'Granted' : 'Denied'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{site?.name ?? e.siteId}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-600">
                    No access events match the current filters. Run the simulation to generate events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Alarm Response Times ─────────────────────────────────────────────────

function AlarmResponseTab() {
  const alarms = useStore(s => s.alarms)
  const sites  = useStore(s => s.sites)

  const cleared = useMemo(() => alarms.filter(a => a.state === 'cleared'), [alarms])

  const rows = useMemo(() => {
    return cleared.map(a => {
      const site = sites.find(s => s.id === a.siteId)
      const clearSecs = (a.acknowledgedAt && a.clearedAt)
        ? diffSeconds(a.acknowledgedAt, a.clearedAt)
        : null

      return {
        id:        a.id,
        title:     a.title,
        severity:  a.severity,
        site:      site?.name ?? a.siteId,
        ackSecs:   0, // alarm response time not directly trackable without trigger timestamp
        clearSecs: clearSecs ?? 0,
        clearedAt: a.clearedAt ?? '',
      }
    })
  }, [cleared, alarms, sites])

  // Average by site
  const bySite = useMemo(() => {
    const map: Record<string, { count: number; totalClear: number }> = {}
    rows.forEach(r => {
      if (!map[r.site]) map[r.site] = { count: 0, totalClear: 0 }
      map[r.site].count++
      map[r.site].totalClear += r.clearSecs
    })
    return Object.entries(map).map(([site, { count, totalClear }]) => ({
      site,
      count,
      avgClear: count > 0 ? Math.round(totalClear / count) : 0,
    }))
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Cleared Alarms</div>
          <div className="text-2xl font-bold text-slate-100">{cleared.length}</div>
        </div>
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Avg Clear Time</div>
          <div className="text-2xl font-bold text-slate-100">
            {rows.length > 0 ? formatDuration(Math.round(rows.reduce((s, r) => s + r.clearSecs, 0) / rows.length)) : '—'}
          </div>
        </div>
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Sites with Alarms</div>
          <div className="text-2xl font-bold text-slate-100">{bySite.length}</div>
        </div>
      </div>

      {/* Per-site summary */}
      {bySite.length > 0 && (
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1e293b] text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
            Summary by Site
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-[#0d1220]">
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Site</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Cleared Alarms</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Avg Clear Time</th>
              </tr>
            </thead>
            <tbody>
              {bySite.map(r => (
                <tr key={r.site} className="border-b border-[#0d1220]">
                  <td className="px-3 py-1.5 text-slate-300">{r.site}</td>
                  <td className="px-3 py-1.5 text-slate-400">{r.count}</td>
                  <td className="px-3 py-1.5 text-slate-400">{formatDuration(r.avgClear)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alarm details */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1e293b] text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
          Cleared Alarm Details
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-[11px] text-slate-600">
            No cleared alarms yet. Acknowledge and clear alarms on the Monitor page.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-[#080b14]">
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Title</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Severity</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Site</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Time to Clear</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Cleared At</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-[#0d1220]">
                    <td className="px-3 py-1.5 text-slate-300">{r.title}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        r.severity === 'critical' ? 'bg-red-500/10 text-red-400'
                        : r.severity === 'warning' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-500/10 text-slate-400'
                      }`}>{r.severity}</span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-400">{r.site}</td>
                    <td className="px-3 py-1.5 text-slate-400">{formatDuration(r.clearSecs)}</td>
                    <td className="px-3 py-1.5 text-slate-500">{r.clearedAt ? formatTs(r.clearedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: Policy Coverage Gaps ─────────────────────────────────────────────────

function PolicyGapsTab() {
  const doors             = useStore(s => s.doors)
  const users             = useStore(s => s.users)
  const groups            = useStore(s => s.groups)
  const grants            = useStore(s => s.grants)
  const policies          = useStore(s => s.policies)
  const antiPassbackConfigs = useStore(s => s.antiPassbackConfigs)
  const zones             = useStore(s => s.zones)

  const doorsWithNoPolicy = useMemo(() => {
    const coveredDoorIds = new Set(policies.flatMap(p => p.doorIds))
    return doors.filter(d => !coveredDoorIds.has(d.id))
  }, [doors, policies])

  const usersInNoGroup = useMemo(() => {
    const allMemberIds = new Set(
      groups.flatMap(g => g.members)
    )
    return users.filter(u => !allMemberIds.has(u.id) && u.status === 'active')
  }, [users, groups])

  const grantsWithNoSchedule = useMemo(() => {
    return grants.filter(g => !g.scheduleId)
  }, [grants])

  const zonesWithNoAntiPassback = useMemo(() => {
    const configuredZoneIds = new Set(antiPassbackConfigs.map(c => c.zoneId))
    return zones.filter(z => !configuredZoneIds.has(z.id))
  }, [zones, antiPassbackConfigs])

  function GapSection({ title, count, items, emptyMessage }: {
    title: string
    count: number
    items: string[]
    emptyMessage: string
  }) {
    return (
      <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold">{title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${count > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
            {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="px-4 py-3 text-[10px] text-slate-600">{emptyMessage}</p>
        ) : (
          <div className="px-4 py-2 max-h-[160px] overflow-y-auto">
            {items.slice(0, 50).map((item, i) => (
              <div key={i} className="py-1 text-[10px] text-slate-400 border-b border-[#0d1220] last:border-b-0">{item}</div>
            ))}
            {items.length > 50 && (
              <div className="py-1 text-[10px] text-slate-600">...and {items.length - 50} more</div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GapSection
        title="Doors with no policy assigned"
        count={doorsWithNoPolicy.length}
        items={doorsWithNoPolicy.map(d => d.name)}
        emptyMessage="All doors have at least one policy assigned."
      />
      <GapSection
        title="Active users in no group"
        count={usersInNoGroup.length}
        items={usersInNoGroup.map(u => `${u.name} (${u.department})`)}
        emptyMessage="All active users belong to at least one group."
      />
      <GapSection
        title="Grants with no schedule"
        count={grantsWithNoSchedule.length}
        items={grantsWithNoSchedule.map(g => `${g.name} (${g.scope})`)}
        emptyMessage="All grants have a schedule attached."
      />
      <GapSection
        title="Zones with no anti-passback config"
        count={zonesWithNoAntiPassback.length}
        items={zonesWithNoAntiPassback.map(z => z.name)}
        emptyMessage="All zones have anti-passback configured."
      />
    </div>
  )
}

// ── Tab: Access Matrix ────────────────────────────────────────────────────────

type MatrixCell = 'granted' | 'denied' | null

function AccessMatrixTab() {
  const users   = useStore(s => s.users)
  const doors   = useStore(s => s.doors)
  const groups  = useStore(s => s.groups)
  const grants  = useStore(s => s.grants)
  const schedules  = useStore(s => s.schedules)
  const policies   = useStore(s => s.policies)
  const sites      = useStore(s => s.sites)
  const zones      = useStore(s => s.zones)
  const controllers = useStore(s => s.controllers)

  const [matrix, setMatrix] = useState<MatrixCell[][] | null>(null)
  const [generating, setGenerating] = useState(false)

  const matrixUsers = useMemo(() => users.filter(u => u.status === 'active').slice(0, 50), [users])
  const matrixDoors = useMemo(() => doors.slice(0, 20), [doors])

  const generate = useCallback(() => {
    setGenerating(true)
    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      const now = buildNowContext()
      const snapshot: StoreSnapshot = {
        allUsers: users,
        allGroups: groups,
        allGrants: grants,
        allSchedules: schedules,
        allPolicies: policies,
        allDoors: doors,
        allZones: zones,
        allSites: sites,
        allControllers: controllers,
      }
      const result: MatrixCell[][] = matrixUsers.map(user =>
        matrixDoors.map(door => {
          try {
            const res = evaluateAccess(user, door, snapshot, now)
            return res.overallGranted ? 'granted' : 'denied'
          } catch {
            return 'denied'
          }
        })
      )
      setMatrix(result)
      setGenerating(false)
    }, 50)
  }, [users, doors, groups, grants, schedules, policies, zones, sites, controllers, matrixUsers, matrixDoors])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          Matrix: first {matrixUsers.length} active users x first {matrixDoors.length} doors.
          Computationally expensive — generated on demand.
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold hover:bg-indigo-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={11} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {!matrix && !generating && (
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg px-4 py-10 text-center text-[11px] text-slate-600">
          Click Generate to compute the access matrix.
        </div>
      )}

      {generating && (
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg px-4 py-10 text-center text-[11px] text-slate-500">
          Computing...
        </div>
      )}

      {matrix && !generating && (
        <div className="bg-[#080b14] border border-[#1e293b] rounded-lg overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            <table className="text-[8px] border-collapse">
              <thead className="sticky top-0 bg-[#080b14]">
                <tr>
                  <th className="sticky left-0 bg-[#080b14] px-2 py-1.5 text-left text-slate-500 font-semibold min-w-[120px] border-b border-r border-[#1e293b]">User</th>
                  {matrixDoors.map(d => (
                    <th key={d.id} className="px-1 py-1.5 text-slate-500 font-semibold border-b border-[#1e293b] whitespace-nowrap" title={d.name}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 80, overflow: 'hidden' }}>
                        {d.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, ui) => (
                  <tr key={matrixUsers[ui].id} className="border-b border-[#0d1220]">
                    <td className="sticky left-0 bg-[#080b14] px-2 py-1 text-slate-400 whitespace-nowrap border-r border-[#1e293b] font-medium">
                      {matrixUsers[ui].name}
                    </td>
                    {row.map((cell, di) => (
                      <td key={matrixDoors[di].id} className="px-1 py-1 text-center">
                        {cell === 'granted' ? (
                          <span className="inline-block w-4 h-4 rounded-sm bg-emerald-500/20 text-emerald-400 leading-4 text-center">✓</span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-sm bg-red-500/20 text-red-400 leading-4 text-center">✗</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-[#1e293b] flex items-center gap-4 text-[9px] text-slate-600">
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Granted</span>
            <span className="flex items-center gap-1"><span className="text-red-400">✗</span> Denied</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Reports page ─────────────────────────────────────────────────────────

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'audit',           label: 'Access Audit Trail' },
  { id: 'alarm_response',  label: 'Alarm Response Times' },
  { id: 'policy_gaps',     label: 'Policy Coverage Gaps' },
  { id: 'access_matrix',   label: 'Access Matrix' },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('audit')

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <BarChart3 size={18} className="text-indigo-400" />
        <h1 className="text-xl font-bold text-slate-100">Compliance Reports</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1e293b] shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-[11px] font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'audit'          && <AccessAuditTab />}
        {activeTab === 'alarm_response' && <AlarmResponseTab />}
        {activeTab === 'policy_gaps'    && <PolicyGapsTab />}
        {activeTab === 'access_matrix'  && <AccessMatrixTab />}
      </div>
    </div>
  )
}
