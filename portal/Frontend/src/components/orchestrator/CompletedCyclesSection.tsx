// Verifies: FR-074
// CompletedCyclesSection component for collapsed display of completed orchestrator cycles
import React, { useState } from 'react'
import type { OrchestratorCycle } from './types'

interface CompletedCyclesSectionProps {
  cycles: OrchestratorCycle[]
}

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt || !completedAt) return ''
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  stopped: 'bg-gray-100 text-gray-500',
}

export function CompletedCyclesSection({ cycles }: CompletedCyclesSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (cycles.length === 0) return null

  return (
    <div data-testid="completed-cycles-section">
      <button
        data-testid="completed-cycles-toggle"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-sm font-medium text-gray-600 hover:text-gray-800 py-2 flex items-center gap-2"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span>Completed ({cycles.length})</span>
      </button>

      {expanded && (
        <div data-testid="completed-cycles-list" className="space-y-2 mt-2">
          {cycles.map((cycle) => (
            <div key={cycle.id} data-testid="completed-cycle-row" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <span className="font-mono text-xs text-gray-500">{cycle.id.slice(0, 8)}</span>
              {cycle.team && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{cycle.team}</span>}
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[cycle.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {cycle.status}
              </span>
              <span className="flex-1 text-gray-700 truncate">{cycle.task}</span>
              <span className="text-xs text-gray-400">{formatDuration(cycle.startedAt, cycle.completedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
