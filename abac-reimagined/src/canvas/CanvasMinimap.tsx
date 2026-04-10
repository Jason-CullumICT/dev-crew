import { useRef, useCallback } from 'react'
import type { CanvasPosition } from '../types'

const MINIMAP_W = 160
const MINIMAP_H = 100

// Node dot colors by type
const DOT_COLORS: Record<string, string> = {
  group:    '#6366f1', // indigo
  grant:    '#8b5cf6', // violet
  schedule: '#14b8a6', // teal
  door:     '#64748b', // slate
}

interface NodeEntry {
  key: string
  pos: CanvasPosition
}

interface Props {
  nodes: NodeEntry[]
  pan: { x: number; y: number }
  zoom: number
  containerWidth: number
  containerHeight: number
  canvasW: number
  canvasH: number
  onPanChange: (pan: { x: number; y: number }) => void
}

function nodeType(key: string): string {
  if (key.startsWith('group-'))    return 'group'
  if (key.startsWith('grant-'))    return 'grant'
  if (key.startsWith('schedule-')) return 'schedule'
  return 'door'
}

export default function CanvasMinimap({
  nodes,
  pan,
  zoom,
  containerWidth,
  containerHeight,
  canvasW,
  canvasH,
  onPanChange,
}: Props) {
  const minimapRef = useRef<HTMLDivElement>(null)

  // Scale factors: minimap px per canvas px
  const scaleX = MINIMAP_W / canvasW
  const scaleY = MINIMAP_H / canvasH

  // Viewport rectangle in canvas space
  // The visible canvas region in canvas coords:
  //   top-left in canvas coords = -pan / zoom
  //   width in canvas coords = containerWidth / zoom
  //   height in canvas coords = containerHeight / zoom
  const vpLeft   = -pan.x / zoom
  const vpTop    = -pan.y / zoom
  const vpWidth  = containerWidth  / zoom
  const vpHeight = containerHeight / zoom

  // Convert viewport to minimap px
  const rectLeft   = Math.max(0, vpLeft   * scaleX)
  const rectTop    = Math.max(0, vpTop    * scaleY)
  const rectRight  = Math.min(MINIMAP_W, (vpLeft + vpWidth)  * scaleX)
  const rectBottom = Math.min(MINIMAP_H, (vpTop  + vpHeight) * scaleY)
  const rectW = Math.max(4, rectRight  - rectLeft)
  const rectH = Math.max(4, rectBottom - rectTop)

  // Convert a minimap click position to new pan
  function minimapPosToPan(mmX: number, mmY: number): { x: number; y: number } {
    // mmX/mmY is where we want the viewport center
    const canvasX = mmX / scaleX
    const canvasY = mmY / scaleY
    return {
      x: -(canvasX * zoom) + containerWidth  / 2,
      y: -(canvasY * zoom) + containerHeight / 2,
    }
  }

  const isDraggingViewport = useRef(false)
  const dragStartRef = useRef<{ mmX: number; mmY: number; origPan: { x: number; y: number } } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = minimapRef.current!.getBoundingClientRect()
    const mmX = e.clientX - rect.left
    const mmY = e.clientY - rect.top

    // Check if clicking inside viewport rectangle — if so, drag viewport
    const inside =
      mmX >= rectLeft && mmX <= rectLeft + rectW &&
      mmY >= rectTop  && mmY <= rectTop  + rectH

    if (inside) {
      isDraggingViewport.current = true
      dragStartRef.current = { mmX, mmY, origPan: { ...pan } }

      function onMove(ev: MouseEvent) {
        if (!dragStartRef.current) return
        const rect2 = minimapRef.current?.getBoundingClientRect()
        if (!rect2) return
        const curMmX = ev.clientX - rect2.left
        const curMmY = ev.clientY - rect2.top
        const dMmX = curMmX - dragStartRef.current.mmX
        const dMmY = curMmY - dragStartRef.current.mmY
        // Dragging viewport by dMm moves pan by -dCanvas*zoom in screen space
        const dCanvasX = dMmX / scaleX
        const dCanvasY = dMmY / scaleY
        onPanChange({
          x: dragStartRef.current.origPan.x - dCanvasX * zoom,
          y: dragStartRef.current.origPan.y - dCanvasY * zoom,
        })
      }

      function onUp() {
        isDraggingViewport.current = false
        dragStartRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    } else {
      // Jump viewport to click position
      onPanChange(minimapPosToPan(mmX, mmY))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan, zoom, containerWidth, containerHeight, scaleX, scaleY, rectLeft, rectTop, rectW, rectH, onPanChange])

  return (
    <div
      ref={minimapRef}
      onMouseDown={handleMouseDown}
      style={{
        width:  MINIMAP_W,
        height: MINIMAP_H,
        position: 'relative',
        flexShrink: 0,
        cursor: 'crosshair',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'rgba(9, 13, 24, 0.88)',
        border: '1px solid rgba(30, 45, 74, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Node dots */}
      {nodes.map(({ key, pos }) => {
        const dotX = pos.x * scaleX
        const dotY = pos.y * scaleY
        if (dotX < 0 || dotX > MINIMAP_W || dotY < 0 || dotY > MINIMAP_H) return null
        const color = DOT_COLORS[nodeType(key)] ?? '#64748b'
        const size = nodeType(key) === 'door' ? 1.5 : 2.5
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: dotX,
              top:  dotY,
              width:  size,
              height: size,
              borderRadius: '50%',
              background: color,
              transform: 'translate(-50%, -50%)',
              opacity: 0.85,
            }}
          />
        )
      })}

      {/* Viewport rectangle */}
      <div
        style={{
          position: 'absolute',
          left:   rectLeft,
          top:    rectTop,
          width:  rectW,
          height: rectH,
          border: '1px solid rgba(148, 163, 184, 0.6)',
          background: 'rgba(148, 163, 184, 0.07)',
          borderRadius: 2,
          cursor: 'grab',
          pointerEvents: 'none',
        }}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          right: 5,
          fontSize: 8,
          color: 'rgba(148, 163, 184, 0.4)',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '0.05em',
        }}
      >
        MINIMAP
      </div>
    </div>
  )
}
