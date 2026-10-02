<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { selectCanvasTotals } from '../../utils/ui/canvasTotals.js'

  let totals = $derived(selectCanvasTotals(vsmDataStore.metrics))

  const statusText = {
    good: 'text-green-700',
    warning: 'text-amber-700',
    critical: 'text-red-700',
    neutral: 'text-gray-800',
  }
</script>

<!-- Always-visible headline totals, overlaid on the diagram so they stay in
     view while zooming/panning on phones and tablets. -->
<div
  class="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-2 pt-2"
  data-testid="canvas-totals-bar"
>
  <div
    class="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur"
  >
    {#each totals as total (total.label)}
      <div class="flex flex-none flex-col items-center px-2 leading-tight" data-testid="canvas-total-{total.label.toLowerCase().replace(/[^a-z]+/g, '-')}">
        <span class="text-[10px] uppercase tracking-wide text-gray-400">{total.label}</span>
        <span class="text-sm font-bold {statusText[total.status] || 'text-gray-800'}">{total.value}</span>
      </div>
    {/each}
  </div>
</div>
