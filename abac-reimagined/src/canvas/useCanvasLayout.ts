import { useRef, useCallback } from 'react'
import { useStore } from '../store/store'

export function useCanvasLayout(zoomRef: React.RefObject<number>) {
  const positions = useStore(s => s.canvasPositions)
  const setPosition = useStore(s => s.setCanvasPosition)
  const dragRef = useRef<{ nodeKey: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  // M4: Keep a ref that always reflects current positions so startDrag callbacks
  // don't need `positions` in their dependency array (prevents 540+ handler re-creates per drag frame).
  const positionsRef = useRef(positions)
  positionsRef.current = positions

  const startDrag = useCallback((nodeKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // M4: Read from positionsRef instead of closed-over `positions`
    const pos = positionsRef.current[nodeKey] ?? { x: 0, y: 0 }
    dragRef.current = { nodeKey, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const zoom = zoomRef.current ?? 1
      // Divide screen-space delta by zoom to get canvas-space delta
      const dx = (ev.clientX - dragRef.current.startX) / zoom
      const dy = (ev.clientY - dragRef.current.startY) / zoom
      setPosition(dragRef.current.nodeKey, {
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      })
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  // M4: `positions` removed from deps — read via positionsRef.current instead
  }, [setPosition, zoomRef])

  return { positions, startDrag }
}
