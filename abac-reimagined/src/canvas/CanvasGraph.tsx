import { useStore } from '../store/store'
import { useCanvasLayout } from './useCanvasLayout'
import GroupNode from './nodes/GroupNode'
import GrantNode from './nodes/GrantNode'
import DoorNode from './nodes/DoorNode'
import ScheduleNode from './nodes/ScheduleNode'
import type { CanvasPosition } from '../types'

function nodeCenter(pos: CanvasPosition, w = 148, h = 80): { x: number; y: number } {
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

export default function CanvasGraph() {
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const schedules = useStore(s => s.schedules)
  const selected  = useStore(s => s.selectedCanvasNodeId)
  const setSelected = useStore(s => s.setSelectedCanvasNode)

  const { positions, startDrag } = useCanvasLayout()

  function pos(key: string): CanvasPosition {
    return positions[key] ?? { x: 0, y: 0 }
  }

  // Compute SVG edges
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []

  // Group → Grant edges (via inheritedPermissions)
  for (const group of groups) {
    const gPos = nodeCenter(pos(`group-${group.id}`))
    for (const grantId of group.inheritedPermissions) {
      const grPos = nodeCenter(pos(`grant-${grantId}`), 136)
      edges.push({ x1: gPos.x, y1: gPos.y, x2: grPos.x, y2: grPos.y, color: '#1e2d4a' })
    }
  }

  // Grant → Schedule edges
  for (const grant of grants) {
    if (!grant.scheduleId) continue
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const sPos  = nodeCenter(pos(`schedule-${grant.scheduleId}`), 140)
    edges.push({ x1: grPos.x, y1: grPos.y, x2: sPos.x, y2: sPos.y, color: '#134e4a' })
  }

  // Grant → Door edges (via scope: global → all doors, site → site doors, zone → zone doors)
  for (const grant of grants) {
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const coveredDoors = doors.filter(d =>
      grant.scope === 'global' ||
      (grant.scope === 'site'  && grant.targetId === d.siteId) ||
      (grant.scope === 'zone'  && grant.targetId === d.zoneId)
    ).slice(0, 3) // cap at 3 edges per grant to avoid visual chaos
    for (const door of coveredDoors) {
      const dPos = nodeCenter(pos(`door-${door.id}`), 116, 60)
      edges.push({ x1: grPos.x, y1: grPos.y, x2: dPos.x, y2: dPos.y, color: '#2e1f6b' })
    }
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(rgba(30,37,59,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(30,37,59,.35) 1px,transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onClick={() => setSelected(null)}
    >
      {/* Edges SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        <defs>
          {['slate', 'violet', 'teal'].map((name, i) => {
            const colors = ['#1e2d4a', '#2e1f6b', '#134e4a']
            return (
              <marker key={name} id={`arr-${name}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0.5 L5,3 L0,5.5 Z" fill={colors[i]} />
              </marker>
            )
          })}
        </defs>
        {edges.map((e, i) => {
          const markerColor = e.color === '#1e2d4a' ? 'slate' : e.color === '#2e1f6b' ? 'violet' : 'teal'
          return (
            <path
              key={i}
              d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1} ${(e.x1 + e.x2) / 2} ${e.y2} ${e.x2} ${e.y2}`}
              stroke={e.color}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="5,3"
              markerEnd={`url(#arr-${markerColor})`}
              opacity="0.7"
            />
          )
        })}
      </svg>

      {/* Group nodes */}
      {groups.map(group => {
        const p = pos(`group-${group.id}`)
        return (
          <div
            key={group.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`group-${group.id}`, e)}
          >
            <GroupNode
              group={group}
              allGroups={groups}
              selected={selected === `group-${group.id}`}
              onClick={() => setSelected(`group-${group.id}`)}
            />
          </div>
        )
      })}

      {/* Grant nodes */}
      {grants.map(grant => {
        const p = pos(`grant-${grant.id}`)
        return (
          <div
            key={grant.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`grant-${grant.id}`, e)}
          >
            <GrantNode
              grant={grant}
              selected={selected === `grant-${grant.id}`}
              onClick={() => setSelected(`grant-${grant.id}`)}
            />
          </div>
        )
      })}

      {/* Schedule nodes */}
      {schedules.map(schedule => {
        const p = pos(`schedule-${schedule.id}`)
        return (
          <div
            key={schedule.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`schedule-${schedule.id}`, e)}
          >
            <ScheduleNode
              schedule={schedule}
              selected={selected === `schedule-${schedule.id}`}
              onClick={() => setSelected(`schedule-${schedule.id}`)}
            />
          </div>
        )
      })}

      {/* Door nodes */}
      {doors.map(door => {
        const p = pos(`door-${door.id}`)
        const zone = zones.find(z => z.id === door.zoneId)
        return (
          <div
            key={door.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`door-${door.id}`, e)}
          >
            <DoorNode
              door={door}
              zone={zone}
              selected={selected === `door-${door.id}`}
              onClick={() => setSelected(`door-${door.id}`)}
            />
          </div>
        )
      })}
    </div>
  )
}
