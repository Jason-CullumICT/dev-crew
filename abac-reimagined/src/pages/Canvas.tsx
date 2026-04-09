import CanvasGraph from '../canvas/CanvasGraph'
import DetailPanel from '../canvas/DetailPanel'
import { useStore } from '../store/store'

export default function Canvas() {
  const selectedNode = useStore(s => s.selectedCanvasNodeId)

  return (
    <div className="relative w-full h-full bg-[#0b0e18]">
      <CanvasGraph />
      {selectedNode && <DetailPanel />}
    </div>
  )
}
