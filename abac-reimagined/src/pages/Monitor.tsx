import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useStore } from '../store/store'
import SeverityBar from '../components/SeverityBar'
import EventFeed from '../components/EventFeed'
import AlarmCard from '../components/AlarmCard'
import ScenarioPanel from './ScenarioPanel'
import type { Alarm } from '../types'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 }

function sortAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    if (sevDiff !== 0) return sevDiff
    return new Date(a.acknowledgedAt ?? a.escalatedAt ?? new Date().toISOString()).getTime() -
           new Date(b.acknowledgedAt ?? b.escalatedAt ?? new Date().toISOString()).getTime()
  })
}

export default function Monitor() {
  const alarms        = useStore(s => s.alarms)
  const [panelOpen, setPanelOpen] = useState(false)

  const activeAlarms = sortAlarms(alarms.filter(a => a.state !== 'cleared'))

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* Top: Severity summary bar */}
      <div className="shrink-0">
        <SeverityBar />
      </div>

      {/* Main: Event feed + Alarm queue */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left 2/3: Event Feed */}
        <div className="flex-[2] bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 flex flex-col min-h-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3 shrink-0">
            Event Stream
          </div>
          <EventFeed />
        </div>

        {/* Right 1/3: Alarm Queue */}
        <div className="flex-1 bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 flex flex-col min-h-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3 shrink-0">
            Alarm Queue
            {activeAlarms.length > 0 && (
              <span className="ml-2 text-red-400">{activeAlarms.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {activeAlarms.length === 0 ? (
              <p className="text-[11px] text-slate-600">No active alarms.</p>
            ) : (
              activeAlarms.map(alarm => (
                <AlarmCard key={alarm.id} alarm={alarm} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB — bottom right */}
      <button
        onClick={() => setPanelOpen(true)}
        title="Open Scenario Panel"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-colors z-40"
      >
        <Zap size={20} className="text-white" />
      </button>

      {/* Scenario slide-out */}
      {panelOpen && <ScenarioPanel onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
