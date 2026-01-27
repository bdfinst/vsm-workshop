/**
 * SimulationResults - Display simulation metrics and insights
 *
 * Shows comprehensive results after simulation completes:
 * - Key metrics (cycle time, throughput, flow efficiency)
 * - Bottleneck identification with visual indicators
 * - Queue size distribution charts
 * - Improvement recommendations
 *
 * Data source: useSimulation hook provides results after completion
 *
 * See: .claude/guides/architecture.md#simulation-engine-flow
 *
 * @component
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, Clock, TrendingUp, CheckCircle } from 'lucide-react'
import { useSimulation } from '../../hooks/useSimulation'
import { useVsmStore } from '../../stores/vsmStore'

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function SimulationResults() {
  const { results, queueSizesByStepId } = useSimulation()
  const steps = useVsmStore((state) => state.steps)

  // Prepare chart data for queue sizes
  const queueChartData = useMemo(() => {
    return steps.map((step) => ({
      name: step.name.length > 10 ? step.name.slice(0, 10) + '...' : step.name,
      fullName: step.name,
      peakQueue:
        results?.bottlenecks.find((b) => b.stepId === step.id)?.peakQueueSize || 0,
      currentQueue: queueSizesByStepId[step.id] || 0,
    }))
  }, [steps, results, queueSizesByStepId])

  if (!results) {
    return null
  }

  return (
    <div className="bg-white border-t border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Simulation Results
      </h3>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Completed Items */}
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800">Completed</span>
          </div>
          <p className="text-lg font-bold text-emerald-900">
            {results.completedCount} items
          </p>
        </div>

        {/* Average Lead Time */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Avg Lead Time</span>
          </div>
          <p className="text-lg font-bold text-blue-900">
            {formatDuration(results.avgLeadTime)}
          </p>
        </div>

        {/* Throughput */}
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-800">Throughput</span>
          </div>
          <p className="text-lg font-bold text-purple-900">
            {results.throughput.toFixed(2)}/min
          </p>
        </div>

        {/* Bottlenecks */}
        <div
          className={`rounded-lg p-3 border ${
            results.bottlenecks.length > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle
              className={`w-4 h-4 ${
                results.bottlenecks.length > 0 ? 'text-red-600' : 'text-slate-600'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                results.bottlenecks.length > 0 ? 'text-red-800' : 'text-slate-800'
              }`}
            >
              Bottlenecks
            </span>
          </div>
          <p
            className={`text-lg font-bold ${
              results.bottlenecks.length > 0 ? 'text-red-900' : 'text-slate-900'
            }`}
          >
            {results.bottlenecks.length > 0
              ? `${results.bottlenecks.length} detected`
              : 'None'}
          </p>
        </div>
      </div>

      {/* Queue Chart */}
      {queueChartData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-slate-700 mb-2">
            Peak Queue Sizes by Step
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [value, name === 'peakQueue' ? 'Peak Queue' : 'Current']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar dataKey="peakQueue" fill="#f87171" name="Peak Queue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottleneck Details */}
      {results.bottlenecks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-slate-700 mb-2">
            Bottleneck Details
          </h4>
          <div className="space-y-1">
            {results.bottlenecks.map((bottleneck) => (
              <div
                key={bottleneck.stepId}
                className="flex items-center justify-between bg-red-50 rounded px-3 py-2 text-sm"
              >
                <span className="font-medium text-red-900">
                  {bottleneck.stepName}
                </span>
                <span className="text-red-700">
                  Peak queue: {bottleneck.peakQueueSize}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
