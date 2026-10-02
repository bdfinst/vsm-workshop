<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { compareStates } from '../../utils/calculations/futureState.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  let steps = $derived(vsmDataStore.steps)
  let connections = $derived(vsmDataStore.connections)
  let baseline = $derived(vsmDataStore.baseline)

  let comparison = $derived(
    compareStates(baseline?.steps ?? null, baseline?.connections ?? [], steps, connections)
  )

  const rows = [
    { key: 'totalLeadTime', label: 'Total lead time', fmt: formatDuration },
    { key: 'totalProcessTime', label: 'Total process time', fmt: formatDuration },
    { key: 'flowEfficiency', label: 'Flow efficiency', fmt: (v) => `${v.toFixed(1)}%` },
    { key: 'firstPassYield', label: 'First pass yield', fmt: (v) => `${v.toFixed(1)}%` },
  ]
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="future-state-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Current vs Future State
  </summary>

  <div class="mt-3 flex gap-2">
    <button
      type="button"
      onclick={() => vsmDataStore.captureBaseline()}
      class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
      data-testid="capture-baseline-button"
      disabled={steps.length === 0}
    >
      {baseline ? 'Re-capture baseline' : 'Capture current as baseline'}
    </button>
    {#if baseline}
      <button
        type="button"
        onclick={() => vsmDataStore.clearBaseline()}
        class="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        data-testid="clear-baseline-button"
      >
        Clear
      </button>
    {/if}
  </div>

  {#if !comparison}
    <p class="mt-3 text-sm text-gray-500">
      Capture the current state as a baseline, then improve the map to see the projected deltas.
    </p>
  {:else}
    <table class="mt-3 w-full text-xs" data-testid="state-comparison">
      <thead class="text-left text-gray-500">
        <tr>
          <th class="py-1">Metric</th>
          <th class="py-1">Baseline</th>
          <th class="py-1">Working</th>
          <th class="py-1">Delta</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.key)}
          {@const d = comparison.deltas[row.key]}
          <tr class="border-t border-gray-100" data-testid="comparison-row-{row.key}" data-improved={d.improved}>
            <td class="py-1 font-medium">{row.label}</td>
            <td class="py-1">{row.fmt(d.baseline)}</td>
            <td class="py-1">{row.fmt(d.working)}</td>
            <td class="py-1 {d.improved ? 'text-green-700' : d.delta === 0 ? 'text-gray-500' : 'text-red-700'}">
              {d.delta > 0 ? '+' : ''}{row.fmt(d.delta)}
              {#if d.improved}<span class="ml-1">↓ improved</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</details>
