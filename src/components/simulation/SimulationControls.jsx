import { Play, Pause, RotateCcw, Plus } from 'lucide-react'
import { useSimulation } from '../../hooks/useSimulation'

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
]

const WORK_ITEM_OPTIONS = [5, 10, 20, 50, 100]

export function SimulationControls() {
  const {
    isRunning,
    isPaused,
    speed,
    workItemCount,
    completedCount,
    results,
    start,
    pause,
    resume,
    reset,
    setSpeed,
    setWorkItemCount,
    createScenario,
  } = useSimulation()

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed)
  }

  const handleWorkItemsChange = (e) => {
    setWorkItemCount(parseInt(e.target.value, 10))
  }

  const canStart = !isRunning && !isPaused
  const canPause = isRunning && !isPaused
  const canResume = isPaused
  const canReset = isRunning || isPaused || results

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Play/Pause/Reset Controls */}
        <div className="flex items-center gap-2">
          {canStart && (
            <button
              onClick={start}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}

          {canPause && (
            <button
              onClick={pause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          {canResume && (
            <button
              onClick={resume}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}

          {canReset && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Speed:</span>
          <div className="flex rounded-md overflow-hidden border border-slate-300">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSpeedChange(option.value)}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  speed === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Work Items */}
        <div className="flex items-center gap-2">
          <label htmlFor="workItems" className="text-sm text-slate-600">
            Work Items:
          </label>
          <select
            id="workItems"
            value={workItemCount}
            onChange={handleWorkItemsChange}
            disabled={isRunning || isPaused}
            className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {WORK_ITEM_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        {/* Progress */}
        {(isRunning || isPaused || results) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Completed:</span>
            <span className="text-sm font-semibold text-slate-900">
              {completedCount} / {workItemCount}
            </span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${(completedCount / workItemCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Create Scenario */}
        <button
          onClick={createScenario}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          New Scenario
        </button>
      </div>
    </div>
  )
}
