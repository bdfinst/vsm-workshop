<script>
  // StageRail props: statuses (from stageStatus), current (stage number), onselect(stageNumber).
  let { statuses, current, onselect } = $props()

  const base =
    'w-full text-left px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500'

  function classFor(status, isCurrent) {
    if (isCurrent) return `${base} bg-blue-600 text-white border-blue-600`
    if (status.state === 'not-selectable') {
      return `${base} bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed`
    }
    return `${base} bg-white text-gray-800 border-gray-300 hover:bg-gray-50`
  }

  // Not-selectable stages stay focusable so a keyboard user can find them.
  function handleSelect(status) {
    if (status.state !== 'not-selectable') onselect(status.number)
  }
</script>

<nav class="lg:w-48" aria-label="Stages" data-testid="stage-rail">
  <ol class="flex flex-wrap lg:flex-col gap-2">
    {#each statuses as status (status.number)}
      {@const isCurrent = status.number === current}
      <li>
        <button
          type="button"
          class={classFor(status, isCurrent)}
          aria-current={isCurrent ? 'step' : undefined}
          aria-disabled={status.state === 'not-selectable' ? 'true' : undefined}
          data-testid="stage-{status.name.toLowerCase()}"
          data-state={status.state}
          onclick={() => handleSelect(status)}
        >
          {#if status.state === 'complete'}
            <span aria-hidden="true">&#10003;</span>
            {status.name}<span class="sr-only">, complete</span>
          {:else if status.state === 'needs-attention' && !isCurrent}
            <span aria-hidden="true">&#9888;</span>
            {status.name}
            <span class="block text-xs text-amber-700">
              Needs attention: {status.reason}
            </span>
          {:else}
            {status.name}
          {/if}
        </button>
      </li>
    {/each}
  </ol>
</nav>
