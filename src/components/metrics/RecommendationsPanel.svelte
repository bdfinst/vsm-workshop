<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import { generateRecommendations } from '../../utils/calculations/recommendations.js'

  let steps = $derived(vsmDataStore.steps)
  let readiness = $derived(vsmDataStore.cdReadiness)
  let bottleneckIds = $derived(vsmDataStore.metrics.bottleneckIds)
  let recommendations = $derived(generateRecommendations(readiness, bottleneckIds))

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-gray-100 text-gray-700',
  }

  function stepName(id) {
    return steps.find((s) => s.id === id)?.name
  }
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="recommendations-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">
    Recommendations
    {#if recommendations.length > 0}
      <span class="ml-2 text-xs font-normal text-gray-500" data-testid="recommendations-summary">
        {recommendations.length} to act on
      </span>
    {/if}
  </summary>

  {#if recommendations.length === 0}
    <p class="mt-3 text-sm text-gray-500">
      No constraints detected — add steps or resolve readiness gaps to see recommendations.
    </p>
  {:else}
    <ul class="mt-3 space-y-2">
      {#each recommendations as rec (rec.id)}
        <li
          class="rounded-md border border-gray-200 p-3"
          data-testid="recommendation-{rec.id}"
          data-priority={rec.priority}
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-gray-800">{rec.title}</span>
            <span
              class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase {priorityColors[rec.priority]}"
            >
              {rec.priority === 'high' ? 'constraint' : rec.priority}
            </span>
          </div>
          <p class="mt-1 text-xs text-gray-600">{rec.finding}</p>
          <p class="mt-1 text-xs font-medium text-gray-800">→ {rec.countermeasure}</p>
          {#if rec.targetStepId && stepName(rec.targetStepId)}
            <p class="mt-1 text-xs text-gray-500">Step: {stepName(rec.targetStepId)}</p>
          {/if}
          <a
            href={rec.link}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-block text-xs underline text-blue-600 hover:text-blue-800"
          >
            Learn more
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</details>
