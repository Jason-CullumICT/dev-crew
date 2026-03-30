// Verifies: FR-073
// CycleLogStream component for SSE-based log streaming
import React, { useState, useEffect, useRef } from 'react'
import type { CycleLogEntry } from './types'

interface CycleLogStreamProps {
  cycleId: string
  expanded: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-gray-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

export function CycleLogStream({ cycleId, expanded }: CycleLogStreamProps) {
  const [logs, setLogs] = useState<CycleLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return

    const url = `/api/orchestrator/api/cycles/${encodeURIComponent(cycleId)}/logs`
    const es = new EventSource(url)

    es.onmessage = (event: MessageEvent) => {
      try {
        const entry: CycleLogEntry = JSON.parse(event.data)
        setLogs((prev) => [...prev, entry])
      } catch {
        // Ignore malformed JSON
      }
    }

    es.onerror = () => {
      setError(logs.length > 0 ? 'Connection lost' : 'Logs unavailable')
    }

    return () => {
      es.close()
    }
  }, [cycleId, expanded])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  if (!expanded) return null

  return (
    <div data-testid="cycle-log-stream" ref={containerRef} className="mt-3 bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
      {logs.length === 0 && !error && (
        <div className="text-gray-500">Waiting for log events...</div>
      )}
      {error && <div className="text-yellow-400">{error}</div>}
      {logs.map((entry, i) => {
        const colorClass = LEVEL_COLORS[entry.level ?? 'info'] ?? 'text-gray-300'
        return (
          <div key={i} className={colorClass}>
            <span className="text-gray-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            {entry.agent && <span className="text-cyan-400"> [{entry.agent}]</span>}
            <span> {entry.message}</span>
          </div>
        )
      })}
    </div>
  )
}
