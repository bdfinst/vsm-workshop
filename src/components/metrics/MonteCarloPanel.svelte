<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { runMonteCarlo } from '../../utils/simulation/monteCarlo.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  let steps = $derived(vsmDataStore.steps)

  let variability = $state(0.25)
  let trials = $state(1000)
  let result = $state(null)

  function run() {
    result = runMonteCarlo(steps, { trials, variability, seed: 1 })
  }

  // Re-run is explicit (button), so results don't churn while editing the map.
  const percentiles = $derived(
    result
      ? [
          { label: 'P50 (typical)', value: result.p50 },
          { label: 'P85 (likely worst)', value: result.p85 },
          { label: 'P95 (rare worst)', value: result.p95 },
          { label: 'Mean', value: result.mean },
        ]
      : []
  )
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="monte-carlo-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Monte-Carlo Lead Time
  </summary>

  {#if steps.length === 0}
    <p class="mt-3 text-sm text-gray-500">Add steps to simulate lead-time variability.</p>
  {:else}
    <div class="mt-3 flex flex-wrap items-end gap-3">
      <label class="text-xs font-medium text-gray-700">
        Variability: {Math.round(variability * 100)}%
        <input
          type="range"
          min="0"
          max="0.6"
          step="0.05"
          bind:value={variability}
          class="mt-1 block w-40"
          data-testid="variability-input"
        />
      </label>
      <label class="text-xs font-medium text-gray-700">
        Trials
        <input
          type="number"
          min="10"
          step="100"
          bind:value={trials}
          class="ml-1 w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
          data-testid="trials-input"
        />
      </label>
      <button
        type="button"
        onclick={run}
        class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        data-testid="run-monte-carlo-button"
      >
        Run
      </button>
    </div>

    {#if result}
      <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="monte-carlo-results">
        {#each percentiles as p (p.label)}
          <div class="rounded-md border border-gray-200 p-2 text-center">
            <div class="text-[10px] uppercase tracking-wide text-gray-500">{p.label}</div>
            <div class="text-sm font-bold text-gray-800">{formatDuration(p.value)}</div>
          </div>
        {/each}
      </div>
      <p class="mt-2 text-[11px] text-gray-400">
        {trials} trials. The spread between P50 and P95 is the risk variability adds to your lead time.
      </p>
    {/if}
  {/if}
</details>
