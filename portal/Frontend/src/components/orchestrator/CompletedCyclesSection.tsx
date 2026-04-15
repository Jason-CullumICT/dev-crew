// Verifies: FR-074
import React, { useState } from 'react'
import type { OrchestratorCycle } from './types'

interface CompletedCyclesSectionProps {
  cycles: OrchestratorCycle[]
}

export function CompletedCyclesSection({ cycles }: CompletedCyclesSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (cycles.length === 0) return null

  return (
    <div data-testid="completed-cycles-section" className="mt-6">
      <button
        data-testid="completed-cycles-toggle"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <span>Completed ({cycles.length})</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div data-testid="completed-cycles-list" className="mt-2 space-y-2">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              data-testid="completed-cycle-row"
              className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded text-sm"
            >
              <span className="font-mono text-gray-600 text-xs">{cycle.id}</span>
              {cycle.team && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                  {cycle.team}
                </span>
              )}
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {cycle.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
