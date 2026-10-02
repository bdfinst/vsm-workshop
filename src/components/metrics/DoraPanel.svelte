<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'
  import {
    reconcileLeadTime,
    classifyDora,
  } from '../../utils/calculations/doraReconciliation.js'
  import { formatDuration } from '../../utils/calculations/metrics.js'

  let steps = $derived(vsmDataStore.steps)
  let dora = $derived(vsmDataStore.dora)
  let reconciliation = $derived(reconcileLeadTime(steps, dora))
  let tiers = $derived(classifyDora(dora))

  const tierColors = {
    elite: 'bg-green-100 text-green-800',
    high: 'bg-blue-100 text-blue-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-600',
  }

  const reconColors = {
    'hidden-queue': 'text-red-700',
    'optimistic-map': 'text-amber-700',
    aligned: 'text-green-700',
    unknown: 'text-gray-600',
  }

  // Number input that writes null when blank.
  function onInput(field, raw) {
    const value = raw === '' ? null : Number(raw)
    vsmDataStore.setDora({ [field]: value })
  }

  const fields = [
    { key: 'deploymentFrequencyPerDay', label: 'Deploy freq (per day)', tier: 'deploymentFrequency' },
    { key: 'leadTimeForChangesMinutes', label: 'Lead time for changes (min)', tier: 'leadTimeForChanges' },
    { key: 'changeFailureRatePct', label: 'Change failure rate (%)', tier: 'changeFailureRate' },
    { key: 'mttrMinutes', label: 'MTTR (min)', tier: 'mttr' },
  ]
</script>

<details class="bg-white border-t border-gray-200 px-6 py-4" data-testid="dora-panel" open>
  <summary class="cursor-pointer text-sm font-semibold text-gray-800">DORA Reconciliation</summary>

  <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
    {#each fields as f (f.key)}
      <label class="block text-xs font-medium text-gray-700">
        {f.label}
        <input
          type="number"
          min="0"
          value={dora[f.key] ?? ''}
          oninput={(e) => onInput(f.key, e.target.value)}
          class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="dora-input-{f.key}"
        />
        <span
          class="mt-1 inline-block rounded px-1 text-[10px] font-semibold uppercase {tierColors[tiers[f.tier]]}"
          data-testid="dora-tier-{f.tier}"
        >
          {tiers[f.tier]}
        </span>
      </label>
    {/each}
  </div>

  <div class="mt-3 rounded-md bg-gray-50 p-3 text-xs" data-testid="dora-reconciliation" data-status={reconciliation.status}>
    {#if reconciliation.status === 'unknown'}
      <p class="text-gray-600">Enter the actual lead time for changes to reconcile it against the map.</p>
    {:else}
      <p>
        VSM-derived lead time: <strong>{formatDuration(reconciliation.vsmLeadTime)}</strong>
        · Actual: <strong>{formatDuration(reconciliation.actualLeadTime)}</strong>
      </p>
      <p class="mt-1 {reconColors[reconciliation.status]}">
        {#if reconciliation.status === 'hidden-queue'}
          Hidden queue of <strong>{formatDuration(reconciliation.hiddenQueue)}</strong> the map does not yet show.
        {:else if reconciliation.status === 'optimistic-map'}
          The map shows more lead time than reality — check the step estimates.
        {:else}
          Map and actual lead time are aligned.
        {/if}
      </p>
    {/if}
  </div>
</details>
