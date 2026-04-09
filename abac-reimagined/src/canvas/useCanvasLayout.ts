import { useRef, useCallback } from 'react'
import { useStore } from '../store/store'

export function useCanvasLayout() {
  const positions = useStore(s => s.canvasPositions)
  const setPosition = useStore(s => s.setCanvasPosition)
  const dragRef = useRef<{ nodeKey: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const startDrag = useCallback((nodeKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const pos = positions[nodeKey] ?? { x: 0, y: 0 }
    dragRef.current = { nodeKey, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
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
  }, [positions, setPosition])

  return { positions, startDrag }
}
