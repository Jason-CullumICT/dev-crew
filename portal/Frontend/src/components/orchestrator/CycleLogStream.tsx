// Verifies: FR-073
import React, { useEffect, useRef, useState } from 'react'
import type { CycleLogEntry } from './types'

interface CycleLogStreamProps {
  cycleId: string
  expanded: boolean
}

export function CycleLogStream({ cycleId, expanded }: CycleLogStreamProps) {
  const [logs, setLogs] = useState<CycleLogEntry[]>([])
  const [error, setError] = useState<'unavailable' | 'lost' | null>(null)
  const logsRef = useRef(logs)
  logsRef.current = logs

  useEffect(() => {
    if (!expanded) return

    const url = `/api/orchestrator/api/cycles/${encodeURIComponent(cycleId)}/logs`
    const es = new EventSource(url)

    es.onmessage = (event: MessageEvent) => {
      try {
        const entry = JSON.parse(event.data) as CycleLogEntry
        setLogs((prev) => [...prev, entry])
        setError(null)
      } catch {
        // malformed JSON — ignore
      }
    }

    es.onerror = () => {
      if (logsRef.current.length === 0) {
        setError('unavailable')
      } else {
        setError('lost')
      }
    }

    return () => {
      es.close()
    }
  }, [cycleId, expanded])

  if (!expanded) return null

  function levelClass(level?: string) {
    if (level === 'error') return 'text-red-400'
    if (level === 'warn') return 'text-yellow-400'
    return 'text-gray-300'
  }

  return (
    <div data-testid="cycle-log-stream" className="bg-gray-900 rounded p-3 mt-2 text-xs font-mono max-h-64 overflow-y-auto">
      {logs.length === 0 && !error && (
        <p className="text-gray-500">Waiting for log events...</p>
      )}
      {error === 'unavailable' && (
        <p className="text-red-400">Logs unavailable — could not connect to log stream.</p>
      )}
      {logs.map((entry, i) => (
        <div key={i} className={levelClass(entry.level)}>
          <span className="text-gray-500 mr-2">{entry.timestamp}</span>
          {entry.agent && <span className="text-blue-400 mr-2">[{entry.agent}]</span>}
          <span>{entry.message}</span>
        </div>
      ))}
      {error === 'lost' && (
        <p className="text-yellow-400 mt-1">Connection lost — log stream disconnected.</p>
      )}
    </div>
  )
}
