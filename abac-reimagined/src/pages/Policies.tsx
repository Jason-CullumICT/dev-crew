import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import PolicyModal from '../modals/PolicyModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Policy } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

export default function Policies() {
  const policies     = useStore(s => s.policies)
  const doors        = useStore(s => s.doors)
  const schedules    = useStore(s => s.schedules)
  const deletePolicy = useStore(s => s.deletePolicy)

  const [editing, setEditing]             = useState<Policy | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Policy | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return policies
    return policies.filter(p => p.name.toLowerCase().includes(q))
  }, [policies, search])

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deletePolicy(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Policies</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{policies.length} policies</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by policy name..."
        resultCount={filtered.length}
        totalCount={policies.length}
      />

      <div className="grid gap-3">
        {filtered.map(policy => {
          const schedule = policy.scheduleId ? schedules.find(s => s.id === policy.scheduleId) : null

          const ruleSummaryParts = policy.rules.map(r => {
            const rhs = Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide
            return `${r.leftSide} ${r.operator} '${rhs}'`
          })
          const logicSep = ` ${policy.logicalOperator} `
          const ruleSummary = ruleSummaryParts.length <= 2
            ? ruleSummaryParts.join(logicSep)
            : ruleSummaryParts.slice(0, 2).join(logicSep) + ` ${policy.logicalOperator} …`

          return (
            <Card key={policy.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm">{policy.name}</CardTitle>
                      {policy.rules.length > 1 && (
                        <Badge
                          variant={policy.logicalOperator === 'AND' ? 'info' : 'warning'}
                          className="text-[9px]"
                        >
                          {policy.logicalOperator}
                        </Badge>
                      )}
                    </div>
                    {policy.rules.length > 0 && (
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 font-mono truncate" title={ruleSummaryParts.join(logicSep)}>
                        {ruleSummary}
                      </div>
                    )}
                    {policy.description && (
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]/70 mt-0.5 truncate">{policy.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{policy.rules.length} rule{policy.rules.length !== 1 ? 's' : ''}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(policy)}
                      aria-label="Edit"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(policy)}
                      aria-label="Delete"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {(policy.doorIds.length > 0 || schedule) && (
                <CardContent className="space-y-2">
                  {policy.doorIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {policy.doorIds.map(id => (
                        <Badge key={id} variant="secondary" className="text-[9px]">
                          🚪 {doors.find(d => d.id === id)?.name ?? id}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {schedule && (
                    <Badge variant="outline" className="text-[9px] text-teal-400 border-teal-500/30">
                      {schedule.name}
                    </Badge>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {search ? 'No policies match your search.' : 'No policies yet. Click + New to create one.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <PolicyModal policy={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete policy?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
