// Verifies: FR-071
// Verifies: FR-072
// Verifies: FR-073
import React, { useEffect, useState } from 'react'
import type { OrchestratorCycle } from './types'
import { CycleLogStream } from './CycleLogStream'

interface CycleCardProps {
  cycle: OrchestratorCycle
  onStop: (id: string) => void
  onRefresh: () => void
}

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return '—'
  const ms = Date.now() - new Date(startedAt).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m${secs % 60}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h${mins % 60}m`
}

const BORDER_COLORS: Record<string, string> = {
  running: 'border-l-blue-500',
  completed: 'border-l-green-500',
  failed: 'border-l-red-500',
  stopped: 'border-l-gray-400',
}

export function CycleCard({ cycle, onStop, onRefresh }: CycleCardProps) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(cycle.startedAt))
  const [logsExpanded, setLogsExpanded] = useState(false)

  useEffect(() => {
    if (cycle.status !== 'running') return
    const id = setInterval(() => {
      setElapsed(formatElapsed(cycle.startedAt))
    }, 1000)
    return () => clearInterval(id)
  }, [cycle.startedAt, cycle.status])

  const borderColor = BORDER_COLORS[cycle.status] ?? 'border-l-gray-400'
  const clamped = Math.min(100, Math.max(0, cycle.progress ?? 0))

  function handleStop() {
    if (window.confirm(`Stop cycle ${cycle.id}?`)) {
      onStop(cycle.id)
    }
  }

  const ports = cycle.ports ? Object.entries(cycle.ports) : []

  return (
    <div
      data-testid="cycle-card"
      className={`bg-white border border-gray-200 border-l-4 ${borderColor} rounded-lg p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-gray-700">{cycle.id}</span>
          {cycle.team && (
            <span data-testid="team-badge" className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
              {cycle.team}
            </span>
          )}
          <span data-testid="status-badge" className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {cycle.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span data-testid="elapsed-time" className="text-xs text-gray-500">{elapsed}</span>
          {cycle.status === 'running' && (
            <button
              data-testid="stop-button"
              onClick={handleStop}
              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Task */}
      {cycle.task && (
        <p className="text-sm text-gray-800">{cycle.task}</p>
      )}

      {/* Phase + Progress */}
      {cycle.phase && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{cycle.phase}</span>
            <span>{clamped}%</span>
          </div>
          <div data-testid="progress-bar" className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${clamped}%` }} />
          </div>
        </div>
      )}

      {/* Ports */}
      {ports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ports.map(([name, port]) => (
            <a
              key={name}
              data-testid="port-link"
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              {name}:{port}
            </a>
          ))}
        </div>
      )}

      {/* Error */}
      {cycle.error && (
        <p className="text-xs text-red-600">{cycle.error}</p>
      )}

      {/* Logs toggle */}
      <div>
        <button
          data-testid="toggle-logs"
          onClick={() => setLogsExpanded((v) => !v)}
          className="text-xs text-blue-600 hover:underline"
        >
          {logsExpanded ? 'Hide Logs' : 'View Logs'}
        </button>
        <CycleLogStream cycleId={cycle.id} expanded={logsExpanded} />
      </div>
    </div>
  )
}
