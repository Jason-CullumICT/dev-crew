// Verifies: FR-071, FR-072
// Stub: CycleCard component for orchestrator cycle display
import React, { useState, useEffect } from 'react'
import type { OrchestratorCycle } from './types'
import { CycleLogStream } from './CycleLogStream'

interface CycleCardProps {
  cycle: OrchestratorCycle
  onStop: (id: string) => void
  onRefresh: () => void
}

const STATUS_BORDER: Record<string, string> = {
  running: 'border-l-blue-500',
  completed: 'border-l-green-500',
  failed: 'border-l-red-500',
  stopped: 'border-l-gray-400',
}

function formatElapsed(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
}

export function CycleCard({ cycle, onStop, onRefresh }: CycleCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [elapsed, setElapsed] = useState(cycle.startedAt ? formatElapsed(cycle.startedAt) : '')

  useEffect(() => {
    if (!cycle.startedAt || cycle.status !== 'running') return
    const interval = setInterval(() => {
      setElapsed(formatElapsed(cycle.startedAt!))
    }, 1000)
    return () => clearInterval(interval)
  }, [cycle.startedAt, cycle.status])

  const handleStop = () => {
    if (window.confirm(`Stop cycle ${cycle.id}?`)) {
      onStop(cycle.id)
    }
  }

  const borderClass = STATUS_BORDER[cycle.status] ?? 'border-l-gray-400'
  const progress = Math.min(100, Math.max(0, cycle.progress ?? 0))

  return (
    <div data-testid="cycle-card" className={`border-l-4 ${borderClass} bg-white rounded-lg shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-gray-600">{cycle.id}</span>
        <div className="flex items-center gap-2">
          {cycle.team && <span data-testid="team-badge" className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{cycle.team}</span>}
          <span data-testid="status-badge" className="text-xs font-medium">{cycle.status}</span>
        </div>
      </div>

      {cycle.task && <p className="text-sm text-gray-800 mb-2">{cycle.task}</p>}
      {cycle.error && <p className="text-sm text-red-600 mb-2">{cycle.error}</p>}

      {cycle.phase && (
        <div className="mb-2">
          <span className="text-xs text-gray-500">{cycle.phase}</span>
          <div data-testid="progress-bar" className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {cycle.ports && Object.entries(cycle.ports).length > 0 && (
        <div className="flex gap-2 mb-2">
          {Object.entries(cycle.ports).map(([name, port]) => (
            <a key={name} data-testid="port-link" href={`http://localhost:${port}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
              {name}:{port}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {cycle.startedAt && <span data-testid="elapsed-time" className="text-xs text-gray-400">{elapsed}</span>}
        <div className="flex gap-2">
          <button data-testid="toggle-logs" onClick={() => setShowLogs(!showLogs)} className="text-xs text-gray-500 hover:text-gray-700">
            {showLogs ? 'Hide Logs' : 'View Logs'}
          </button>
          {cycle.status === 'running' && (
            <button data-testid="stop-button" onClick={handleStop} className="text-xs text-red-600 hover:text-red-800">Stop</button>
          )}
        </div>
      </div>

      {showLogs && <CycleLogStream cycleId={cycle.id} expanded={showLogs} />}
    </div>
  )
}
