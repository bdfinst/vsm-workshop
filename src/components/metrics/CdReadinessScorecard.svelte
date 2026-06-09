<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import {
    groupReadinessItems,
    summarizeReadiness,
    readinessStatusText,
  } from '../../utils/ui/readinessScorecard.js'

  let steps = $derived(vsmDataStore.steps)
  let items = $derived(vsmDataStore.cdReadiness)
  let grouped = $derived(groupReadinessItems(items))
  let summary = $derived(summarizeReadiness(items))

  // Status colors are keyed on this scorecard's own domain (met/gap/needs-review),
  // distinct from the metrics dashboard's good/warning/critical domain.
  const statusColors = {
    met: 'bg-green-50 border-green-200 text-green-800',
    gap: 'bg-red-50 border-red-200 text-red-800',
    'needs-review': 'bg-gray-50 border-gray-200 text-gray-700',
  }
  const statusIcons = { met: '✓', gap: '!', 'needs-review': '?' }

  function stepName(stepId) {
    return steps.find((s) => s.id === stepId)?.name
  }

  // Contextual control visibility, so an untouched row carries at most the relevant action.
  const canConfirm = (item) => item.source === 'inferred' && item.status === 'gap'
  const canOverride = (item) =>
    item.source === 'inferred' && (item.status === 'gap' || item.status === 'needs-review')
  const canReset = (item) => item.source === 'confirmed' || item.source === 'overridden'

  const btn =
    'rounded border px-2 py-0.5 text-xs font-medium hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500'
</script>

{#snippet itemRow(item)}
  <li
    class="flex items-start gap-3 rounded-md border p-3 {statusColors[item.status]}"
    data-testid="cd-readiness-item-{item.id}"
    data-status={item.status}
  >
    <span
      class="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs font-bold"
      aria-hidden="true"
    >
      {statusIcons[item.status]}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium">{item.label}</span>
        <span
          class="text-xs font-semibold uppercase tracking-wide"
          data-testid="cd-readiness-status"
          aria-label="status: {readinessStatusText(item.status)}"
        >
          {readinessStatusText(item.status)}
        </span>
      </div>
      <p class="mt-0.5 text-xs opacity-80">{item.explanation}</p>
      {#if item.stepId && stepName(item.stepId)}
        <p class="mt-0.5 text-xs opacity-70">Step: {stepName(item.stepId)}</p>
      {/if}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        class="mt-0.5 inline-block text-xs underline opacity-70 hover:opacity-100"
      >
        Learn more
      </a>
      <div class="mt-2 flex flex-wrap gap-2">
        {#if canConfirm(item)}
          <button
            type="button"
            class={btn}
            aria-label="Confirm gap for {item.label}"
            data-testid="cd-readiness-confirm-{item.id}"
            onclick={() => vsmDataStore.confirmReadiness(item.id)}
          >
            Yes, this is a gap
          </button>
        {/if}
        {#if canOverride(item)}
          <button
            type="button"
            class={btn}
            aria-label="Mark {item.label} as met"
            data-testid="cd-readiness-override-{item.id}"
            onclick={() => vsmDataStore.setReadinessOverride(item.id, 'met')}
          >
            Mark as met anyway
          </button>
        {/if}
        {#if canReset(item)}
          <button
            type="button"
            class={btn}
            aria-label="Reset {item.label} to the inferred status"
            data-testid="cd-readiness-reset-{item.id}"
            onclick={() => vsmDataStore.resetReadiness(item.id)}
          >
            Reset
          </button>
        {/if}
      </div>
    </div>
  </li>
{/snippet}

<details
  class="bg-white border-t border-gray-200 px-6 py-4"
  data-testid="cd-readiness-scorecard"
  open
>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    CD Readiness Scorecard
    {#if steps.length > 0}
      <span class="ml-2 text-xs font-normal text-gray-500" data-testid="cd-readiness-summary">
        {summary.met} met · {summary.gap} gaps · {summary.needsReview} needs review
      </span>
    {/if}
  </summary>

  {#if steps.length === 0}
    <p class="mt-3 text-sm text-gray-500">
      Add steps to your value stream to assess CD readiness.
    </p>
  {:else}
    <div class="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          MinimumCD Core Practices
        </h3>
        <ul class="space-y-2">
          {#each grouped.practices as item (item.id)}
            {@render itemRow(item)}
          {/each}
        </ul>
      </section>
      <section>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Flow Readiness Signals
        </h3>
        <ul class="space-y-2">
          {#each grouped.signals as item (item.id)}
            {@render itemRow(item)}
          {/each}
        </ul>
      </section>
    </div>
  {/if}
</details>
