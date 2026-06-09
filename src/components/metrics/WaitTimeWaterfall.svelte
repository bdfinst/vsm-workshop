<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { calculateWaitTimeBreakdown } from '../../utils/calculations/waitTime.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  let steps = $derived(vsmDataStore.steps)
  let breakdown = $derived(calculateWaitTimeBreakdown(steps))

  function pct(value, total) {
    return total > 0 ? (value / total) * 100 : 0
  }
</script>

<details
  class="bg-white border-t border-gray-200 px-6 py-4"
  data-testid="wait-time-waterfall"
  open
>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Wait-Time Waterfall
    {#if steps.length > 0}
      <span class="ml-2 text-xs font-normal text-gray-500" data-testid="wait-time-summary">
        {breakdown.totals.waitPercentage}% of lead time is waiting
      </span>
    {/if}
  </summary>

  {#if steps.length === 0}
    <p class="mt-3 text-sm text-gray-500">
      Add steps to your value stream to see where time is spent waiting.
    </p>
  {:else}
    <ul class="mt-3 space-y-2">
      {#each breakdown.steps as row (row.stepId)}
        <li data-testid="wait-row-{row.stepId}" data-wait-dominated={row.waitDominated}>
          <div class="flex items-center justify-between text-xs text-gray-700">
            <span class="font-medium">
              {row.name}
              {#if row.manual}
                <span
                  class="ml-1 rounded bg-red-100 px-1 text-[10px] font-semibold text-red-700"
                  data-testid="handoff-badge-{row.stepId}"
                >
                  handoff
                </span>
              {/if}
              {#if row.waitDominated}
                <span
                  class="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700"
                  data-testid="hidden-queue-badge-{row.stepId}"
                >
                  hidden queue
                </span>
              {/if}
            </span>
            <span class="text-gray-500">{row.waitPercentage}% waiting</span>
          </div>
          <div class="mt-1 flex h-4 w-full overflow-hidden rounded bg-gray-100" aria-hidden="true">
            <div
              class="bg-green-500"
              style="width: {pct(row.processTime, row.leadTime)}%"
              title="Value-add: {formatDuration(row.processTime)}"
            ></div>
            <div
              class="bg-amber-400"
              style="width: {pct(row.waitTime, row.leadTime)}%"
              title="Waiting: {formatDuration(row.waitTime)}"
            ></div>
          </div>
        </li>
      {/each}
    </ul>
    <p class="mt-3 text-xs text-gray-500">
      <span class="inline-block h-2 w-2 rounded-sm bg-green-500"></span> value-add
      ({formatDuration(breakdown.totals.processTime)})
      <span class="ml-3 inline-block h-2 w-2 rounded-sm bg-amber-400"></span> waiting
      ({formatDuration(breakdown.totals.waitTime)})
    </p>
  {/if}
</details>
