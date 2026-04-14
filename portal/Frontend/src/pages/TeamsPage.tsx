import React, { useState, useEffect, useCallback } from 'react'
import { teams, TeamDispatchRecord } from '../api/client'

interface DispatchResult {
  actionsUrl: string
  workflow: string
  repo: string
  team: string
}

// ── Shared helpers ────────────────────────────────────────────────

function TeamCard({ title, icon, description, children }: {
  title: string
  icon: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  )
}

function StatusBanner({ result, error }: { result: DispatchResult | null; error: string | null }) {
  if (error) {
    return (
      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
        {error}
      </div>
    )
  }
  if (result) {
    return (
      <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
        Dispatched! Check progress on{' '}
        <a href={result.actionsUrl} target="_blank" rel="noreferrer" className="underline font-medium">
          GitHub Actions
        </a>
      </div>
    )
  }
  return null
}

const TEAM_META: Record<string, { label: string; color: string }> = {
  TheInspector: { label: 'Inspector', color: 'bg-blue-100 text-blue-800' },
  TheGuardians: { label: 'Guardians', color: 'bg-red-100 text-red-800' },
  TheDesigners: { label: 'Designers', color: 'bg-purple-100 text-purple-800' },
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function inputsSummary(inputs: Record<string, string>): string {
  return Object.entries(inputs)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ') || '—'
}

// ── Inspector ────────────────────────────────────────────────────

function InspectorPanel({ onDispatched }: { onDispatched: (r: DispatchResult, inputs: Record<string, string>) => void }) {
  const [focus, setFocus] = useState('')
  const [mode, setMode] = useState<'static' | 'dynamic'>('static')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DispatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dispatch = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const inputs: Record<string, string> = { mode }
      if (focus.trim()) inputs.focus = focus.trim()
      const r = await teams.dispatch('TheInspector', inputs)
      const dr: DispatchResult = { actionsUrl: r.actionsUrl, workflow: r.workflow, repo: r.repo, team: r.team }
      setResult(dr)
      onDispatched(dr, inputs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TeamCard
      title="TheInspector — Health Audit"
      icon="🔍"
      description="Spec-drift, CVE scanning, performance profiling (dynamic mode), chaos testing. Produces a graded A–F report as a PR."
    >
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Focus areas <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. auth routes, state machine"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Audit mode</label>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
          {(['static', 'dynamic'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === m ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {m === 'static' ? 'Static (no env)' : 'Dynamic (spins up services)'}
            </button>
          ))}
        </div>
      </div>

      <StatusBanner result={result} error={error} />

      <button
        onClick={dispatch}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Dispatching…' : 'Run Health Audit'}
      </button>
    </TeamCard>
  )
}

// ── Guardians ────────────────────────────────────────────────────

function GuardiansPanel({ onDispatched }: { onDispatched: (r: DispatchResult, inputs: Record<string, string>) => void }) {
  const [scope, setScope] = useState<'full' | 'targeted'>('full')
  const [focus, setFocus] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DispatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dispatch = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const inputs: Record<string, string> = { scope }
      if (focus.trim()) inputs.focus = focus.trim()
      const r = await teams.dispatch('TheGuardians', inputs)
      const dr: DispatchResult = { actionsUrl: r.actionsUrl, workflow: r.workflow, repo: r.repo, team: r.team }
      setResult(dr)
      onDispatched(dr, inputs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TeamCard
      title="TheGuardians — Security Audit"
      icon="🛡️"
      description="SAST, pen testing, red-teaming (ephemeral env only), SOC2/GDPR/OWASP compliance. Produces a graded security report as a PR."
    >
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Scope</label>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
          {(['full', 'targeted'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${scope === s ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {scope === 'targeted' && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Focus area</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. auth endpoints, file uploads"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <StatusBanner result={result} error={error} />

      <button
        onClick={dispatch}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Dispatching…' : 'Run Security Audit'}
      </button>
    </TeamCard>
  )
}

// ── Designers ────────────────────────────────────────────────────

function DesignersPanel({ onDispatched }: { onDispatched: (r: DispatchResult, inputs: Record<string, string>) => void }) {
  const [brief, setBrief] = useState('')
  const [issueNumber, setIssueNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DispatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dispatch = async () => {
    if (!brief.trim()) { setError('Design brief is required'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const inputs: Record<string, string> = { design_brief: brief.trim() }
      if (issueNumber.trim()) inputs.issue_number = issueNumber.trim()
      const r = await teams.dispatch('TheDesigners', inputs)
      const dr: DispatchResult = { actionsUrl: r.actionsUrl, workflow: r.workflow, repo: r.repo, team: r.team }
      setResult(dr)
      onDispatched(dr, inputs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TeamCard
      title="TheDesigners — Design Pipeline"
      icon="🎨"
      description="UX research, 2–3 visual options with screenshots, design systems check, WCAG 2.1 AA audit. Creates a PR requiring your approval before implementation."
    >
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Design brief <span className="text-red-500">*</span>
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe what needs designing. E.g. 'Dashboard page showing run history with filter controls and a metrics summary widget'"
          rows={3}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          GitHub issue number <span className="text-gray-400">(optional — links design PR to the issue)</span>
        </label>
        <input
          type="number"
          value={issueNumber}
          onChange={(e) => setIssueNumber(e.target.value)}
          placeholder="42"
          className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <StatusBanner result={result} error={error} />

      <button
        onClick={dispatch}
        disabled={loading || !brief.trim()}
        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Dispatching…' : 'Run Design Pipeline'}
      </button>
    </TeamCard>
  )
}

// ── History ───────────────────────────────────────────────────────

function DispatchHistory({ dispatches, loading }: { dispatches: TeamDispatchRecord[]; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-gray-400">Loading history…</p>
  }
  if (dispatches.length === 0) {
    return <p className="text-sm text-gray-400">No dispatches yet. Run a team above to get started.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 pr-4 font-medium">Team</th>
            <th className="text-left pb-2 pr-4 font-medium">When</th>
            <th className="text-left pb-2 pr-4 font-medium">Inputs</th>
            <th className="text-left pb-2 font-medium">Workflow</th>
          </tr>
        </thead>
        <tbody>
          {dispatches.map((d) => {
            const meta = TEAM_META[d.team] ?? { label: d.team, color: 'bg-gray-100 text-gray-700' }
            return (
              <tr key={d.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                  {relativeTime(d.dispatched_at)}
                </td>
                <td className="py-2 pr-4 text-gray-600 max-w-xs truncate">
                  {inputsSummary(d.inputs)}
                </td>
                <td className="py-2">
                  <a
                    href={d.actions_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View run →
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export function TeamsPage() {
  const [dispatches, setDispatches] = useState<TeamDispatchRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await teams.listDispatches()
      setDispatches(data)
    } catch {
      // history is non-critical — fail silently
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const handleDispatched = useCallback(async (result: DispatchResult, inputs: Record<string, string>) => {
    try {
      await teams.recordDispatch({
        team: result.team,
        inputs,
        actions_url: result.actionsUrl,
        workflow: result.workflow,
        repo: result.repo,
      })
      fetchHistory()
    } catch {
      // recording is best-effort
    }
  }, [fetchHistory])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Support Teams</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manually trigger non-build agent teams. Each run creates a PR with findings — Inspector and Guardians runs also appear as ready-for-review PRs when critical issues are found.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <InspectorPanel onDispatched={handleDispatched} />
        <GuardiansPanel onDispatched={handleDispatched} />
        <DesignersPanel onDispatched={handleDispatched} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Dispatches</h2>
        <DispatchHistory dispatches={dispatches} loading={historyLoading} />
      </div>
    </div>
  )
}
