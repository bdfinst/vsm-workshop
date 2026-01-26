import PropTypes from 'prop-types'
import { useVsmStore, selectMetrics } from '../../stores/vsmStore'
import { formatDuration } from '../../utils/calculations/metrics'

function MetricCard({ title, value, subtitle, status, tooltip }) {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-800',
  }

  return (
    <div
      className={`rounded-lg border p-4 ${statusColors[status] || statusColors.neutral}`}
      title={tooltip}
      data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-status={status}
    >
      <h3 className="text-xs font-medium uppercase tracking-wider opacity-75">
        {title}
      </h3>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
    </div>
  )
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  status: PropTypes.oneOf(['good', 'warning', 'critical', 'neutral']),
  tooltip: PropTypes.string,
}

MetricCard.defaultProps = {
  subtitle: null,
  status: 'neutral',
  tooltip: null,
}

function MetricsDashboard() {
  const steps = useVsmStore((state) => state.steps)
  const connections = useVsmStore((state) => state.connections)
  const metrics = useVsmStore(selectMetrics)

  const hasRework = connections.some((c) => c.type === 'rework')

  if (steps.length === 0) {
    return (
      <div
        className="bg-white border-t border-gray-200 px-6 py-4"
        data-testid="metrics-dashboard"
      >
        <p className="text-gray-500 text-sm">
          Add steps to your value stream to see metrics
        </p>
      </div>
    )
  }

  return (
    <div
      className="bg-white border-t border-gray-200 px-6 py-4"
      data-testid="metrics-dashboard"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        <MetricCard
          title="Total Lead Time"
          value={formatDuration(metrics.totalLeadTime)}
          subtitle="End-to-end time"
          status="neutral"
          tooltip="Total time from start to finish including all wait times"
        />

        <MetricCard
          title="Total Process Time"
          value={formatDuration(metrics.totalProcessTime)}
          subtitle="Actual work time"
          status="neutral"
          tooltip="Total hands-on work time across all steps"
        />

        <MetricCard
          title="Flow Efficiency"
          value={metrics.flowEfficiency.displayValue}
          subtitle={
            metrics.flowEfficiency.status === 'good'
              ? 'Good!'
              : metrics.flowEfficiency.status === 'warning'
                ? 'Room to improve'
                : metrics.flowEfficiency.percentage > 0
                  ? 'Needs attention'
                  : null
          }
          status={metrics.flowEfficiency.status}
          tooltip="Process Time ÷ Lead Time - higher is better (>25% is good)"
        />

        <MetricCard
          title="First Pass Yield"
          value={metrics.firstPassYield.displayValue}
          subtitle="Items without rework"
          status={metrics.firstPassYield.status}
          tooltip="Probability an item passes through without any rework"
        />

        <MetricCard
          title="Total Queue"
          value={String(metrics.totalQueueSize)}
          subtitle="Items waiting"
          status={metrics.totalQueueSize > 10 ? 'warning' : 'neutral'}
          tooltip="Total number of items waiting across all steps"
        />

        <MetricCard
          title="Avg Process Time"
          value={metrics.activityRatio.displayValue}
          subtitle="Per step"
          status="neutral"
          tooltip="Average process time per step - indicates work density"
        />

        {hasRework && (
          <MetricCard
            title="Effective Lead Time"
            value={metrics.reworkImpact.displayValue}
            subtitle={`${metrics.reworkImpact.reworkMultiplier}x multiplier`}
            status={metrics.reworkImpact.status}
            tooltip="Lead time accounting for rework loops"
          />
        )}

        <MetricCard
          title="Steps"
          value={String(metrics.stepCount)}
          subtitle="Process stages"
          status="neutral"
          tooltip="Number of steps in your value stream"
        />
      </div>
    </div>
  )
}

export default MetricsDashboard
