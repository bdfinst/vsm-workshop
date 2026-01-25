import { ArrowUp, ArrowDown, Minus, Play, Trash2 } from 'lucide-react'
import { useSimulation } from '../../hooks/useSimulation'

function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '0m'
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function ImprovementBadge({ value, higherIsBetter = true }) {
  if (value === 0 || !value) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-500">
        <Minus className="w-3 h-3" />
        0%
      </span>
    )
  }

  const isPositive = higherIsBetter ? value > 0 : value < 0
  const displayValue = Math.abs(value).toFixed(1)

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        isPositive ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      {isPositive ? (
        <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowDown className="w-3 h-3" />
      )}
      {displayValue}%
    </span>
  )
}

export function ScenarioComparison() {
  const {
    scenarios,
    comparisonResults,
    activeScenarioId,
    removeScenario,
    setActiveScenario,
    runComparison,
  } = useSimulation()

  if (scenarios.length === 0 && !comparisonResults) {
    return null
  }

  return (
    <div className="bg-white border-t border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        What-If Scenarios
      </h3>

      {/* Scenario List */}
      {scenarios.length > 0 && (
        <div className="space-y-2 mb-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                activeScenarioId === scenario.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div>
                <h4 className="text-sm font-medium text-slate-900">
                  {scenario.name}
                </h4>
                <p className="text-xs text-slate-600">
                  {scenario.steps.length} steps
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveScenario(scenario.id)
                    runComparison(scenario.id)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Compare
                </button>
                <button
                  onClick={() => removeScenario(scenario.id)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResults && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Metric
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">
                  Baseline
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">
                  Scenario
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-2 text-slate-900">Avg Lead Time</td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {formatDuration(comparisonResults.baseline.avgLeadTime)}
                </td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {formatDuration(comparisonResults.scenario.avgLeadTime)}
                </td>
                <td className="px-4 py-2 text-right">
                  <ImprovementBadge
                    value={comparisonResults.improvements.leadTime}
                    higherIsBetter={true}
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-slate-900">Throughput</td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {comparisonResults.baseline.throughput.toFixed(2)}/min
                </td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {comparisonResults.scenario.throughput.toFixed(2)}/min
                </td>
                <td className="px-4 py-2 text-right">
                  <ImprovementBadge
                    value={comparisonResults.improvements.throughput}
                    higherIsBetter={true}
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-slate-900">Bottlenecks</td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {comparisonResults.baseline.bottlenecks.length}
                </td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {comparisonResults.scenario.bottlenecks.length}
                </td>
                <td className="px-4 py-2 text-right">
                  {comparisonResults.scenario.bottlenecks.length <
                  comparisonResults.baseline.bottlenecks.length ? (
                    <span className="text-emerald-600 font-medium">Improved</span>
                  ) : comparisonResults.scenario.bottlenecks.length >
                    comparisonResults.baseline.bottlenecks.length ? (
                    <span className="text-red-600 font-medium">Worse</span>
                  ) : (
                    <span className="text-slate-500">Same</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
