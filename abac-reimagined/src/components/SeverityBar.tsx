import { useStore } from '../store/store'
import type { Alarm } from '../types'
import { Card, CardContent } from '../ui/card'

function countActive(alarms: Alarm[], severity: string): number {
  return alarms.filter(a => a.state !== 'cleared' && a.severity === severity).length
}

export default function SeverityBar() {
  const alarms = useStore(s => s.alarms)
  const sites  = useStore(s => s.sites)

  const critical = countActive(alarms, 'critical')
  const warning  = countActive(alarms, 'warning')
  const info     = countActive(alarms, 'info')
  const total    = sites.length
  const inAlarm  = sites.filter(s => s.status === 'Alarm' || s.status === 'Lockdown').length
  const ok       = total - inAlarm

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* Critical */}
      <Card className="border-red-500/40">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Critical</div>
            <div className="text-xl font-bold text-red-400">{critical}</div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-500/40">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Warning</div>
            <div className="text-xl font-bold text-amber-400">{warning}</div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-500/40">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Info</div>
            <div className="text-xl font-bold text-blue-400">{info}</div>
          </div>
        </CardContent>
      </Card>

      {/* Sites OK */}
      <Card className="border-emerald-500/40">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Sites OK</div>
            <div className="text-xl font-bold text-emerald-400">
              {ok}<span className="text-[12px] text-[hsl(var(--muted-foreground))]">/{total}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
