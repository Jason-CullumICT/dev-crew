import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useStore } from '../store/store'
import SeverityBar from '../components/SeverityBar'
import EventFeed from '../components/EventFeed'
import AlarmCard from '../components/AlarmCard'
import ScenarioPanel from './ScenarioPanel'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
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
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden bg-[hsl(var(--background))]">
      {/* Top: Severity summary bar */}
      <div className="shrink-0">
        <SeverityBar />
      </div>

      {/* Main: Event feed + Alarm queue */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left 2/3: Event Feed */}
        <Card className="flex-[2] flex flex-col min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">
              Event Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <EventFeed />
          </CardContent>
        </Card>

        {/* Right 1/3: Alarm Queue */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold flex items-center gap-2">
              Alarm Queue
              {activeAlarms.length > 0 && (
                <span className="text-red-400">{activeAlarms.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {activeAlarms.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No active alarms.</p>
            ) : (
              activeAlarms.map(alarm => (
                <AlarmCard key={alarm.id} alarm={alarm} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAB — bottom right */}
      <Button
        onClick={() => setPanelOpen(true)}
        title="Open Scenario Panel"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg z-40 p-0"
      >
        <Zap size={20} />
      </Button>

      {/* Scenario slide-out */}
      {panelOpen && <ScenarioPanel onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
