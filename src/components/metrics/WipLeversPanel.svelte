<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import {
    wipFromLittlesLaw,
    projectBatchSizeChange,
  } from '../../utils/calculations/littlesLaw.js'
  import { calculateTotalLeadTime, formatDuration } from '../../utils/calculations/metrics.js'

  let steps = $derived(vsmDataStore.steps)
  let throughputPerDay = $state(1)

  let totalLeadTime = $derived(calculateTotalLeadTime(steps))
  let totalWip = $derived(wipFromLittlesLaw(throughputPerDay, totalLeadTime))

  // Project halving each step's batch size.
  function halved(step) {
    return projectBatchSizeChange(step, Math.max(1, Math.ceil((step.batchSize || 1) / 2)))
  }
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="wip-levers-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">WIP &amp; Batch Levers</summary>

  {#if steps.length === 0}
    <p class="mt-3 text-sm text-gray-500">Add steps to explore WIP and batch-size levers.</p>
  {:else}
    <div class="mt-3 flex items-center gap-3">
      <label class="text-xs font-medium text-gray-700">
        Throughput (items/day)
        <input
          type="number"
          min="0"
          step="0.1"
          bind:value={throughputPerDay}
          class="ml-1 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
          data-testid="throughput-input"
        />
      </label>
      <span class="text-xs text-gray-600" data-testid="total-wip">
        Little's Law WIP: <strong>{totalWip}</strong> items in progress
      </span>
    </div>

    <table class="mt-3 w-full text-xs">
      <thead class="text-left text-gray-500">
        <tr>
          <th class="py-1">Step</th>
          <th class="py-1">Batch</th>
          <th class="py-1">WIP</th>
          <th class="py-1">Lead time</th>
          <th class="py-1">Halve batch →</th>
        </tr>
      </thead>
      <tbody>
        {#each steps as step (step.id)}
          <tr class="border-t border-gray-100" data-testid="lever-row-{step.id}">
            <td class="py-1 font-medium">{step.name}</td>
            <td class="py-1">{step.batchSize ?? 1}</td>
            <td class="py-1">{wipFromLittlesLaw(throughputPerDay, step.leadTime)}</td>
            <td class="py-1">{formatDuration(step.leadTime)}</td>
            <td class="py-1 {halved(step).deltaMinutes < 0 ? 'text-green-700' : 'text-gray-600'}">
              {formatDuration(halved(step).projectedLeadTime)}
              ({halved(step).deltaPercent}%)
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="mt-2 text-[11px] text-gray-400">
      WIP = throughput × lead time (Little's Law). Batch projection assumes wait time scales with batch size.
    </p>
  {/if}
</details>
