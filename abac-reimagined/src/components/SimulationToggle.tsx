import { useStore } from '../store/store'
import { Button } from '../ui/button'

export default function SimulationToggle() {
  const speed    = useStore(s => s.simulationSpeed)
  const setSpeed = useStore(s => s.setSimulationSpeed)

  const isRunning = speed > 0

  function togglePlay() {
    setSpeed(isRunning ? 0 : 1)
  }

  function toggleSpeed() {
    if (!isRunning) return
    setSpeed(speed === 1 ? 10 : 1)
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Play / Pause button */}
      <Button
        variant="outline"
        size="icon"
        onClick={togglePlay}
        title={isRunning ? 'Pause simulation' : 'Start simulation'}
        className="w-7 h-7"
      >
        {isRunning ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
            <rect x="6"   y="1" width="2.5" height="8" rx="0.5" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1.5 L9 5 L2 8.5 Z" />
          </svg>
        )}
      </Button>

      {/* Speed toggle — only shown when running */}
      {isRunning && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSpeed}
          title={`Speed: ${speed}x — click to toggle`}
          className="h-7 px-1.5 text-[9px] font-semibold"
        >
          {speed}x
        </Button>
      )}

      {/* LIVE indicator */}
      {isRunning && (
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
  )
}
