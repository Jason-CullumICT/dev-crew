import { useState, useMemo } from 'react'
import { Pencil, Trash2, Search, X } from 'lucide-react'
import { useStore } from '../store/store'
import GroupModal from '../modals/GroupModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Group } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

export default function Groups() {
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const deleteGroup = useStore(s => s.deleteGroup)

  const [editing, setEditing]             = useState<Group | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(g => g.name.toLowerCase().includes(q))
  }, [groups, search])

  function getCascadeDetails(group: Group): string[] {
    const details: string[] = []
    const subgroupRefs = groups.filter(g => g.id !== group.id && g.subGroups.includes(group.id))
    if (subgroupRefs.length > 0) {
      details.push(`${subgroupRefs.length} subgroup reference${subgroupRefs.length !== 1 ? 's' : ''} will be removed from other groups`)
    }
    return details
  }

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteGroup(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  const cascadeDetails = pendingDelete ? getCascadeDetails(pendingDelete) : []

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Groups</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{groups.length} groups</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by group name..."
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {search ? 'No groups match your search.' : 'No groups yet. Click + New to create one.'}
        </p>
      )}

      <div className="grid gap-3">
        {filtered.map(group => {
          const subGroupNames = group.subGroups.map(id => groups.find(g => g.id === id)?.name ?? id)
          const grantNames    = group.inheritedPermissions.map(id => grants.find(g => g.id === id)?.name ?? id)
          const memberCount   = group.members.length

          return (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm">{group.name}</CardTitle>
                      <Badge variant={group.membershipType === 'dynamic' ? 'violet' : 'secondary'} className="text-[10px]">
                        {group.membershipType}
                      </Badge>
                      {group.membershipRules.length > 0 && (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          {group.membershipLogic}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {group.membershipType === 'static'
                        ? `${memberCount} member${memberCount !== 1 ? 's' : ''}`
                        : memberCount > 0
                          ? `${memberCount} member${memberCount !== 1 ? 's' : ''} (rules-based)`
                          : '0 members (rules-based)'}
                    </p>
                    {group.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]/70 mt-0.5">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(group)}
                      aria-label="Edit"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(group)}
                      aria-label="Delete"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {(group.membershipRules.length > 0 || group.subGroups.length > 0 || group.inheritedPermissions.length > 0) && (
                <CardContent className="space-y-2">
                  {group.membershipRules.length > 0 && (
                    <div className="space-y-1">
                      {group.membershipRules.map(r => (
                        <div key={r.id} className="bg-[hsl(var(--muted))] rounded px-2 py-1.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">
                          <span className="text-[hsl(var(--primary))]">{r.leftSide}</span>{' '}
                          <span className="opacity-60">{r.operator}</span>{' '}
                          <span className="text-emerald-400">"{Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {group.subGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {group.subGroups.map((id, i) => (
                        <Badge key={id} variant="secondary" className="text-[10px]">
                          &#x21B3; {subGroupNames[i]}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {group.inheritedPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {group.inheritedPermissions.map((id, i) => (
                        <Badge key={id} variant="violet" className="text-[10px]">
                          {grantNames[i]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {editing !== null && (
        <GroupModal group={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete group?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        details={cascadeDetails}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
