import { createPortal } from 'react-dom'
import { useStore } from '../store/store'

interface Props {
  nodeKey: string | null
  screenX: number
  screenY: number
}

interface KVRow {
  label: string
  value: string
}

function TooltipContent({ nodeKey }: { nodeKey: string }) {
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)

  let title = ''
  let rows: KVRow[] = []

  if (nodeKey.startsWith('group-')) {
    const id = nodeKey.slice('group-'.length)
    const group = groups.find(g => g.id === id)
    if (!group) return null
    title = group.name
    rows = [
      { label: 'Members',    value: String(group.members.length) },
      { label: 'Grants',     value: String(group.inheritedPermissions.length) },
      { label: 'Subgroups',  value: String(group.subGroups.length) },
      { label: 'Membership', value: group.membershipType },
    ]

  } else if (nodeKey.startsWith('grant-')) {
    const id = nodeKey.slice('grant-'.length)
    const grant = grants.find(g => g.id === id)
    if (!grant) return null

    const targetName = grant.targetId
      ? (sites.find(s => s.id === grant.targetId)?.name
        ?? zones.find(z => z.id === grant.targetId)?.name
        ?? grant.targetId)
      : null

    // Count doors covered by this grant's scope
    let doorCoverage = 0
    if (grant.scope === 'global') {
      doorCoverage = doors.length
    } else if (grant.scope === 'site' && grant.targetId) {
      doorCoverage = doors.filter(d => d.siteId === grant.targetId).length
    } else if (grant.scope === 'zone' && grant.targetId) {
      doorCoverage = doors.filter(d => d.zoneId === grant.targetId).length
    }

    const scheduleName = grant.scheduleId
      ? (schedules.find(s => s.id === grant.scheduleId)?.name ?? grant.scheduleId)
      : null

    title = grant.name
    rows = [
      { label: 'Scope',   value: grant.scope + (targetName ? ` · ${targetName}` : '') },
      { label: 'Actions', value: grant.actions.join(', ') || '—' },
      { label: 'Doors',   value: String(doorCoverage) },
      ...(scheduleName ? [{ label: 'Schedule', value: scheduleName }] : []),
    ]

  } else if (nodeKey.startsWith('schedule-')) {
    const id = nodeKey.slice('schedule-'.length)
    const schedule = schedules.find(s => s.id === id)
    if (!schedule) return null

    const windowsSummary = schedule.windows
      .slice(0, 3)
      .map(w => `${w.days.join('/')} ${w.startTime}–${w.endTime}`)
      .join('; ')
      + (schedule.windows.length > 3 ? ` +${schedule.windows.length - 3}` : '')

    title = schedule.name
    rows = [
      { label: 'Timezone', value: schedule.timezone },
      { label: 'Windows',  value: String(schedule.windows.length) },
      { label: 'Summary',  value: windowsSummary || '—' },
    ]

  } else if (nodeKey.startsWith('door-')) {
    const id = nodeKey.slice('door-'.length)
    const door = doors.find(d => d.id === id)
    if (!door) return null

    const zone = door.zoneId ? zones.find(z => z.id === door.zoneId) : undefined
    const siteName = sites.find(s => s.id === door.siteId)?.name ?? door.siteId

    // Count grants that cover this door
    const coveringGrants = grants.filter(g => {
      if (g.scope === 'global') return true
      if (g.scope === 'site' && g.targetId === door.siteId) return true
      if (g.scope === 'zone' && door.zoneId && g.targetId === door.zoneId) return true
      return false
    })

    title = door.name
    rows = [
      { label: 'Zone type', value: zone?.type ?? '—' },
      { label: 'Site',      value: siteName },
      { label: 'Grants',    value: String(coveringGrants.length) },
    ]
  }

  if (!title) return null

  return (
    <>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#e2e8f0',
        marginBottom: 8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 4 }}>
        {rows.map(({ label, value }) => (
          <>
            <span key={`lbl-${label}`} style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
            <span key={`val-${label}`} style={{ fontSize: 11, color: '#cbd5e1', wordBreak: 'break-word' }}>{value}</span>
          </>
        ))}
      </div>
    </>
  )
}

export default function HoverTooltip({ nodeKey, screenX, screenY }: Props) {
  if (!nodeKey) return null

  // Clamp X to viewport edges (max width 240, 12px right offset, 8px right margin)
  const TOOLTIP_WIDTH = 240
  const OFFSET = 12
  const rawLeft = screenX + OFFSET
  const clampedLeft = Math.min(rawLeft, window.innerWidth - TOOLTIP_WIDTH - 8)
  const clampedTop  = Math.max(8, Math.min(screenY, window.innerHeight - 8))

  // Portal to document.body so the tooltip escapes any overflow:hidden
  // or transform-based containing blocks in the canvas hierarchy.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: clampedLeft,
        top: clampedTop,
        background: '#1c1f2e',
        border: '1px solid #2d3148',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        maxWidth: TOOLTIP_WIDTH,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <TooltipContent nodeKey={nodeKey} />
    </div>,
    document.body,
  )
}
