import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import type { EventSeverity, EventCategory } from '../types'

interface Props {
  compact?: boolean
  maxEvents?: number
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
  info:     'bg-blue-500',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'text-red-400',
  warning:  'text-amber-400',
  info:     'text-blue-400',
}

export default function EventFeed({ compact = false, maxEvents }: Props) {
  const allEvents = useStore(s => s.events)
  const sites     = useStore(s => s.sites)

  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all')
  const [userScrolled, setUserScrolled]     = useState(false)
  const [, setTick]                         = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)

  // Tick every 10s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to top (newest) when events arrive, unless user scrolled away
  useEffect(() => {
    if (!userScrolled && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [allEvents, userScrolled])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    // If user scrolled down at all, consider it a manual scroll
    setUserScrolled(el.scrollTop > 40)
  }

  // Apply filters
  let filtered = allEvents
  if (!compact) {
    if (severityFilter !== 'all') filtered = filtered.filter(e => e.severity === severityFilter)
    if (categoryFilter !== 'all') filtered = filtered.filter(e => e.category === categoryFilter)
  }

  // Limit events displayed
  const limit = compact ? 10 : (maxEvents ?? filtered.length)
  const displayed = filtered.slice(0, limit)

  function siteLabel(siteId: string): string {
    return sites.find(s => s.id === siteId)?.name ?? siteId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters — only in full mode */}
      {!compact && (
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as EventSeverity | 'all')}
            className="text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-400 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as EventCategory | 'all')}
            className="text-[10px] bg-[#0b0f1a] border border-[#1e293b] text-slate-400 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="access">Access</option>
            <option value="alarm">Alarm</option>
            <option value="system">System</option>
            <option value="intrusion">Intrusion</option>
          </select>
          <div className="flex-1" />
          {userScrolled && (
            <button
              onClick={() => {
                setUserScrolled(false)
                if (containerRef.current) containerRef.current.scrollTop = 0
              }}
              className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              Resume
            </button>
          )}
        </div>
      )}

      {/* Event list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 min-h-0"
      >
        {displayed.length === 0 ? (
          <p className="text-[11px] text-slate-600 py-2">No events yet.</p>
        ) : (
          displayed.map(event => (
            <div
              key={event.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-white/[0.02] transition-colors"
            >
              {/* Severity dot */}
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${SEVERITY_DOT[event.severity] ?? 'bg-slate-500'}`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${SEVERITY_LABEL[event.severity] ?? 'text-slate-400'}`}>
                    {event.severity}
                  </span>
                  <span className="text-[10px] text-slate-300 truncate">{event.message}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-600">{relativeTime(event.timestamp)}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1e293b] text-slate-500">
                    {siteLabel(event.siteId)}
                  </span>
                  {event.userId && (
                    <span className="text-[9px] text-slate-600 truncate">{event.userId}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
