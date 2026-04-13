<script>
  /**
   * SimulationResults - Display simulation metrics and insights
   *
   * Shows comprehensive results after simulation completes:
   * - Key metrics (cycle time, throughput, flow efficiency)
   * - Bottleneck identification with visual indicators
   * - Queue size distribution charts
   * - Improvement recommendations
   */
  import { AlertTriangle, Clock, TrendingUp, CheckCircle } from 'lucide-svelte'
  import { simDataStore } from '../../stores/simulationDataStore.svelte.js'
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'
  import { calculateQueueBarWidth } from '../../utils/calculations/queueBarWidth.js'

  let results = $derived(simDataStore.results)
  let queueSizesByStepId = $derived(simDataStore.queueSizesByStepId)
  let steps = $derived(vsmDataStore.steps)

  // Prepare chart data for queue sizes
  let queueChartData = $derived(
    steps.map((step) => ({
      name: step.name.length > 10 ? step.name.slice(0, 10) + '...' : step.name,
      fullName: step.name,
      peakQueue:
        results?.bottlenecks.find((b) => b.stepId === step.id)?.peakQueueSize || 0,
      currentQueue: queueSizesByStepId[step.id] || 0,
    }))
  )
</script>

{#if results}
  <div
    class="bg-white border-t border-slate-200 p-4"
    data-testid="simulation-results"
    aria-live="polite"
    role="status"
  >
    <h3 class="text-sm font-semibold text-slate-900 mb-3">
      Simulation Results
    </h3>

    <div class="grid grid-cols-4 gap-4 mb-4">
      <!-- Completed Items -->
      <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
        <div class="flex items-center gap-2 mb-1">
          <CheckCircle class="w-4 h-4 text-emerald-600" />
          <span class="text-xs font-medium text-emerald-800">Completed</span>
        </div>
        <p class="text-lg font-bold text-emerald-900">
          {results.completedCount} items
        </p>
      </div>

      <!-- Average Lead Time -->
      <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div class="flex items-center gap-2 mb-1">
          <Clock class="w-4 h-4 text-blue-600" />
          <span class="text-xs font-medium text-blue-800">Avg Lead Time</span>
        </div>
        <p class="text-lg font-bold text-blue-900">
          {formatDuration(results.avgLeadTime)}
        </p>
      </div>

      <!-- Throughput -->
      <div class="bg-purple-50 rounded-lg p-3 border border-purple-200">
        <div class="flex items-center gap-2 mb-1">
          <TrendingUp class="w-4 h-4 text-purple-600" />
          <span class="text-xs font-medium text-purple-800">Throughput</span>
        </div>
        <p class="text-lg font-bold text-purple-900">
          {results.throughput.toFixed(2)}/min
        </p>
      </div>

      <!-- Bottlenecks -->
      <div
        class="rounded-lg p-3 border {results.bottlenecks.length > 0
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <AlertTriangle
            class="w-4 h-4 {results.bottlenecks.length > 0 ? 'text-red-600' : 'text-slate-600'}"
          />
          <span
            class="text-xs font-medium {results.bottlenecks.length > 0 ? 'text-red-800' : 'text-slate-800'}"
          >
            Bottlenecks
          </span>
        </div>
        <p
          class="text-lg font-bold {results.bottlenecks.length > 0 ? 'text-red-900' : 'text-slate-900'}"
        >
          {results.bottlenecks.length > 0
            ? `${results.bottlenecks.length} detected`
            : 'None'}
        </p>
      </div>
    </div>

    <!-- Simple Queue Bar Chart (without recharts/layerchart for now) -->
    {#if queueChartData.length > 0}
      <div class="mt-4">
        <h4 class="text-xs font-medium text-slate-700 mb-2">
          Peak Queue Sizes by Step
        </h4>
        <div class="space-y-2">
          {#each queueChartData as item (item.fullName)}
            <div class="flex items-center gap-2">
              <span class="w-24 text-xs text-slate-600 truncate" title={item.fullName}>
                {item.name}
              </span>
              <div
                class="flex-1 h-4 bg-slate-100 rounded overflow-hidden"
                role="progressbar"
                aria-label="Peak queue for {item.fullName}"
                aria-valuenow={item.peakQueue}
                aria-valuemin={0}
                aria-valuemax={Math.max(...queueChartData.map((d) => d.peakQueue), 1)}
              >
                <div
                  class="h-full bg-red-400 transition-all"
                  style="width: {calculateQueueBarWidth(item.peakQueue, queueChartData)}%"
                ></div>
              </div>
              <span class="w-8 text-xs text-slate-600 text-right">{item.peakQueue}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Bottleneck Details -->
    {#if results.bottlenecks.length > 0}
      <div class="mt-4">
        <h4 class="text-xs font-medium text-slate-700 mb-2">
          Bottleneck Details
        </h4>
        <div class="space-y-1">
          {#each results.bottlenecks as bottleneck (bottleneck.stepId)}
            <div
              class="flex items-center justify-between bg-red-50 rounded px-3 py-2 text-sm"
            >
              <span class="font-medium text-red-900">
                {bottleneck.stepName}
              </span>
              <span class="text-red-700">
                Peak queue: {bottleneck.peakQueueSize}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
