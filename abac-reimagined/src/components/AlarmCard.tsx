import { useState } from 'react'
import { useStore } from '../store/store'
import type { Alarm } from '../types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'

interface Props {
  alarm: Alarm
  compact?: boolean
}

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-red-500/40',
  warning:  'border-amber-500/40',
  info:     'border-blue-500/40',
}

export default function AlarmCard({ alarm, compact = false }: Props) {
  const acknowledgeAlarm = useStore(s => s.acknowledgeAlarm)
  const escalateAlarm    = useStore(s => s.escalateAlarm)
  const clearAlarm       = useStore(s => s.clearAlarm)
  const addAlarmNote     = useStore(s => s.addAlarmNote)
  const sites            = useStore(s => s.sites)

  const [noteInput, setNoteInput] = useState('')

  const borderClass = SEVERITY_BORDER[alarm.severity] ?? 'border-[hsl(var(--border))]'
  const siteName = sites.find(s => s.id === alarm.siteId)?.name ?? alarm.siteId
  const isCleared = alarm.state === 'cleared'
  const showActions = !compact && !isCleared

  const severityVariant = ((): 'destructive' | 'warning' | 'info' => {
    if (alarm.severity === 'critical') return 'destructive'
    if (alarm.severity === 'warning') return 'warning'
    return 'info'
  })()

  const stateVariant = ((): 'destructive' | 'warning' | 'violet' | 'outline' => {
    if (alarm.state === 'active') return 'destructive'
    if (alarm.state === 'acknowledged') return 'warning'
    if (alarm.state === 'escalated') return 'violet'
    return 'outline'
  })()

  function handleNote() {
    if (!noteInput.trim()) return
    addAlarmNote(alarm.id, noteInput.trim())
    setNoteInput('')
  }

  return (
    <Card className={`${borderClass} space-y-2`}>
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] leading-tight">{alarm.title}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={severityVariant} className="text-[8px] px-1.5 py-0.5">
              {alarm.severity}
            </Badge>
            <Badge variant={stateVariant} className="text-[8px] px-1.5 py-0.5">
              {alarm.state}
            </Badge>
          </div>
        </div>

        {/* Site + time */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{siteName}</span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))]/60">
            {relativeTime(alarm.acknowledgedAt ?? alarm.escalatedAt ?? alarm.clearedAt ?? new Date().toISOString())}
          </span>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {alarm.state === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeAlarm(alarm.id, 'soc-operator')}
                className="h-6 px-2 text-[9px] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                ACK
              </Button>
            )}
            {(alarm.state === 'active' || alarm.state === 'acknowledged') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => escalateAlarm(alarm.id)}
                className="h-6 px-2 text-[9px] text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
              >
                Escalate
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearAlarm(alarm.id)}
              className="h-6 px-2 text-[9px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            >
              Clear
            </Button>
          </div>
        )}

        {/* Notes section — full mode only */}
        {!compact && (
          <div className="space-y-1">
            {alarm.notes.map((note, i) => (
              <div key={i} className="text-[9px] text-[hsl(var(--muted-foreground))] pl-2 border-l border-[hsl(var(--border))]">
                {note}
              </div>
            ))}
            {!isCleared && (
              <div className="flex gap-1 pt-0.5">
                <Input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNote() }}
                  placeholder="Add note..."
                  className="flex-1 text-[9px] h-7 px-2"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNote}
                  className="h-7 px-2 text-[9px]"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
