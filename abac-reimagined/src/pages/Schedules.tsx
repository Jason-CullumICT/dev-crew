import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import ScheduleModal from '../modals/ScheduleModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import { buildNowContext } from '../engine/scheduleEngine'
import type { NamedSchedule, DayOfWeek } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Schedules() {
  const schedules      = useStore(s => s.schedules)
  const grants         = useStore(s => s.grants)
  const deleteSchedule = useStore(s => s.deleteSchedule)
  const now            = buildNowContext()

  const [editing, setEditing]             = useState<NamedSchedule | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<NamedSchedule | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schedules
    return schedules.filter(s => s.name.toLowerCase().includes(q))
  }, [schedules, search])

  function getCascadeDetails(schedule: NamedSchedule): string[] {
    const usedBy = grants.filter(g => g.scheduleId === schedule.id)
    if (usedBy.length > 0) {
      return [`${usedBy.length} grant${usedBy.length !== 1 ? 's' : ''} will have their schedule removed`]
    }
    return []
  }

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteSchedule(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  const cascadeDetails = pendingDelete ? getCascadeDetails(pendingDelete) : []

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Schedules</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{schedules.length} schedules</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by schedule name..."
        resultCount={filtered.length}
        totalCount={schedules.length}
      />

      <div className="grid gap-4">
        {filtered.map(schedule => {
          const usedBy = grants.filter(g => g.scheduleId === schedule.id)
          return (
            <Card key={schedule.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm text-teal-400">{schedule.name}</CardTitle>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{schedule.timezone}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {usedBy.length > 0 && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {usedBy.length} grant{usedBy.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(schedule)}
                      aria-label="Edit"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(schedule)}
                      aria-label="Delete"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Day grid */}
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-2">Time Windows</div>
                  <div className="grid grid-cols-7 gap-px">
                    {DAYS.map(day => {
                      const active = schedule.windows.some(w => w.days.includes(day))
                      const isToday = day === now.dayOfWeek
                      return (
                        <div key={day} className={`text-center py-1.5 rounded text-[9px] font-semibold ${
                          active
                            ? isToday
                              ? 'bg-teal-500 text-teal-950'
                              : 'bg-teal-500/20 text-teal-400'
                            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]/40'
                        }`}>{day}</div>
                      )
                    })}
                  </div>
                  {schedule.windows.map(w => (
                    <div key={w.id} className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                      {w.days.join(', ')} · {w.startTime}–{w.endTime}
                    </div>
                  ))}
                </div>

                {/* Holidays */}
                {schedule.holidays.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-2">Holidays</div>
                    <div className="space-y-1.5">
                      {schedule.holidays.map(h => (
                        <div key={h.id} className="flex items-center gap-2">
                          <Badge
                            variant={h.behavior === 'deny_all' ? 'destructive' : h.behavior === 'allow_with_override' ? 'warning' : 'secondary'}
                            className="text-[9px]"
                          >
                            {h.behavior === 'deny_all' ? 'DENY ALL' : h.behavior === 'allow_with_override' ? 'OVERRIDE' : 'NORMAL'}
                          </Badge>
                          <span className="text-xs text-[hsl(var(--foreground))]">{h.name}</span>
                          <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{h.month}/{h.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grants using this schedule */}
                {usedBy.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {usedBy.map(g => (
                      <Badge key={g.id} variant="violet" className="text-[9px]">{g.name}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {search ? 'No schedules match your search.' : 'No schedules yet. Click + New to create one.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <ScheduleModal schedule={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete schedule?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        details={cascadeDetails}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
