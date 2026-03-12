<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'
  import { QUEUE_WARNING_THRESHOLD } from '../../data/thresholds.js'

  // Reactive derived values from store
  let steps = $derived(vsmDataStore.steps)
  let connections = $derived(vsmDataStore.connections)
  let metrics = $derived(vsmDataStore.metrics)
  let hasRework = $derived(connections.some((c) => c.type === 'rework'))

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-800',
  }
</script>

{#snippet metricCard(title, value, subtitle, status, tooltip)}
  <div
    class="rounded-lg border p-4 {statusColors[status] || statusColors.neutral}"
    aria-label={tooltip}
    data-testid="metric-{title.toLowerCase().replace(/\s+/g, '-')}"
    data-status={status}
  >
    <h3 class="text-xs font-medium uppercase tracking-wider opacity-75">
      {title}
    </h3>
    <div class="mt-1 text-2xl font-bold">{value}</div>
    {#if subtitle}
      <p class="text-xs mt-1 opacity-75">{subtitle}</p>
    {/if}
  </div>
{/snippet}

{#if steps.length === 0}
  <div
    class="bg-white border-t border-gray-200 px-6 py-4"
    data-testid="metrics-dashboard"
  >
    <p class="text-gray-500 text-sm">
      Add steps to your value stream to see metrics
    </p>
  </div>
{:else}
  <div
    class="bg-white border-t border-gray-200 px-6 py-4"
    data-testid="metrics-dashboard"
  >
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {@render metricCard(
        'Total Lead Time',
        formatDuration(metrics.totalLeadTime),
        'End-to-end time',
        'neutral',
        'Total time from start to finish including all wait times'
      )}

      {@render metricCard(
        'Total Process Time',
        formatDuration(metrics.totalProcessTime),
        'Actual work time',
        'neutral',
        'Total hands-on work time across all steps'
      )}

      {@render metricCard(
        'Flow Efficiency',
        metrics.flowEfficiency.displayValue,
        metrics.flowEfficiency.status === 'good'
          ? 'Good!'
          : metrics.flowEfficiency.status === 'warning'
            ? 'Room to improve'
            : metrics.flowEfficiency.percentage > 0
              ? 'Needs attention'
              : null,
        metrics.flowEfficiency.status,
        'Process Time ÷ Lead Time - higher is better (>25% is good)'
      )}

      {@render metricCard(
        'First Pass Yield',
        metrics.firstPassYield.displayValue,
        'Items without rework',
        metrics.firstPassYield.status,
        'Probability an item passes through without any rework'
      )}

      {@render metricCard(
        'Total Queue',
        String(metrics.totalQueueSize),
        'Items waiting',
        metrics.totalQueueSize > QUEUE_WARNING_THRESHOLD ? 'warning' : 'neutral',
        'Total number of items waiting across all steps'
      )}

      {@render metricCard(
        'Avg Process Time',
        metrics.activityRatio.displayValue,
        'Per step',
        'neutral',
        'Average process time per step - indicates work density'
      )}

      {#if hasRework}
        {@render metricCard(
          'Effective Lead Time',
          metrics.reworkImpact.displayValue,
          `${metrics.reworkImpact.reworkMultiplier}x multiplier`,
          metrics.reworkImpact.status,
          'Lead time accounting for rework loops'
        )}
      {/if}

      {@render metricCard(
        'Steps',
        String(metrics.stepCount),
        'Process stages',
        'neutral',
        'Number of steps in your value stream'
      )}
    </div>
  </div>
{/if}
